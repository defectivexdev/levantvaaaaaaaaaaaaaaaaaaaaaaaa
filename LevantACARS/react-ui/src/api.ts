import type { BadgeDefinition, TourDefinition, TourProgress, LegReport } from './types';

const API_BASE = 'https://www.levant-va.com/api/acars';

export interface TrafficFlight {
  callsign: string;
  pilotName: string;
  departureIcao: string;
  arrivalIcao: string;
  aircraftType: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  ias: number;
  verticalSpeed: number;
  phase: string;
  fuel: number;
  gForce: number;
  comfortScore: number;
  startedAt: string;
  lastUpdate: string;
}

export interface RecentFlight {
  flightNumber: string;
  callsign: string;
  departureIcao: string;
  arrivalIcao: string;
  aircraftType: string;
  flightTime: number;
  landingRate: number;
  landingGrade: string;
  score: number;
  distance: number;
  submittedAt: string;
  status: string;
}

export interface PilotStats {
  pilot: {
    pilotId: string;
    name: string;
    rank: string;
    totalHours: number;
    xp: number;
    totalFlights: number;
    avatarUrl: string;
  };
  recentFlights: RecentFlight[];
  activeBid: {
    callsign: string;
    departureIcao: string;
    arrivalIcao: string;
    aircraftType: string;
    route: string;
  } | null;
}

// Normalize live-map response (different field names) into TrafficFlight
function normalizeFlight(f: any): TrafficFlight {
  return {
    callsign: f.callsign || '',
    pilotName: f.pilotName || f.pilot_name || f.pilot || '',
    departureIcao: f.departureIcao || f.departure_icao || f.departure || '',
    arrivalIcao: f.arrivalIcao || f.arrival_icao || f.arrival || '',
    aircraftType: f.aircraftType || f.aircraft_type || f.equipment || '',
    latitude: f.latitude || 0,
    longitude: f.longitude || 0,
    altitude: f.altitude || 0,
    heading: f.heading || 0,
    groundSpeed: f.groundSpeed || f.ground_speed || f.groundspeed || 0,
    ias: f.ias || 0,
    verticalSpeed: f.verticalSpeed || f.vertical_speed || 0,
    phase: f.phase || f.status || '',
    fuel: f.fuel || 0,
    gForce: f.gForce || f.g_force || 1.0,
    comfortScore: f.comfortScore || f.comfort_score || 100,
    startedAt: f.startedAt || f.started_at || '',
    lastUpdate: f.lastUpdate || f.last_update || '',
  };
}

export async function fetchTraffic(): Promise<TrafficFlight[]> {
  // Try the ?action=traffic endpoint first (returns { traffic: [...] })
  try {
    const res = await fetch(`${API_BASE}?action=traffic`);
    if (res.ok) {
      const data = await res.json();
      if (data.traffic && Array.isArray(data.traffic) && data.traffic.length > 0) {
        return data.traffic.map(normalizeFlight);
      }
    }
  } catch { /* fall through */ }

  // Fallback: use the live-map endpoint (returns flat array)
  try {
    const res = await fetch(`${API_BASE}/live-map`);
    if (!res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data.flights || data.traffic || []);
    return arr.map(normalizeFlight);
  } catch {
    return [];
  }
}

export interface FetchBidResult {
  callsign: string;
  flightNumber: string;
  departureIcao: string;
  arrivalIcao: string;
  departureName: string;
  arrivalName: string;
  aircraftType: string;
  aircraftRegistration: string;
  route: string;
  pax: number;
  cargo: number;
  createdAt: string;
  expiresAt: string;
}

export interface SimBriefFlightPlan {
  callsign: string;
  flightNumber: string;
  departureIcao: string;
  arrivalIcao: string;
  departureName: string;
  arrivalName: string;
  alternateIcao: string;
  alternateName: string;
  aircraftType: string;
  aircraftRegistration: string;
  route: string;
  pax: number;
  cargo: number;
  cruiseAltitude: number;
  flightTime: string;
  distance: number;
  fuel: number;
  originMetar: string;
  destMetar: string;
  altnMetar: string;
  createdAt: string;
  expiresAt: string;
}

// ── Bridge-based bid fetch (WebView2) ─────────────────────────────
let _pendingBidResolve: ((result: { bid: FetchBidResult | null; error?: string }) => void) | null = null;

if (window.chrome?.webview) {
  window.chrome.webview.addEventListener('message', (e: MessageEvent) => {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data.type === 'bidResult' && _pendingBidResolve) {
        const resolve = _pendingBidResolve;
        _pendingBidResolve = null;
        if (!data.success) {
          resolve({ bid: null, error: data.error || 'Bridge fetch failed' });
        } else if (!data.bid || !data.bid.callsign) {
          resolve({ bid: null });
        } else {
          const b = data.bid;
          resolve({
            bid: {
              callsign: b.callsign || '',
              flightNumber: b.flightNumber || b.callsign || '',
              departureIcao: b.departureIcao || '',
              arrivalIcao: b.arrivalIcao || '',
              departureName: b.departureName || '',
              arrivalName: b.arrivalName || '',
              aircraftType: b.aircraftType || '',
              aircraftRegistration: b.aircraftRegistration || '',
              route: b.route || '',
              pax: b.pax || 0,
              cargo: b.cargo || 0,
              createdAt: b.createdAt || '',
              expiresAt: b.expiresAt || '',
            },
          });
        }
      }
    } catch { /* ignore */ }
  });
}

export async function fetchSimBrief(pilotId: string): Promise<{ flightPlan: SimBriefFlightPlan | null; error?: string; simbriefId?: string | null }> {
  const controller = new AbortController();
  const timeoutMs = 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch('https://www.levant-va.com/api/acars/simbrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pilotId }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({} as any));
      const msg = err?.error || `Server error (${res.status})`;
      return { flightPlan: null, error: msg, simbriefId: err?.simbriefId };
    }
    
    const data = await res.json();
    if (!data.flightPlan) {
      return { flightPlan: null, error: 'No flight plan found', simbriefId: data.simbriefId };
    }
    
    return { flightPlan: data.flightPlan, simbriefId: data.simbriefId };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { flightPlan: null, error: 'Request timed out' };
    }
    return { flightPlan: null, error: 'Failed to fetch SimBrief flight plan' };
  }
}

export async function fetchActiveBid(pilotId: string): Promise<{ bid: FetchBidResult | null; error?: string }> {
  // In WebView2, use the C# bridge to avoid CORS — wait for bidResult response
  if (window.chrome?.webview) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        _pendingBidResolve = null;
        resolve({ bid: null, error: 'Request timed out' });
      }, 10000);

      _pendingBidResolve = (result) => {
        clearTimeout(timer);
        resolve(result);
      };

      window.chrome!.webview!.postMessage(JSON.stringify({ action: 'fetchBid' }));
    });
  }

  // Browser dev mode: direct fetch
  const controller = new AbortController();
  const timeoutMs = 8000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bid', pilotId }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({} as any));
      const msg = (err && typeof err === 'object' && 'error' in err) ? (err as any).error : '';
      return { bid: null, error: msg || `Server error (${res.status})` };
    }
    const data = await res.json();
    if (!data.bid || !data.bid.callsign) {
      return { bid: null };
    }
    const b = data.bid;
    return {
      bid: {
        callsign: b.callsign || '',
        flightNumber: b.flight_number || b.callsign || '',
        departureIcao: b.departure_icao || '',
        arrivalIcao: b.arrival_icao || '',
        departureName: b.departure_name || '',
        arrivalName: b.arrival_name || '',
        aircraftType: b.aircraft_type || '',
        aircraftRegistration: b.aircraft_registration || '',
        route: b.planned_route || b.route || '',
        pax: b.pax || 0,
        cargo: b.cargo || 0,
        createdAt: b.created_at || '',
        expiresAt: b.expires_at || '',
      },
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { bid: null, error: 'Request timed out' };
    return { bid: null, error: err?.message || 'Network error' };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Badge / Award Management ─────────────────────────────────────

export async function fetchBadges(): Promise<BadgeDefinition[]> {
  try {
    const res = await fetch(`${API_BASE}?action=badges`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.badges) ? data.badges : [];
  } catch {
    return [];
  }
}

export async function createBadge(badge: Omit<BadgeDefinition, 'id' | 'createdAt'>): Promise<BadgeDefinition | null> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-badge', ...badge }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.badge ?? null;
  } catch {
    return null;
  }
}

export async function updateBadge(id: string, badge: Partial<Omit<BadgeDefinition, 'id' | 'createdAt'>>): Promise<BadgeDefinition | null> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-badge', id, ...badge }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.badge ?? null;
  } catch {
    return null;
  }
}

export async function deleteBadge(id: string): Promise<boolean> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-badge', id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPilotStats(pilotId: string): Promise<PilotStats | null> {
  try {
    const res = await fetch(`${API_BASE}?action=pilot-stats&pilotId=${encodeURIComponent(pilotId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
}

// ── Tour Management ──────────────────────────────────────────────

export async function fetchTours(): Promise<TourDefinition[]> {
  try {
    const res = await fetch(`${API_BASE}?action=tours`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.tours) ? data.tours : [];
  } catch {
    return [];
  }
}

export async function createTour(tour: Omit<TourDefinition, 'id' | 'createdAt'>): Promise<TourDefinition | null> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-tour', ...tour }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.tour ?? null;
  } catch {
    return null;
  }
}

export async function fetchTourProgress(tourId: string, pilotId: string): Promise<TourProgress | null> {
  try {
    const res = await fetch(`${API_BASE}?action=tour-progress&tourId=${encodeURIComponent(tourId)}&pilotId=${encodeURIComponent(pilotId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.progress ?? null;
  } catch {
    return null;
  }
}

export async function submitLegReport(report: {
  pilotId: string;
  pilotName: string;
  tourId: string;
  legNumber: number;
  departureIcao: string;
  arrivalIcao: string;
  pirepId: string;
  ivaoUrl: string;
  notes: string;
}): Promise<LegReport | null> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit-leg-report', ...report }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.report ?? null;
  } catch {
    return null;
  }
}

export async function fetchPendingReports(tourId?: string): Promise<LegReport[]> {
  try {
    const params = new URLSearchParams({ action: 'pending-reports' });
    if (tourId) params.set('tourId', tourId);
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.reports) ? data.reports : [];
  } catch {
    return [];
  }
}

export async function updateTourLegs(tourId: string, legs: import('./types').TourLeg[]): Promise<boolean> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-tour-legs', tourId, legs }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteTour(tourId: string): Promise<boolean> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-tour', tourId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function modifyLegReport(reportId: string, fields: { ivaoUrl?: string; pirepId?: string; notes?: string }): Promise<boolean> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'modify-leg-report', reportId, ...fields }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function reviewLegReport(reportId: string, action: 'approve' | 'reject', comment?: string): Promise<boolean> {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review-leg-report', reportId, decision: action, comment: comment || '' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Discord Webhook (Tour Reports) ──────────────────────────────

const TOUR_REPORT_WEBHOOK = 'https://discord.com/api/webhooks/1471474766199390383/HQYuicVQnjbwQfFcf5xnGAKi6r-j_8JxmWP2KPu_T8bdZj-3CYD1k4ErNYfgUfzKAp4V';

export async function sendTourReportWebhook(payload: {
  pilotName: string;
  tourName: string;
  legNumber: number;
  totalLegs: number;
  departureIcao: string;
  arrivalIcao: string;
  status: 'submitted' | 'approved' | 'rejected' | 'completed';
}): Promise<boolean> {
  const { pilotName, tourName, legNumber, totalLegs, departureIcao, arrivalIcao, status } = payload;

  const statusEmoji = status === 'submitted' ? '📋' : status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '🏆';
  const statusText = status === 'submitted' ? 'Submitted for Validation'
    : status === 'approved' ? 'Validated'
    : status === 'rejected' ? 'Rejected'
    : 'TOUR COMPLETED';

  const color = status === 'submitted' ? 0xC5A059 : status === 'approved' ? 0x2DCE89 : status === 'rejected' ? 0xEF4444 : 0xC5A059;

  const embed = {
    title: `${statusEmoji} TOUR UPDATE`,
    description: status === 'completed'
      ? `**${pilotName}** has completed all **${totalLegs} legs** of **${tourName}**! Award granted.`
      : `**${pilotName}** — Leg **${legNumber}/${totalLegs}** ${statusText}`,
    color,
    fields: [
      { name: 'Tour', value: tourName, inline: true },
      { name: 'Leg', value: `${legNumber}/${totalLegs}`, inline: true },
      { name: 'Route', value: `${departureIcao} → ${arrivalIcao}`, inline: true },
      { name: 'Progress', value: `${'█'.repeat(Math.round((legNumber / totalLegs) * 20))}${'░'.repeat(20 - Math.round((legNumber / totalLegs) * 20))} ${Math.round((legNumber / totalLegs) * 100)}%`, inline: false },
    ],
    footer: { text: 'Levant Virtual Airlines — Tour System' },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(TOUR_REPORT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
