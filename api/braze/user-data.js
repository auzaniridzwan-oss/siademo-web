/**
 * Vercel serverless proxy: Braze REST `/users/export/ids`.
 * Env: `BRAZE_REST_API_KEY`, `BRAZE_REST_API_URL` (e.g. https://rest.iad-01.braze.com, no trailing slash).
 * @param {import('http').IncomingMessage & { query?: Record<string, string> }} req
 * @param {import('http').ServerResponse & { status: (n: number) => any, json: (b: unknown) => void }} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let externalId =
    typeof req.query?.id === 'string' && req.query.id.trim()
      ? req.query.id.trim()
      : null;

  if (!externalId && req.method === 'POST' && req.body && typeof req.body === 'object') {
    const b = req.body;
    externalId = typeof b.id === 'string' && b.id.trim() ? b.id.trim() : null;
  }

  if (!externalId) {
    res.status(400).json({ error: 'external_id required (query ?id=)' });
    return;
  }

  const key = process.env.BRAZE_REST_API_KEY;
  const baseRaw = process.env.BRAZE_REST_API_URL;
  if (!key || !baseRaw) {
    res.status(503).json({ error: 'Braze REST proxy not configured' });
    return;
  }

  const base = baseRaw.replace(/\/$/, '');
  const url = `${base}/users/export/ids`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        external_ids: [externalId],
        fields_to_export: ['custom_attributes', 'first_name', 'last_name', 'email'],
      }),
    });

    if (r.status === 429) {
      res.status(429).json({ error: 'Rate limited — try later' });
      return;
    }

    const text = await r.text();
    if (!r.ok) {
      res.status(r.status).json({ error: 'Braze API error', detail: text.slice(0, 500) });
      return;
    }

    try {
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch {
      res.status(502).json({ error: 'Invalid JSON from Braze', detail: text.slice(0, 200) });
    }
  } catch (e) {
    res.status(500).json({ error: 'Proxy failed', detail: String(e) });
  }
}
