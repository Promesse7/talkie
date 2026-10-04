import { describe, it, expect, vi } from 'vitest';
import { translateText } from './index.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const env = { TRANSLATE_PROVIDER: 'nllb' };

describe('nllb provider (self-hostable nllb-api)', () => {
  it('GETs /api/v4/translator with FLORES codes and returns the trimmed result', async () => {
    const fetchImpl = vi.fn(async () => json({ result: 'Muraho nshuti ' }));
    const out = await translateText({ text: 'Hello friend', source: 'en', target: 'rw' }, env, fetchImpl);
    expect(out).toEqual({ translatedText: 'Muraho nshuti', provider: 'nllb' });
    const [url, init] = fetchImpl.mock.calls[0];
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://winstxnhdw-nllb-api.hf.space/api/v4/translator');
    expect(u.searchParams.get('text')).toBe('Hello friend');
    expect(u.searchParams.get('source')).toBe('eng_Latn');
    expect(u.searchParams.get('target')).toBe('kin_Latn');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('uses NLLB_API_URL when set, without a trailing slash problem', async () => {
    const fetchImpl = vi.fn(async () => json({ result: 'Bonjour' }));
    await translateText({ text: 'Hello', source: 'en', target: 'fr' }, { ...env, NLLB_API_URL: 'https://me-nllb-api.hf.space/' }, fetchImpl);
    expect(fetchImpl.mock.calls[0][0]).toContain('https://me-nllb-api.hf.space/api/v4/translator?');
  });

  it('rejects languages NLLB codes do not cover with 400', async () => {
    await expect(translateText({ text: 'hi', source: 'en', target: 'xx' }, env, vi.fn())).rejects.toMatchObject({ status: 400 });
  });

  it('maps an upstream error or bad shape to 502', async () => {
    const down = vi.fn(async () => json({ detail: 'Service Unavailable' }, 503));
    await expect(translateText({ text: 'hi', source: 'en', target: 'rw' }, env, down)).rejects.toMatchObject({ status: 502 });
    const weird = vi.fn(async () => json({ nope: 1 }));
    await expect(translateText({ text: 'hi', source: 'en', target: 'rw' }, env, weird)).rejects.toMatchObject({ status: 502 });
  });
});
