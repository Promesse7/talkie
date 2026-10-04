import { TranslateError } from './errors.js';

/**
 * Verify a Firebase ID token without the Admin SDK by asking Identity Toolkit.
 * Resolves the uid, or null when the token is invalid/expired.
 * Uses FIREBASE_WEB_API_KEY, falling back to the same public key the client uses.
 */
export async function verifyFirebaseIdToken(idToken, env = {}, fetchImpl = globalThis.fetch) {
  const apiKey = env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new TranslateError(500, 'FIREBASE_WEB_API_KEY is not set; cannot verify sign-in');
  }
  let res;
  try {
    res = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    throw new TranslateError(502, `Could not verify sign-in: ${err.message}`);
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const uid = data?.users?.[0]?.localId;
  return typeof uid === 'string' && uid ? uid : null;
}

export function bearerToken(headers = {}) {
  const raw = headers.authorization ?? headers.Authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return match ? match[1] : null;
}
