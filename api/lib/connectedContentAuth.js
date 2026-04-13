/**
 * When `CONNECTED_CONTENT_TOKEN` is set in the environment, GET handlers require matching `?token=`.
 * @param {import('http').IncomingMessage & { query?: Record<string, string | string[] | undefined> }} req
 * @returns {{ ok: true } | { ok: false, status: number, body: Record<string, unknown> }}
 */
export function requireConnectedContentToken(req) {
  const expected = process.env.CONNECTED_CONTENT_TOKEN;
  if (!expected || !String(expected).trim()) {
    return { ok: true };
  }
  const q = req.query || {};
  const raw = q.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const got = typeof token === 'string' ? token : '';
  if (got !== String(expected).trim()) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: 'unauthorized',
        message: 'Invalid or missing token',
      },
    };
  }
  return { ok: true };
}
