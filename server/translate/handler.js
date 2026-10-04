import { translateText } from './index.js';
import { TranslateError } from './errors.js';
import { bearerToken, verifyFirebaseIdToken } from './auth.js';

/**
 * Framework-agnostic request handler shared by the Vercel function and the Vite dev
 * middleware. Takes a plain { method, headers, body } and returns { status, body }.
 * Only signed-in Firebase users may spend the translation provider's quota.
 */
export async function handleTranslateRequest(req, env = {}, fetchImpl = globalThis.fetch) {
  if (req.method !== 'POST') return { status: 405, body: { error: 'Method not allowed' } };

  try {
    const token = bearerToken(req.headers);
    if (!token) return { status: 401, body: { error: 'Sign in to translate messages' } };
    const uid = await verifyFirebaseIdToken(token, env, fetchImpl);
    if (!uid) return { status: 401, body: { error: 'Sign in to translate messages' } };

    const result = await translateText(req.body ?? {}, env, fetchImpl);
    return { status: 200, body: result };
  } catch (err) {
    const status = err instanceof TranslateError ? err.status : 500;
    return { status, body: { error: err.message } };
  }
}
