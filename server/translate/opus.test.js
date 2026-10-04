import { describe, it, expect, vi } from 'vitest';
import { translateText } from './index.js';
import { opusRoute } from './opus.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const env = { TRANSLATE_PROVIDER: 'opus', HF_API_TOKEN: 't' };
const hf = (text) => json([{ translation_text: text }]);
const modelOf = (url) => url.replace('https://router.huggingface.co/hf-inference/models/', '');

describe('opusRoute (pure routing table)', () => {
  it('returns one bilingual hop for served English pairs', () => {
    expect(opusRoute('en', 'fr')).toEqual([{ model: 'Helsinki-NLP/opus-mt-en-fr', prefix: '' }]);
    expect(opusRoute('de', 'en')).toEqual([{ model: 'Helsinki-NLP/opus-mt-de-en', prefix: '' }]);
    expect(opusRoute('ar', 'en')).toEqual([{ model: 'Helsinki-NLP/opus-mt-tc-big-ar-en', prefix: '' }]);
    expect(opusRoute('en', 'pt')).toEqual([{ model: 'Helsinki-NLP/opus-mt-tc-big-en-pt', prefix: '>>por<< ' }]);
    expect(opusRoute('pt', 'en')).toEqual([{ model: 'Helsinki-NLP/opus-mt-ROMANCE-en', prefix: '' }]);
  });

  it('uses the multilingual models with a language token for Kinyarwanda', () => {
    expect(opusRoute('en', 'rw')).toEqual([{ model: 'Helsinki-NLP/opus-mt-en-mul', prefix: '>>kin<< ' }]);
    expect(opusRoute('rw', 'en')).toEqual([{ model: 'Helsinki-NLP/opus-mt-mul-en', prefix: '' }]);
  });

  it('pivots non-English pairs through English', () => {
    expect(opusRoute('fr', 'rw')).toEqual([
      { model: 'Helsinki-NLP/opus-mt-fr-en', prefix: '' },
      { model: 'Helsinki-NLP/opus-mt-en-mul', prefix: '>>kin<< ' },
    ]);
  });

  it('returns null for languages with no served model (Swahili)', () => {
    expect(opusRoute('en', 'sw')).toBeNull();
    expect(opusRoute('sw', 'rw')).toBeNull();
  });
});

describe('opus provider', () => {
  it('posts { inputs } with the bearer token to the routed model and returns translation_text', async () => {
    const fetchImpl = vi.fn(async () => hf('Bonjour ami'));
    const out = await translateText({ text: 'Hello friend', source: 'en', target: 'fr' }, env, fetchImpl);
    expect(out).toEqual({ translatedText: 'Bonjour ami', provider: 'opus' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(modelOf(url)).toBe('Helsinki-NLP/opus-mt-en-fr');
    expect(init.headers.Authorization).toBe('Bearer t');
    expect(JSON.parse(init.body)).toEqual({ inputs: 'Hello friend' });
  });

  it('prefixes the Kinyarwanda language token for en -> rw', async () => {
    const fetchImpl = vi.fn(async () => hf('Muraho'));
    await translateText({ text: 'Hello', source: 'en', target: 'rw' }, env, fetchImpl);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ inputs: '>>kin<< Hello' });
  });

  it('pivots fr -> rw through English with two calls, feeding the first result into the second', async () => {
    const fetchImpl = vi.fn(async (url) =>
      modelOf(url) === 'Helsinki-NLP/opus-mt-fr-en' ? hf('Hello friend') : hf('Muraho nshuti')
    );
    const out = await translateText({ text: 'Bonjour ami', source: 'fr', target: 'rw' }, env, fetchImpl);
    expect(out).toEqual({ translatedText: 'Muraho nshuti', provider: 'opus' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body)).toEqual({ inputs: '>>kin<< Hello friend' });
  });

  it('rejects Swahili with 400 and never calls the API', async () => {
    const fetchImpl = vi.fn();
    await expect(translateText({ text: 'hi', source: 'en', target: 'sw' }, env, fetchImpl)).rejects.toMatchObject({ status: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('requires HF_API_TOKEN', async () => {
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, { TRANSLATE_PROVIDER: 'opus' }, vi.fn())).rejects.toMatchObject({ status: 500 });
  });

  it('maps an upstream failure or odd shape to 502', async () => {
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, env, vi.fn(async () => json({ error: 'loading' }, 503)))).rejects.toMatchObject({ status: 502 });
    await expect(translateText({ text: 'hi', source: 'en', target: 'fr' }, env, vi.fn(async () => json({ nope: 1 })))).rejects.toMatchObject({ status: 502 });
  });
});
