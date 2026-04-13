import { SERPAPI_CURRENCY } from '../../src/config/flightSearchScope.js';
import { bookingSearchFromQuery } from '../../src/logic/bookingPayload.js';
import { requireConnectedContentToken } from '../lib/connectedContentAuth.js';
import { fetchSqGoogleFlights } from '../lib/serpapiGoogleFlights.js';

/** Max points appended to `price_history_csv` (most recent). */
const PRICE_HISTORY_CSV_CAP = 30;

/**
 * GET `/api/serpapi/pricing-trend` — flat `price_insights` for Braze Connected Content.
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
    console.error('[SerpAPI] pricing-trend error:', detail);
    res.status(502).json({ ok: false, error: 'serpapi_failed', message: detail });
    return;
  }

  const pi = result.price_insights;
  const hist = pi && Array.isArray(pi.price_history) ? pi.price_history : [];
  const last = hist.length ? hist[hist.length - 1] : null;

  let price_history_csv = '';
  if (hist.length) {
    const slice = hist.slice(-PRICE_HISTORY_CSV_CAP);
    price_history_csv = slice.map(([u, p]) => `${u}:${p}`).join(';');
  }

  const fetched_at = new Date().toISOString();

  res.status(200).json({
    ok: true,
    origin_code: payload.origin_code,
    destination_code: payload.destination_code,
    depart_date: payload.depart_date,
    return_date: payload.return_date,
    currency: SERPAPI_CURRENCY,
    fetched_at,
    insights_available: result.insights_available,
    lowest_price: pi && pi.lowest_price != null ? pi.lowest_price : null,
    price_level: pi && pi.price_level != null ? pi.price_level : null,
    typical_price_low: pi && pi.typical_low != null ? pi.typical_low : null,
    typical_price_high: pi && pi.typical_high != null ? pi.typical_high : null,
    price_history_length: hist.length,
    price_history_latest_unix: last ? last[0] : null,
    price_history_latest_price: last ? last[1] : null,
    price_history_csv: price_history_csv || null,
  });
}
