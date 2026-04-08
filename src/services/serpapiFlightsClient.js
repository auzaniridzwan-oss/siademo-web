import { AppLogger } from '../managers/AppLogger.js';

/** Value column index per `FARE_BUCKETS` (Lite=0, Value=1, …). */
const VALUE_FARE_INDEX = 1;

/**
 * @param {number} totalMinutes
 * @returns {string}
 */
function formatDurationLabel(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

/**
 * Maps SerpAPI-normalized itineraries to `searchResults` flight row shape.
 * @param {Array<{ id: string, price: number, currency?: string, durationLabel?: string, totalDurationMinutes?: number, departureTime: string, arrivalTime: string, flightNumbers: string[], originAirportName?: string, destinationAirportName?: string, aircraft?: string, arrivalDayOffset?: number }>} itineraries
 * @returns {Array<{ id: string, flightNumber: string, departureTime: string, arrivalTime: string, duration: string, prices: (number|null)[], originAirportName: string, destinationAirportName: string, aircraft: string, arrivalDayOffset: number }>}
 */
export function mapItinerariesToResultRows(itineraries) {
  return itineraries.map((it) => {
    const duration =
      it.durationLabel && String(it.durationLabel).trim()
        ? it.durationLabel
        : it.totalDurationMinutes != null
          ? formatDurationLabel(it.totalDurationMinutes)
          : '—';
    /** @type {(number|null)[]} */
    const prices = [null, null, null, null];
    prices[VALUE_FARE_INDEX] = it.price;
    const arrivalDayOffset =
      typeof it.arrivalDayOffset === 'number' && Number.isFinite(it.arrivalDayOffset)
        ? Math.max(0, Math.floor(it.arrivalDayOffset))
        : 0;
    return {
      id: it.id,
      flightNumber: it.flightNumbers.length ? it.flightNumbers.join(' / ') : 'SQ',
      departureTime: it.departureTime,
      arrivalTime: it.arrivalTime,
      duration,
      prices,
      originAirportName: String(it.originAirportName || '').trim(),
      destinationAirportName: String(it.destinationAirportName || '').trim(),
      aircraft: String(it.aircraft || '').trim(),
      arrivalDayOffset,
    };
  });
}

/**
 * Fetches live SQ prices for the demo routes via the serverless `/api/serpapi/flights` proxy.
 * @param {object} bookingPayload - Valid `booking_search` object (e.g. from `buildBookingPayload`).
 * @returns {Promise<{ ok: boolean, rows: ReturnType<typeof mapItinerariesToResultRows>, error?: string }>}
 */
export async function fetchSqDemoFlights(bookingPayload) {
  try {
    const res = await fetch('/api/serpapi/flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload),
    });

    /** @type {{ ok?: boolean, itineraries?: unknown, error?: string, detail?: string }} */
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (res.status === 503) {
      AppLogger.warn('[SDK]', 'SerpAPI proxy not configured', data);
      return { ok: false, rows: [], error: 'not_configured' };
    }

    if (!res.ok) {
      AppLogger.warn('[SDK]', 'SerpAPI flights HTTP error', { status: res.status, data });
      return {
        ok: false,
        rows: [],
        error: typeof data.error === 'string' ? data.error : `http_${res.status}`,
      };
    }

    const itineraries = Array.isArray(data.itineraries) ? data.itineraries : [];
    const rows = mapItinerariesToResultRows(itineraries);
    AppLogger.info('[SDK]', 'SerpAPI flights loaded', { count: rows.length });
    return { ok: true, rows };
  } catch (e) {
    AppLogger.error('[SDK]', 'SerpAPI flights fetch failed', { detail: String(e) });
    return { ok: false, rows: [], error: String(e) };
  }
}
