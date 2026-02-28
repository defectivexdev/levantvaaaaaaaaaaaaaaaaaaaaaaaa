// ── Weather Service (METAR / TAF) ───────────────────────────────────
// In WebView2: routes through C# SimBridge (avoids CORS).
// In browser dev mode: fetches directly from aviationweather.gov.

function isWebView2(): boolean {
  return !!window.chrome?.webview;
}

// ── Bridge-based weather fetch (WebView2) ────────────────────
// React sends { action: 'requestMetar', icao } to C#.
// C# fetches from aviationweather.gov / VATSIM (no CORS issue).
// C# pushes back { type: 'metarResult', icao, raw, success }.

const _pendingWeather = new Map<string, (raw: string | null) => void>();

// Listen for weather results from C# (one-time setup)
if (isWebView2()) {
  window.chrome!.webview!.addEventListener('message', (e: MessageEvent) => {
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data.type === 'metarResult' || data.type === 'tafResult') {
        const key = `${data.type}:${data.icao}`;
        const resolver = _pendingWeather.get(key);
        if (resolver) {
          _pendingWeather.delete(key);
          resolver(data.success ? data.raw : null);
        }
      }
    } catch { /* ignore */ }
  });
}

function requestWeatherViaBridge(icao: string, kind: 'metar' | 'taf'): Promise<string | null> {
  return new Promise((resolve) => {
    const action = kind === 'taf' ? 'requestTaf' : 'requestMetar';
    const key = `${kind === 'taf' ? 'tafResult' : 'metarResult'}:${icao.toUpperCase()}`;

    // Timeout after 8s
    const timer = setTimeout(() => {
      _pendingWeather.delete(key);
      resolve(null);
    }, 8000);

    _pendingWeather.set(key, (raw) => {
      clearTimeout(timer);
      resolve(raw);
    });

    window.chrome!.webview!.postMessage(JSON.stringify({ action, icao: icao.toUpperCase() }));
  });
}

// ── Direct fetch (browser dev mode fallback) ────────────────
async function fetchWeatherDirect(icao: string, kind: 'metar' | 'taf'): Promise<string | null> {
  const upper = icao.toUpperCase();
  const endpoint = kind === 'taf' ? 'taf' : 'metar';
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/${endpoint}?ids=${upper}&format=raw`);
    if (res.ok) {
      const raw = (await res.text()).trim();
      if (raw.length > 10) return raw;
    }
  } catch { /* CORS likely blocked */ }

  if (kind === 'metar') {
    try {
      const res = await fetch(`https://metar.vatsim.net/metar.php?id=${upper}`);
      if (res.ok) {
        const raw = (await res.text()).trim();
        if (raw.length > 10) return raw;
      }
    } catch {}
  }
  return null;
}

export interface MetarResult {
  icao: string;
  raw: string;
  wind: string;
  visibility: string;
  temperature: string;
  pressure: string;
  qnh: number;
  clouds: string;
  isSevere: boolean;
  conditions: string[];
}

export interface TafResult {
  icao: string;
  raw: string;
}

/**
 * Parse QNH from a raw METAR string.
 * Handles both Q#### (hPa) and A#### (inHg → convert to hPa).
 */
function parseQnh(raw: string): number {
  // Q1013 format (hPa)
  const qMatch = raw.match(/\bQ(\d{4})\b/);
  if (qMatch) return parseInt(qMatch[1], 10);

  // A2992 format (inHg × 100)
  const aMatch = raw.match(/\bA(\d{4})\b/);
  if (aMatch) return Math.round(parseInt(aMatch[1], 10) / 100 * 33.8639);

  return 1013; // standard
}

/**
 * Parse wind from METAR (e.g. "27015G25KT" → "270° / 15 kt G25")
 */
function parseWind(raw: string): string {
  const m = raw.match(/\b(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT\b/);
  if (!m) return 'CALM';
  const dir = m[1] === 'VRB' ? 'VRB' : `${m[1]}°`;
  const spd = m[2];
  const gust = m[4] ? ` G${m[4]}` : '';
  return `${dir} / ${spd} kt${gust}`;
}

/**
 * Parse visibility from METAR
 */
function parseVisibility(raw: string): string {
  const m = raw.match(/\b(\d{4})\b/);
  if (m && m[1] !== raw.match(/\d{6}Z/)?.[0]?.slice(0, 4)) {
    const vis = parseInt(m[1], 10);
    if (vis === 9999) return '> 10 km';
    return `${(vis / 1000).toFixed(1)} km`;
  }
  // SM format
  const sm = raw.match(/\b(\d+)\s?SM\b/);
  if (sm) return `${sm[1]} SM`;
  return '—';
}

/**
 * Parse temperature from METAR (e.g. "M02/M05" → "-2°C / Dew -5°C")
 */
function parseTemperature(raw: string): string {
  const m = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
  if (!m) return '—';
  const parse = (s: string) => (s.startsWith('M') ? -parseInt(s.slice(1), 10) : parseInt(s, 10));
  return `${parse(m[1])}°C / Dew ${parse(m[2])}°C`;
}

/**
 * Parse cloud layers from METAR
 */
function parseClouds(raw: string): string {
  const layers = raw.match(/\b(FEW|SCT|BKN|OVC|CLR|SKC|NSC|CAVOK)(\d{3})?\b/g);
  if (!layers || layers.length === 0) return 'CLR';
  return layers.join(' ');
}

/**
 * Detect severe weather conditions
 */
const SEVERE_TOKENS = ['TS', 'FG', 'SN', 'FZRA', 'FZDZ', 'GR', 'SQ', '+RA', '+SN', 'BR'];

function detectConditions(raw: string): string[] {
  return SEVERE_TOKENS.filter(t => raw.includes(t));
}

/**
 * Fetch METAR for an ICAO airport code.
 */
export async function fetchMetar(icao: string): Promise<MetarResult | null> {
  const upper = icao.toUpperCase();
  let raw: string | null = null;

  if (isWebView2()) {
    raw = await requestWeatherViaBridge(upper, 'metar');
  } else {
    raw = await fetchWeatherDirect(upper, 'metar');
  }

  if (raw && raw.trim().length > 10) return parseRawMetar(upper, raw);
  return null;
}

function parseRawMetar(icao: string, rawText: string): MetarResult {
  const raw = rawText.trim();
  const conditions = detectConditions(raw);
  return {
    icao,
    raw,
    wind: parseWind(raw),
    visibility: parseVisibility(raw),
    temperature: parseTemperature(raw),
    pressure: `Q${parseQnh(raw)}`,
    qnh: parseQnh(raw),
    clouds: parseClouds(raw),
    isSevere: conditions.length > 0,
    conditions,
  };
}

/**
 * Fetch TAF for an ICAO airport code.
 */
export async function fetchTaf(icao: string): Promise<TafResult | null> {
  const upper = icao.toUpperCase();
  let raw: string | null = null;

  if (isWebView2()) {
    raw = await requestWeatherViaBridge(upper, 'taf');
  } else {
    raw = await fetchWeatherDirect(upper, 'taf');
  }

  if (raw && raw.trim().length > 10) return { icao: upper, raw: raw.trim() };
  return null;
}
