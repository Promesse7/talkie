import { describe, it, expect, vi } from 'vitest';
import { handleTranslateRequest } from './handler.js';
import { verifyFirebaseIdToken } from './auth.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const env = { TRANSLATE_PROVIDER: 'none', FIREBASE_WEB_API_KEY: 'k' };

describe('verifyFirebaseIdToken', () => {
  it('posts the token to identitytoolkit and resolves the uid', async () => {
    const fetchImpl = vi.fn(async () => json({ users: [{ localId: 'u1' }] }));
    await expect(verifyFirebaseIdToken('tok', env, fetchImpl)).resolves.toBe('u1');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=k');
    expect(JSON.parse(init.body)).toEqual({ idToken: 'tok' });
  });

  it('resolves null for an invalid token', async () => {
    const fetchImpl = vi.fn(async () => json({ error: { message: 'INVALID_ID_TOKEN' } }, 400));
    await expect(verifyFirebaseIdToken('bad', env, fetchImpl)).resolves.toBeNull();
  });

  it('falls back to VITE_FIREBASE_API_KEY and errors when neither is set', async () => {
    const fetchImpl = vi.fn(async () => json({ users: [{ localId: 'u1' }] }));
    await verifyFirebaseIdToken('tok', { VITE_FIREBASE_API_KEY: 'v' }, fetchImpl);
    expect(fetchImpl.mock.calls[0][0]).toContain('key=v');
    await expect(verifyFirebaseIdToken('tok', {}, fetchImpl)).rejects.toMatchObject({ status: 500 });
  });
});

describe('handleTranslateRequest', () => {
  const okAuth = vi.fn(async () => json({ users: [{ localId: 'u1' }] }));

  it('rejects non-POST with 405', async () => {
    const res = await handleTranslateRequest({ method: 'GET', headers: {}, body: {} }, env, okAuth);
    expect(res.status).toBe(405);
  });

  it('rejects a missing bearer token with 401 without calling any provider', async () => {
    const fetchImpl = vi.fn();
    const req = { method: 'POST', headers: {}, body: { text: 'hi', source: 'en', target: 'fr' } };
    const res = await handleTranslateRequest(req, env, fetchImpl);
    expect(res).toEqual({ status: 401, body: { error: 'Sign in to translate messages' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an invalid token with 401', async () => {
    const fetchImpl = vi.fn(async () => json({ error: {} }, 400));
    const req = { method: 'POST', headers: { authorization: 'Bearer bad' }, body: { text: 'hi', source: 'en', target: 'fr' } };
    const res = await handleTranslateRequest(req, env, fetchImpl);
    expect(res.status).toBe(401);
  });

  it('translates for a valid token (header name case-insensitive)', async () => {
    const req = { method: 'POST', headers: { Authorization: 'Bearer good' }, body: { text: 'hi', source: 'en', target: 'fr' } };
    const res = await handleTranslateRequest(req, env, okAuth);
    expect(res).toEqual({ status: 200, body: { translatedText: 'hi', provider: 'none' } });
  });

  it('maps validation errors to their status', async () => {
    const req = { method: 'POST', headers: { authorization: 'Bearer good' }, body: { text: 5, source: 'en', target: 'fr' } };
    const res = await handleTranslateRequest(req, env, okAuth);
    expect(res.status).toBe(400);
  });
});
