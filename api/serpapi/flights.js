import { isValidBookingSearch } from '../../src/logic/bookingPayload.js';
import { fetchSqGoogleFlights } from '../lib/serpapiGoogleFlights.js';

/**
 * Vercel serverless: proxy SerpAPI Google Flights (SQ-only, demo routes SIN ↔ NRT/LHR/SYD).
 * Env: `SERPAPI_API_KEY` — never exposed to the client.
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @param {import('http').ServerResponse & { status: (n: number) => any, json: (b: unknown) => void }} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.SERPAPI_API_KEY;
  if (!key || !String(key).trim()) {
    res.status(503).json({ error: 'SerpAPI proxy not configured' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
  }

  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Expected JSON body with booking_search fields' });
    return;
  }

  if (!isValidBookingSearch(body)) {
    res.status(400).json({ error: 'Invalid or out-of-scope search (demo: SIN to NRT, LHR, or SYD only)' });
    return;
  }

  const search = {
    origin_code: body.origin_code,
    destination_code: body.destination_code,
    depart_date: body.depart_date,
    return_date: body.return_date,
  };

  const result = await fetchSqGoogleFlights(String(key).trim(), search);

  if (!result.ok) {
    const detail = result.error ? String(result.error).slice(0, 500) : 'unknown';
    console.error('[SerpAPI] flights error:', detail);
    res.status(502).json({ error: 'SerpAPI request failed', detail });
    return;
  }

  res.status(200).json({ ok: true, itineraries: result.itineraries });
}
