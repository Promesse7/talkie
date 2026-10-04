import { describe, it, expect, vi } from 'vitest';
import { translateText } from './index.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const isNllb = (url) => url.includes('/api/v4/translator');
const isHf = (url) => url.includes('router.huggingface.co');

describe('fallback provider chain', () => {
  const env = { TRANSLATE_PROVIDER: 'nllb', TRANSLATE_FALLBACK_PROVIDER: 'opus', HF_API_TOKEN: 't' };

  it('uses the primary when it works', async () => {
    const fetchImpl = vi.fn(async () => json({ result: 'Muraho' }));
    const out = await translateText({ text: 'Hello', source: 'en', target: 'rw' }, env, fetchImpl);
    expect(out).toEqual({ translatedText: 'Muraho', provider: 'nllb' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back when the primary returns a server error', async () => {
    const fetchImpl = vi.fn(async (url) =>
      isNllb(url) ? json({ detail: 'sleeping' }, 503) : json([{ translation_text: 'Muraho (opus)' }])
    );
    const out = await translateText({ text: 'Hello', source: 'en', target: 'rw' }, env, fetchImpl);
    expect(out).toEqual({ translatedText: 'Muraho (opus)', provider: 'opus' });
    expect(fetchImpl.mock.calls.some(([u]) => isHf(u))).toBe(true);
  });

  it('falls back when the primary is unreachable', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (isNllb(url)) throw new Error('ECONNRESET');
      return json([{ translation_text: 'Bonjour' }]);
    });
    await expect(translateText({ text: 'Hello', source: 'en', target: 'fr' }, env, fetchImpl)).resolves.toEqual({
      translatedText: 'Bonjour',
      provider: 'opus',
    });
  });

  it('falls back when the primary exceeds TRANSLATE_TIMEOUT_MS', async () => {
    const fetchImpl = vi.fn((url, init) => {
      if (isNllb(url)) {
        return new Promise((_, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      }
      return Promise.resolve(json([{ translation_text: 'Bonjour' }]));
    });
    const out = await translateText({ text: 'Hello', source: 'en', target: 'fr' }, { ...env, TRANSLATE_TIMEOUT_MS: '20' }, fetchImpl);
    expect(out.provider).toBe('opus');
  });

  it('does not fall back on a 400 from the primary (bad input is bad input)', async () => {
    const fetchImpl = vi.fn(async () => json({ result: 'x' }));
    await expect(translateText({ text: 'hi', source: 'en', target: 'xx' }, env, fetchImpl)).rejects.toMatchObject({ status: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports the fallback error when both fail', async () => {
    const fetchImpl = vi.fn(async () => json({ error: 'down' }, 503));
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, env, fetchImpl)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('nllb'),
    });
  });

  it('propagates the primary error when no fallback is configured', async () => {
    const fetchImpl = vi.fn(async () => json({ error: 'down' }, 503));
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, { TRANSLATE_PROVIDER: 'nllb' }, fetchImpl)).rejects.toMatchObject({ status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('defaults the fallback to opus when HF_API_TOKEN is set and no fallback is named', async () => {
    const fetchImpl = vi.fn(async (url) =>
      isNllb(url) ? json({ detail: 'sleeping' }, 503) : json([{ translation_text: 'Bonjour' }])
    );
    const out = await translateText({ text: 'Hello', source: 'en', target: 'fr' }, { HF_API_TOKEN: 't' }, fetchImpl);
    expect(out.provider).toBe('opus');
  });
});
