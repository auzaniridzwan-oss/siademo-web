import { SERPAPI_CURRENCY } from '../../src/config/flightSearchScope.js';
import { bookingSearchFromQuery } from '../../src/logic/bookingPayload.js';
import { requireConnectedContentToken } from '../lib/connectedContentAuth.js';
import { fetchSqGoogleFlights, formatDurationLabel } from '../lib/serpapiGoogleFlights.js';

/**
 * GET `/api/serpapi/fares` — flat JSON for Braze Connected Content (cheapest SQ round-trip fare).
 * Query: `origin_code`, `destination_code`, `depart_date`, `return_date`, optional `token`.
 * @param {import('http').IncomingMessage & { query?: Record<string, string | string[] | undefined> }} req
 * @param {import('http').ServerResponse & { status: (n: number) => any, json: (b: unknown) => void }} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'method_not_allowed', message: 'Method not allowed' });
    return;
  }

  const auth = requireConnectedContentToken(req);
  if (!auth.ok) {
    res.status(auth.status).json(auth.body);
    return;
  }

  const key = process.env.SERPAPI_API_KEY;
  if (!key || !String(key).trim()) {
    res.status(503).json({ ok: false, error: 'not_configured', message: 'SerpAPI proxy not configured' });
    return;
  }

  const parsed = bookingSearchFromQuery(/** @type {Record<string, unknown>} */ (req.query || {}));
  if (!parsed.ok) {
    res.status(400).json({
      ok: false,
      error: parsed.error,
      message: 'Invalid or out-of-scope search (demo: SIN to NRT, LHR, or SYD only)',
    });
    return;
  }

  const { payload } = parsed;
  const search = {
    origin_code: payload.origin_code,
    destination_code: payload.destination_code,
    depart_date: payload.depart_date,
    return_date: payload.return_date,
  };

  const result = await fetchSqGoogleFlights(String(key).trim(), search);

  if (!result.ok) {
    const detail = result.error ? String(result.error).slice(0, 500) : 'unknown';
    console.error('[SerpAPI] fares error:', detail);
    res.status(502).json({ ok: false, error: 'serpapi_failed', message: detail });
    return;
  }

  const list = result.itineraries;
  let cheapest = null;
  for (const it of list) {
    if (!cheapest || it.price < cheapest.price) cheapest = it;
  }

  const fetched_at = new Date().toISOString();

  if (!cheapest) {
    res.status(200).json({
      ok: true,
      origin_code: payload.origin_code,
      destination_code: payload.destination_code,
      depart_date: payload.depart_date,
      return_date: payload.return_date,
      currency: SERPAPI_CURRENCY,
      fetched_at,
      itinerary_count: 0,
      cheapest_price: null,
      cheapest_duration: null,
      cheapest_departure_time: null,
      cheapest_arrival_time: null,
      cheapest_flight_numbers: null,
      cheapest_id: null,
    });
    return;
  }

  const durationLabel =
    cheapest.durationLabel && String(cheapest.durationLabel).trim()
      ? cheapest.durationLabel
      : cheapest.totalDurationMinutes > 0
        ? formatDurationLabel(cheapest.totalDurationMinutes)
        : null;

  const flightNums = cheapest.flightNumbers.length ? cheapest.flightNumbers.join(' / ') : 'SQ';

  res.status(200).json({
    ok: true,
    origin_code: payload.origin_code,
    destination_code: payload.destination_code,
    depart_date: payload.depart_date,
    return_date: payload.return_date,
    currency: SERPAPI_CURRENCY,
    fetched_at,
    itinerary_count: list.length,
    cheapest_price: cheapest.price,
    cheapest_duration: durationLabel,
    cheapest_departure_time: cheapest.departureTime,
    cheapest_arrival_time: cheapest.arrivalTime,
    cheapest_flight_numbers: flightNums,
    cheapest_id: cheapest.id,
  });
}
