import { handleTranslateRequest } from './handler.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

/** Node http handler used by the Vite dev server so `npm run dev` serves /api/translate. */
export function createTranslateMiddleware(env, fetchImpl = globalThis.fetch) {
  return async (req, res) => {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return send(res, 400, { error: 'Invalid JSON body' });
    }
    try {
      const result = await handleTranslateRequest(
        { method: req.method, headers: req.headers, body },
        env,
        fetchImpl
      );
      send(res, result.status, result.body);
    } catch (err) {
      send(res, 500, { error: err?.message ?? 'Unexpected error' });
    }
  };
}
