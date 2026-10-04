import { describe, it, expect, vi } from 'vitest';
import { translateText, TranslateError } from './index.js';
import { toNllbCode } from './languages.js';

const jsonResponse = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

describe('translateText short-circuits', () => {
  it('returns the text when source equals target without calling fetch', async () => {
    const fetchImpl = vi.fn();
    const out = await translateText({ text: 'hi', source: 'en', target: 'en' }, {}, fetchImpl);
    expect(out).toEqual({ translatedText: 'hi', provider: 'none' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('returns empty for blank text', async () => {
    expect(await translateText({ text: '   ', source: 'en', target: 'fr' }, {}, vi.fn())).toEqual({ translatedText: '', provider: 'none' });
  });
  it('provider none echoes the text', async () => {
    expect(await translateText({ text: 'hi', source: 'en', target: 'fr' }, { TRANSLATE_PROVIDER: 'none' }, vi.fn())).toEqual({ translatedText: 'hi', provider: 'none' });
  });
});

describe('validation', () => {
  it('rejects non-string text with 400', async () => {
    await expect(translateText({ text: 5, source: 'en', target: 'fr' }, {}, vi.fn())).rejects.toMatchObject({ status: 400 });
  });
  it('rejects text over 2000 chars', async () => {
    await expect(translateText({ text: 'a'.repeat(2001), source: 'en', target: 'fr' }, {}, vi.fn())).rejects.toMatchObject({ status: 400 });
  });
  it('rejects bad language codes', async () => {
    await expect(translateText({ text: 'hi', source: 'english', target: 'fr' }, {}, vi.fn())).rejects.toMatchObject({ status: 400 });
  });
  it('rejects unknown provider with 500', async () => {
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, { TRANSLATE_PROVIDER: 'nope' }, vi.fn())).rejects.toMatchObject({ status: 500 });
  });
});

describe('libretranslate provider', () => {
  it('posts q/source/target and returns translatedText', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ translatedText: 'salut' }));
    const out = await translateText({ text: 'hi', source: 'en', target: 'fr' }, { TRANSLATE_PROVIDER: 'libretranslate', LIBRETRANSLATE_URL: 'https://lt.example/', LIBRETRANSLATE_API_KEY: 'k' }, fetchImpl);
    expect(out).toEqual({ translatedText: 'salut', provider: 'libretranslate' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://lt.example/translate');
    expect(JSON.parse(init.body)).toEqual({ q: 'hi', source: 'en', target: 'fr', format: 'text', api_key: 'k' });
  });
  it('maps provider failure to 502', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'quota' }, 429));
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, { TRANSLATE_PROVIDER: 'libretranslate' }, fetchImpl)).rejects.toMatchObject({ status: 502 });
  });
  it('maps network failure to 502', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, { TRANSLATE_PROVIDER: 'libretranslate' }, fetchImpl)).rejects.toBeInstanceOf(TranslateError);
  });
});

describe('huggingface provider', () => {
  const env = { TRANSLATE_PROVIDER: 'huggingface', HF_API_TOKEN: 't' };
  it('requires a token', async () => {
    await expect(translateText({ text: 'hi', source: 'en', target: 'rw' }, { TRANSLATE_PROVIDER: 'huggingface' }, vi.fn())).rejects.toMatchObject({ status: 500 });
  });
  it('sends NLLB codes and reads translation_text', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([{ translation_text: 'Muraho' }]));
    const out = await translateText({ text: 'Hello', source: 'en', target: 'rw' }, env, fetchImpl);
    expect(out).toEqual({ translatedText: 'Muraho', provider: 'huggingface' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('facebook/nllb-200-distilled-600M');
    expect(init.headers.Authorization).toBe('Bearer t');
    expect(JSON.parse(init.body).parameters).toEqual({ src_lang: 'eng_Latn', tgt_lang: 'kin_Latn' });
  });
  it('rejects unsupported languages for NLLB with 400', async () => {
    await expect(translateText({ text: 'hi', source: 'en', target: 'xx' }, env, vi.fn())).rejects.toMatchObject({ status: 400 });
  });
});

describe('toNllbCode', () => {
  it('maps supported codes', () => { expect(toNllbCode('rw')).toBe('kin_Latn'); expect(toNllbCode('zh')).toBe('zho_Hans'); });
  it('throws on unknown', () => { expect(() => toNllbCode('xx')).toThrow(); });
});

describe('default provider', () => {
  it('is nllb, which needs no key', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ result: 'Muraho' }) }));
    await expect(translateText({ text: 'hi', source: 'en', target: 'rw' }, {}, fetchImpl)).resolves.toEqual({ translatedText: 'Muraho', provider: 'nllb' });
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/v4/translator?');
  });
});
