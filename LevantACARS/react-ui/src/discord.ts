/**
 * Discord Webhook — flight event notifications, landing analytics,
 * one-time diagnostic handshake, and offline buffer with retry.
 */

const WEBHOOK_URL =
  'https://discord.com/api/webhooks/1466214163742326981/IGGoTrqGncm-lH4GM-RjZbL1zEh9JFh0aVPxmqVINkMDs10liyeTYrsuNipbKZvFJbrm';

// ── Color palette ────────────────────────────────────────────────
const CYAN   = 0x00e5ff;
const GREEN  = 0x00d26a;
const GOLD   = 0xffb800;
const YELLOW = 0xffc107;
const ORANGE = 0xff9800;
const RED    = 0xff4757;

// ── Interfaces ───────────────────────────────────────────────────

export interface FlightEvent {
  pilotName: string;
  pilotId: string;
  callsign: string;
  departureIcao: string;
  arrivalIcao: string;
  aircraftType: string;
  route?: string;
}

export interface LandingData {
  fpm: number;
  gForce: number;
  score: number;
  grade: string;
}

// ── Landing Grade & Score ────────────────────────────────────────

export function getLandingGrade(fpm: number): string {
  const abs = Math.abs(fpm);
  if (abs <= 160) return 'Greased';
  if (abs <= 240) return 'Great';
  if (abs <= 400) return 'Average';
  if (abs <= 600) return 'Hard';
  return 'Structural';
}

export function getLandingScore(fpm: number): number {
  // Center-point: -160 FPM = 100%.
  // Weighted penalty: 66/158 ≈ 0.41772 per FPM deviation.
  // Yields exactly: -160 → 100%, -318 → 34%, -398 → 0%.
  const deviation = Math.abs(Math.abs(fpm) - 160);
  return Math.max(0, Math.round(100 - deviation * (66 / 158)));
}

function getGradeColor(grade: string): number {
  switch (grade) {
    case 'Greased':    return CYAN;
    case 'Great':      return GREEN;
    case 'Average':    return YELLOW;
    case 'Hard':       return ORANGE;
    case 'Structural': return RED;
    default:           return GOLD;
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function safe(val: string | null | undefined, fallback = 'Unknown'): string {
  return val?.trim() || fallback;
}

// ── Offline Buffer ───────────────────────────────────────────────
// If the webhook POST fails, cache the payload and retry every 60s.

const BUFFER_KEY = 'LVT_DISCORD_BUFFER';

function getBuffer(): object[] {
  try {
    return JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]');
  } catch { return []; }
}

function pushBuffer(payload: object) {
  const buf = getBuffer();
  buf.push(payload);
  localStorage.setItem(BUFFER_KEY, JSON.stringify(buf.slice(-20))); // cap at 20
}

function clearBuffer() {
  localStorage.removeItem(BUFFER_KEY);
}

async function flushBuffer(): Promise<void> {
  const buf = getBuffer();
  if (buf.length === 0) return;
  console.log(`[Discord] Flushing ${buf.length} buffered message(s)...`);
  const remaining: object[] = [];
  for (const payload of buf) {
    const code = await sendEmbed(payload);
    if (code === null || (code >= 400 && code !== 429)) {
      remaining.push(payload); // keep if still failing
    }
  }
  if (remaining.length > 0) {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(remaining));
  } else {
    clearBuffer();
  }
}

// Start buffer flush interval (every 60s)
let _flushInterval: ReturnType<typeof setInterval> | null = null;
function ensureFlushLoop() {
  if (_flushInterval) return;
  _flushInterval = setInterval(() => flushBuffer().catch(() => {}), 60_000);
}

// ── Core Send ────────────────────────────────────────────────────

async function sendEmbed(payload: object): Promise<number | null> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`[Discord] Webhook response: ${res.status}`);
    return res.status;
  } catch (err) {
    console.error('[Discord] Webhook error:', err);
    return null;
  }
}

async function sendWithBuffer(payload: object): Promise<void> {
  ensureFlushLoop();
  const code = await sendEmbed(payload);
  if (code === null || (code >= 400 && code !== 204 && code !== 200)) {
    console.warn('[Discord] Buffering payload for retry');
    pushBuffer(payload);
  }
}

// ── Diagnostic Handshake (one-time) ──────────────────────────────

const VERIFIED_KEY = 'LVT_DISCORD_VERIFIED';

export async function runDiscordDiagnostic(): Promise<void> {
  // Diagnostic is now silent — no embed posted to Discord channel.
  // We still mark as verified so the check doesn't run repeatedly.
  if (localStorage.getItem(VERIFIED_KEY) === 'true') {
    console.log('[Discord] Webhook already verified — skipping diagnostic.');
    return;
  }
  console.log('[Discord] Connection diagnostic: webhook URL configured.');
  localStorage.setItem(VERIFIED_KEY, 'true');
}

// ── Flight Notifications ─────────────────────────────────────────

export async function notifyFlightStarted(event: FlightEvent): Promise<void> {
  await sendWithBuffer({
    embeds: [{
      title: '✈️  Flight Started',
      color: GOLD,
      fields: [
        { name: 'Pilot', value: `${safe(event.pilotName)} (${safe(event.pilotId)})`, inline: true },
        { name: 'Callsign', value: safe(event.callsign), inline: true },
        { name: 'Aircraft', value: safe(event.aircraftType), inline: true },
        { name: 'Route', value: `${safe(event.departureIcao)} → ${safe(event.arrivalIcao)}`, inline: true },
        ...(event.route ? [{ name: 'Planned Route', value: safe(event.route), inline: false }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Levant ACARS v3.0' },
    }],
  });
}

export async function notifyFlightEnded(
  event: FlightEvent & { score?: number; landingGrade?: string; flightTime?: string; landingRate?: number },
): Promise<void> {
  const fpm = event.landingRate ?? 0;
  const grade = event.landingGrade || getLandingGrade(fpm);
  const score = event.score ?? getLandingScore(fpm);
  const color = getGradeColor(grade);

  // Exact format string requested
  const reportString = `${safe(event.callsign)} has landed at ${safe(event.arrivalIcao)} with a landing rate of ${fpm.toFixed(2)}fpm and performance score of ${score}%.`;

  await sendWithBuffer({
    content: reportString,
    embeds: [{
      title: `🛬  Landing Grade: ${grade}`,
      color,
      fields: [
        { name: 'Pilot', value: `${safe(event.pilotName)} (${safe(event.pilotId)})`, inline: true },
        { name: 'Callsign', value: safe(event.callsign), inline: true },
        { name: 'Route', value: `${safe(event.departureIcao)} → ${safe(event.arrivalIcao)}`, inline: true },
        { name: 'Landing Rate', value: `${fpm.toFixed(0)} FPM`, inline: true },
        { name: 'Score', value: `${score}%`, inline: true },
        { name: 'Grade', value: grade, inline: true },
        ...(event.flightTime ? [{ name: 'Flight Time', value: event.flightTime, inline: true }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Levant ACARS v3.0' },
    }],
  });
}

// ── Landing Black Box Touchdown Notification ─────────────────────

export async function notifyTouchdown(
  event: FlightEvent,
  landing: LandingData,
): Promise<void> {
  const color = getGradeColor(landing.grade);
  await sendWithBuffer({
    embeds: [{
      title: `🛬 Touchdown Recorded — ${landing.grade}`,
      color,
      fields: [
        { name: 'Rate', value: `${landing.fpm.toFixed(0)} FPM`, inline: true },
        { name: 'G-Force', value: `${landing.gForce.toFixed(2)}G`, inline: true },
        { name: 'Score', value: `${landing.score}%`, inline: true },
        { name: 'Callsign', value: safe(event.callsign), inline: true },
        { name: 'Arrival', value: safe(event.arrivalIcao), inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Levant ACARS v3.0 — Black Box' },
    }],
  });
}

// ── Logbook Persistence (localStorage) ───────────────────────────

const LOGBOOK_KEY = 'LVT_LOGBOOK';

export interface LogbookEntry {
  date: string;
  callsign: string;
  route: string;
  departureIcao: string;
  arrivalIcao: string;
  aircraftType: string;
  fpm: number;
  score: number;
  grade: string;
  flightTime: string;
  report: string;
}

export function saveFlightToLogbook(entry: LogbookEntry): void {
  try {
    const logbook: LogbookEntry[] = JSON.parse(localStorage.getItem(LOGBOOK_KEY) || '[]');
    logbook.unshift(entry);
    // Keep last 200 entries
    localStorage.setItem(LOGBOOK_KEY, JSON.stringify(logbook.slice(0, 200)));
    console.log('[Logbook] Flight saved:', entry.callsign, entry.route);
  } catch (err) {
    console.error('[Logbook] Failed to save:', err);
  }
}

export function getLogbook(): LogbookEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOGBOOK_KEY) || '[]');
  } catch { return []; }
}

export function clearLogbook(): void {
  localStorage.removeItem(LOGBOOK_KEY);
}
