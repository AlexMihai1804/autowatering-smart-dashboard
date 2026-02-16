export interface OpenMeteoSoilMoistureNow {
  provider: 'open-meteo';
  fetchedAt: number; // epoch ms
  timeEpoch: number | null; // unix seconds (GMT)
  // Volumetric water content (m3/m3) averaged over approx 0-9cm (0-1, 1-3, 3-9cm weighted by depth).
  vwc0to9cm_m3_m3: number | null;
}

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_PREFIX = 'openmeteo_soil_moisture_now_v1:';

function roundCoord(value: number): number {
  // 3 decimals ~= 110m latitude, good enough for forecasts and caching.
  return Math.round(value * 1000) / 1000;
}

function isFiniteNumber(value: any): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readCache(key: string): OpenMeteoSoilMoistureNow | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OpenMeteoSoilMoistureNow> | null;
    if (!parsed || parsed.provider !== 'open-meteo') return null;
    if (!isFiniteNumber(parsed.fetchedAt)) return null;
    return {
      provider: 'open-meteo',
      fetchedAt: parsed.fetchedAt,
      timeEpoch: isFiniteNumber(parsed.timeEpoch) ? parsed.timeEpoch : null,
      vwc0to9cm_m3_m3: isFiniteNumber(parsed.vwc0to9cm_m3_m3) ? parsed.vwc0to9cm_m3_m3 : null,
    };
  } catch {
    return null;
  }
}

function writeCache(key: string, value: OpenMeteoSoilMoistureNow): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function pickLatestNotAfter(times: number[], nowEpoch: number): number | null {
  if (times.length === 0) return null;
  // Open-Meteo returns sorted times (ascending). We pick the last hour <= now.
  let idx: number | null = null;
  for (let i = 0; i < times.length; i += 1) {
    if (times[i] <= nowEpoch) idx = i;
    else break;
  }
  return idx ?? 0;
}

function weightedAverage(values: Array<{ value: number | null; weight: number }>): number | null {
  let sum = 0;
  let weightSum = 0;
  for (const item of values) {
    if (!isFiniteNumber(item.value)) continue;
    sum += item.value * item.weight;
    weightSum += item.weight;
  }
  if (!weightSum) return null;
  return sum / weightSum;
}

export class OpenMeteoService {
  private static instance: OpenMeteoService | null = null;
  private inFlight = new Map<string, Promise<OpenMeteoSoilMoistureNow>>();

  public static getInstance(): OpenMeteoService {
    if (!OpenMeteoService.instance) OpenMeteoService.instance = new OpenMeteoService();
    return OpenMeteoService.instance;
  }

  public async getSoilMoistureNow(
    latitude: number,
    longitude: number,
    opts?: { maxAgeMs?: number }
  ): Promise<OpenMeteoSoilMoistureNow> {
    const maxAgeMs = opts?.maxAgeMs ?? 20 * 60 * 1000;
    const lat = roundCoord(latitude);
    const lon = roundCoord(longitude);
    const key = `${lat},${lon}`;

    const cached = readCache(key);
    if (cached && Date.now() - cached.fetchedAt <= maxAgeMs) return cached;

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = this.fetchSoilMoistureNow(lat, lon)
      .then((result) => {
        writeCache(key, result);
        return result;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  private async fetchSoilMoistureNow(lat: number, lon: number): Promise<OpenMeteoSoilMoistureNow> {
    const params = new URLSearchParams();
    params.set('latitude', String(lat));
    params.set('longitude', String(lon));
    params.set('hourly', [
      'soil_moisture_0_to_1cm',
      'soil_moisture_1_to_3cm',
      'soil_moisture_3_to_9cm',
    ].join(','));
    params.set('timeformat', 'unixtime');
    params.set('timezone', 'GMT');
    params.set('forecast_days', '2');

    const url = `${BASE_URL}?${params.toString()}`;
    const resp = await fetch(url, { method: 'GET' });
    if (!resp.ok) {
      throw new Error(`Open-Meteo error: HTTP ${resp.status}`);
    }

    const json: any = await resp.json();
    const times: number[] = Array.isArray(json?.hourly?.time) ? json.hourly.time : [];
    const sm01: Array<number | null> = Array.isArray(json?.hourly?.soil_moisture_0_to_1cm) ? json.hourly.soil_moisture_0_to_1cm : [];
    const sm13: Array<number | null> = Array.isArray(json?.hourly?.soil_moisture_1_to_3cm) ? json.hourly.soil_moisture_1_to_3cm : [];
    const sm39: Array<number | null> = Array.isArray(json?.hourly?.soil_moisture_3_to_9cm) ? json.hourly.soil_moisture_3_to_9cm : [];

    const nowEpoch = Math.floor(Date.now() / 1000);
    const idx = pickLatestNotAfter(times, nowEpoch);

    const v0 = idx === null ? null : (isFiniteNumber(sm01[idx]) ? sm01[idx] : null);
    const v1 = idx === null ? null : (isFiniteNumber(sm13[idx]) ? sm13[idx] : null);
    const v2 = idx === null ? null : (isFiniteNumber(sm39[idx]) ? sm39[idx] : null);

    const vwc0to9 = weightedAverage([
      { value: v0, weight: 1 }, // 0-1cm
      { value: v1, weight: 2 }, // 1-3cm
      { value: v2, weight: 6 }, // 3-9cm
    ]);

    return {
      provider: 'open-meteo',
      fetchedAt: Date.now(),
      timeEpoch: idx === null ? null : (isFiniteNumber(times[idx]) ? times[idx] : null),
      vwc0to9cm_m3_m3: vwc0to9,
    };
  }
}

