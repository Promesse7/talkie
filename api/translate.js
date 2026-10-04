import { translateText, TranslateError } from '../server/translate/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    res.status(200).json(await translateText(req.body ?? {}, process.env, fetch));
  } catch (err) {
    res.status(err instanceof TranslateError ? err.status : 500).json({ error: err.message });
  }
}
