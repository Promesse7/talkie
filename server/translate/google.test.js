import { describe, it, expect, vi } from 'vitest';
import { translateText } from './index.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const env = { TRANSLATE_PROVIDER: 'google', GOOGLE_TRANSLATE_API_KEY: 'gkey' };
const googleOk = (text) => json({ data: { translations: [{ translatedText: text }] } });

describe('google provider', () => {
  it('posts q/source/target/format to the v2 endpoint with the key and returns translatedText', async () => {
    const fetchImpl = vi.fn(async () => googleOk('Muraho nshuti'));
    const out = await translateText({ text: 'Hello friend', source: 'en', target: 'rw' }, env, fetchImpl);
    expect(out).toEqual({ translatedText: 'Muraho nshuti', provider: 'google' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://translation.googleapis.com/language/translate/v2?key=gkey');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ q: 'Hello friend', source: 'en', target: 'rw', format: 'text' });
  });

  it('maps zh to zh-CN for Google', async () => {
    const fetchImpl = vi.fn(async () => googleOk('你好'));
    await translateText({ text: 'hello', source: 'en', target: 'zh' }, env, fetchImpl);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).target).toBe('zh-CN');
    await translateText({ text: '你好', source: 'zh', target: 'en' }, env, fetchImpl);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).source).toBe('zh-CN');
  });

  it('requires GOOGLE_TRANSLATE_API_KEY', async () => {
    await expect(
      translateText({ text: 'hi', source: 'en', target: 'rw' }, { TRANSLATE_PROVIDER: 'google' }, vi.fn())
    ).rejects.toMatchObject({ status: 500 });
  });

  it('maps a Google error to 502 with its message', async () => {
    const fetchImpl = vi.fn(async () => json({ error: { code: 403, message: 'API key not valid' } }, 403));
    await expect(translateText({ text: 'hi', source: 'en', target: 'rw' }, env, fetchImpl)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('API key not valid'),
    });
  });

  it('rejects an unexpected response shape with 502', async () => {
    const fetchImpl = vi.fn(async () => json({ data: {} }));
    await expect(translateText({ text: 'hi', source: 'en', target: 'rw' }, env, fetchImpl)).rejects.toMatchObject({ status: 502 });
  });
});
