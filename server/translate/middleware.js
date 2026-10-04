import { translateText, TranslateError } from './index.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export function createTranslateMiddleware(env, fetchImpl = globalThis.fetch) {
  return async (req, res) => {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body;
    try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'Invalid JSON body' }); }
    try { send(res, 200, await translateText(body, env, fetchImpl)); }
    catch (err) { send(res, err instanceof TranslateError ? err.status : 500, { error: err.message }); }
  };
}
