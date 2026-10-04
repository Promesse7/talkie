import { handleTranslateRequest } from '../server/translate/handler.js';

// A sleeping NLLB Space can take a while to answer; leave room for the primary timeout
// (TRANSLATE_TIMEOUT_MS, default 8 s) plus the fallback provider.
export const config = { maxDuration: 30 };

/** Vercel serverless function: POST /api/translate */
export default async function handler(req, res) {
  const result = await handleTranslateRequest(
    { method: req.method, headers: req.headers, body: req.body },
    process.env,
    fetch
  );
  res.status(result.status).json(result.body);
}
