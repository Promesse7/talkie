const STORAGE_KEY = 'talkie.translations.v1';
const MAX_ENTRIES = 300;
let cache = null;

function load() {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw))) cache.set(k, v);
  } catch { /* storage unavailable */ }
  return cache;
}

function persist() {
  try {
    const entries = [...cache.entries()].slice(-MAX_ENTRIES);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* ignore */ }
}

export const cacheKey = (text, source, target) => `${source}|${target}|${text}`;

export async function translate(text, source, target, fetchImpl = globalThis.fetch) {
  if (!text || !text.trim()) return '';
  if (!source || !target || source === target) return text;
  const store = load();
  const key = cacheKey(text, source, target);
  if (store.has(key)) return store.get(key);
  try {
    const res = await fetchImpl('/api/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
  if (!keepStorage) { try { globalThis.localStorage?.removeItem(STORAGE_KEY); } catch { /* ignore */ } }
}
