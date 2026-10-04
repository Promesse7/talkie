import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translate, _resetTranslationCache } from './translate.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => { _resetTranslationCache(); localStorage.clear(); });

describe('translate (client)', () => {
  it('skips the network when source equals target', async () => {
    const f = vi.fn();
    expect(await translate('hi', 'en', 'en', f)).toBe('hi');
    expect(f).not.toHaveBeenCalled();
  });
  it('posts to /api/translate and caches the result', async () => {
    const f = vi.fn(async () => ok({ translatedText: 'salut' }));
    expect(await translate('hi', 'en', 'fr', f)).toBe('salut');
    expect(await translate('hi', 'en', 'fr', f)).toBe('salut');
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ text: 'hi', source: 'en', target: 'fr' });
  });
  it('resolves null on HTTP failure', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ error: 'down' }) }));
    expect(await translate('hi', 'en', 'fr', f)).toBeNull();
  });
  it('resolves null on network failure', async () => {
    const f = vi.fn(async () => { throw new Error('offline'); });
    expect(await translate('hi', 'en', 'fr', f)).toBeNull();
  });
  it('restores cache from localStorage', async () => {
    const f = vi.fn(async () => ok({ translatedText: 'salut' }));
    await translate('hi', 'en', 'fr', f);
    _resetTranslationCache({ keepStorage: true });
    expect(await translate('hi', 'en', 'fr', vi.fn())).toBe('salut');
  });
});
