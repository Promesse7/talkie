import { handleTranslateRequest } from '../server/translate/handler.js';

/** Vercel serverless function: POST /api/translate */
export default async function handler(req, res) {
  const result = await handleTranslateRequest(
    { method: req.method, headers: req.headers, body: req.body },
    process.env,
    fetch
  );
  res.status(result.status).json(result.body);
}
