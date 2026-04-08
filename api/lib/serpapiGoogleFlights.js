import {
  DEMO_ORIGIN_CODE,
  SERPAPI_CURRENCY,
  SERPAPI_GL,
  SERPAPI_HL,
  SINGAPORE_AIRLINES_IATA,
} from '../../src/config/flightSearchScope.js';

const SERPAPI_SEARCH_URL = 'https://serpapi.com/search';

/**
 * @param {unknown} leg
 * @returns {leg is { flight_number?: string, airline?: string }}
 */
function isLegShape(leg) {
  return leg != null && typeof leg === 'object';
}

/**
 * True if this segment is operated/marketed as Singapore Airlines (defense in depth vs `include_airlines`).
 * @param {unknown} leg
 * @returns {boolean}
 */
export function isSingaporeAirlinesLeg(leg) {
  if (!isLegShape(leg)) return false;
  const fn = String(leg.flight_number || '').trim();
  if (/^SQ\d/i.test(fn) || /^SQ\s/i.test(fn)) return true;
  const name = String(leg.airline || '').toLowerCase();
  return name.includes('singapore');
}

/**
 * @param {unknown} itinerary
 * @returns {itinerary is { flights?: unknown[], price?: number }}
 */
function hasFlightsArray(itinerary) {
  return (
    itinerary != null &&
    typeof itinerary === 'object' &&
    Array.isArray(/** @type {{ flights?: unknown[] }} */ (itinerary).flights)
  );
}

/**
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatDurationLabel(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

/**
 * "2026-04-08 15:10" -> "15:10"
 * @param {string} serpTime
 * @returns {string}
 */
export function extractClock(serpTime) {
  const s = String(serpTime || '').trim();
  const parts = s.split(/\s+/);
  return parts.length >= 2 ? parts[parts.length - 1].slice(0, 5) : s.slice(0, 5);
}

/**
 * "2026-04-08 15:10" -> "2026-04-08" for calendar-day comparison.
 * @param {string} serpTime
 * @returns {string|null}
 */
export function extractDateKey(serpTime) {
  const s = String(serpTime || '').trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/**
 * @param {string|null} depDateKey
 * @param {string|null} arrDateKey
 * @returns {number}
 */
function calendarDayOffset(depDateKey, arrDateKey) {
  if (!depDateKey || !arrDateKey) return 0;
  const t0 = Date.parse(`${depDateKey}T00:00:00Z`);
  const t1 = Date.parse(`${arrDateKey}T00:00:00Z`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return 0;
  return Math.max(0, Math.round((t1 - t0) / 86400000));
}

/**
 * @param {{ flights: Array<{ departure_airport?: { time?: string, name?: string, id?: string }, arrival_airport?: { time?: string, name?: string, id?: string }, flight_number?: string, airplane?: string }>, price?: number, total_duration?: number }} itinerary
 * @returns {{ price: number, currency: string, totalDurationMinutes: number, durationLabel: string, departureTime: string, arrivalTime: string, flightNumbers: string[], id: string, originAirportName: string, destinationAirportName: string, originAirportCode: string, destinationAirportCode: string, aircraft: string, arrivalDayOffset: number } | null}
 */
export function normalizeItinerary(itinerary) {
  const legs = itinerary.flights;
  if (!legs.length) return null;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const dep = first?.departure_airport?.time;
  const arr = last?.arrival_airport?.time;
  if (dep == null || arr == null) return null;
  const price = itinerary.price;
  if (typeof price !== 'number' || !Number.isFinite(price)) return null;

  const flightNumbers = legs.map((l) => String(l.flight_number || '').trim()).filter(Boolean);
  const id = flightNumbers.join('-') || `sq-${price}-${dep}`;

  const totalMin =
    typeof itinerary.total_duration === 'number' && Number.isFinite(itinerary.total_duration)
      ? itinerary.total_duration
      : 0;

  const originAirportName = String(first?.departure_airport?.name || '').trim();
  const destinationAirportName = String(last?.arrival_airport?.name || '').trim();
  const originAirportCode = String(first?.departure_airport?.id || '')
    .trim()
    .toUpperCase();
  const destinationAirportCode = String(last?.arrival_airport?.id || '')
    .trim()
    .toUpperCase();

  /** @type {string[]} */
  const aircraftOrdered = [];
  const seenAircraft = new Set();
  for (const leg of legs) {
    const a = String(/** @type {{ airplane?: string }} */ (leg).airplane || '').trim();
    if (a && !seenAircraft.has(a)) {
      seenAircraft.add(a);
      aircraftOrdered.push(a);
    }
  }
  const aircraft = aircraftOrdered.join(' · ');

  const depKey = extractDateKey(String(dep));
  const arrKey = extractDateKey(String(arr));
  const arrivalDayOffset = calendarDayOffset(depKey, arrKey);

  return {
    price,
    currency: SERPAPI_CURRENCY,
    totalDurationMinutes: totalMin,
    durationLabel: totalMin > 0 ? formatDurationLabel(totalMin) : '',
    departureTime: extractClock(String(dep)),
    arrivalTime: extractClock(String(arr)),
    flightNumbers,
    id,
    originAirportName,
    destinationAirportName,
    originAirportCode,
    destinationAirportCode,
    aircraft,
    arrivalDayOffset,
  };
}

/**
 * Keeps itineraries where every segment is SQ (or marketed as Singapore Airlines).
 * @param {unknown[]} list
 * @returns {unknown[]}
 */
export function filterAllSqItineraries(list) {
  return list.filter((item) => {
    if (!hasFlightsArray(item)) return false;
    const legs = /** @type {{ flights: unknown[] }} */ (item).flights;
    return legs.length > 0 && legs.every((leg) => isSingaporeAirlinesLeg(leg));
  });
}

/**
 * @param {unknown} data
 * @returns {unknown[]}
 */
function mergeFlightLists(data) {
  if (!data || typeof data !== 'object') return [];
  const d = /** @type {Record<string, unknown>} */ (data);
  const best = Array.isArray(d.best_flights) ? d.best_flights : [];
  const other = Array.isArray(d.other_flights) ? d.other_flights : [];
  return [...best, ...other];
}

/**
 * Calls SerpAPI Google Flights for round-trip Economy, Singapore Airlines only, SIN → destination.
 * @param {string} apiKey - SerpAPI key (server-side only).
 * @param {{ origin_code: string, destination_code: string, depart_date: string, return_date: string }} search - must be allowlisted before call.
 * @returns {Promise<{ ok: boolean, error?: string, itineraries: ReturnType<typeof normalizeItinerary>[] }>}
 */
export async function fetchSqGoogleFlights(apiKey, search) {
  const params = new URLSearchParams({
    engine: 'google_flights',
    api_key: apiKey,
    departure_id: DEMO_ORIGIN_CODE,
    arrival_id: search.destination_code,
    outbound_date: search.depart_date,
    return_date: search.return_date,
    type: '1',
    travel_class: '1',
    adults: '1',
    include_airlines: SINGAPORE_AIRLINES_IATA,
    hl: SERPAPI_HL,
    gl: SERPAPI_GL,
    currency: SERPAPI_CURRENCY,
  });

  const url = `${SERPAPI_SEARCH_URL}?${params.toString()}`;

  let res;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (e) {
    return { ok: false, error: `network: ${String(e)}`, itineraries: [] };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: 'invalid_json_from_serpapi', itineraries: [] };
  }

  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : `http_${res.status}`;
    return { ok: false, error: msg, itineraries: [] };
  }

  if (data && typeof data === 'object' && typeof /** @type {{ error?: string }} */ (data).error === 'string') {
    return { ok: false, error: /** @type {{ error: string }} */ (data).error, itineraries: [] };
  }

  const merged = filterAllSqItineraries(mergeFlightLists(data));
  /** @type {ReturnType<typeof normalizeItinerary>[]} */
  const itineraries = [];

  for (const raw of merged) {
    if (!hasFlightsArray(raw)) continue;
    const n = normalizeItinerary(/** @type {Parameters<typeof normalizeItinerary>[0]} */ (raw));
    if (n) itineraries.push(n);
  }

  return { ok: true, itineraries };
}
