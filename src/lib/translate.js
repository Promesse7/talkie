const STORAGE_KEY = 'talkie.translations.v1';
const MAX_ENTRIES = 300;
let cache = null;
let authTokenProvider = null;

/**
 * Register a function that resolves the signed-in user's Firebase ID token.
 * The translation API only serves signed-in users. Pass null to clear.
 */
export function setAuthTokenProvider(provider) {
  authTokenProvider = typeof provider === 'function' ? provider : null;
}

function load() {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw))) cache.set(k, v);
  } catch {
    /* storage unavailable */
  }
  return cache;
}

function persist() {
  try {
    const entries = [...cache.entries()].slice(-MAX_ENTRIES);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

export const cacheKey = (text, source, target) => `${source}|${target}|${text}`;

async function authHeaders() {
  if (!authTokenProvider) return {};
  try {
    const token = await authTokenProvider();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Translate `text` from `source` to `target` via /api/translate.
 * Resolves the translated string, or null when translation is unavailable so callers
 * can fall back to the original text. Results are cached in memory and localStorage.
 */
export async function translate(text, source, target, fetchImpl = globalThis.fetch) {
  if (!text || !text.trim()) return '';
  if (!source || !target || source === target) return text;
  const store = load();
  const key = cacheKey(text, source, target);
  if (store.has(key)) return store.get(key);
  try {
    const res = await fetchImpl('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ text, source, target }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.translatedText !== 'string') return null;
    store.set(key, data.translatedText);
    persist();
    return data.translatedText;
  } catch {
    return null;
  }
}

export function _resetTranslationCache({ keepStorage = false } = {}) {
  cache = null;
  if (!keepStorage) {
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
