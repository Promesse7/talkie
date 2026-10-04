import { TranslateError } from './errors.js';
import { toNllbCode } from './languages.js';
import { safeFetch } from './http.js';
import { opusTranslate } from './opus.js';

export { TranslateError };

const MAX_TEXT_LENGTH = 2000;
const LANG_RE = /^[a-z]{2,3}$/i;
const DEFAULT_PROVIDER = 'nllb';
const DEFAULT_LIBRETRANSLATE_URL = 'https://libretranslate.com';
const DEFAULT_HF_API_URL = 'https://router.huggingface.co/hf-inference/models';
const DEFAULT_HF_MODEL = 'facebook/nllb-200-distilled-600M';
const DEFAULT_NLLB_API_URL = 'https://winstxnhdw-nllb-api.hf.space';
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_LANG_ALIASES = { zh: 'zh-CN' };

function validate(body) {
  if (!body || typeof body !== 'object') throw new TranslateError(400, 'Request body must be a JSON object');
  const { text, source, target } = body;
  if (typeof text !== 'string') throw new TranslateError(400, '"text" must be a string');
  if (text.length > MAX_TEXT_LENGTH) throw new TranslateError(400, `"text" must be at most ${MAX_TEXT_LENGTH} characters`);
  if (typeof source !== 'string' || !LANG_RE.test(source)) throw new TranslateError(400, '"source" must be a 2-3 letter language code');
  if (typeof target !== 'string' || !LANG_RE.test(target)) throw new TranslateError(400, '"target" must be a 2-3 letter language code');
  return { text, source: source.toLowerCase(), target: target.toLowerCase() };
}

// nllb-api (github.com/winstxnhdw/nllb-api): real NLLB-200 1.3B on CPU. No API key.
async function nllbApi({ text, source, target }, env, fetchImpl) {
  const base = (env.NLLB_API_URL || DEFAULT_NLLB_API_URL).replace(/\/+$/, '');
  const params = new URLSearchParams({ text, source: toNllbCode(source), target: toNllbCode(target) });
  const data = await safeFetch(fetchImpl, `${base}/api/v4/translator?${params}`, { method: 'GET' }, env);
  if (typeof data?.result !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: data.result.trim(), provider: 'nllb' };
}

// Google Cloud Translation v2 (basic) with an API key; first 500k chars/month free.
const toGoogleCode = (code) => GOOGLE_LANG_ALIASES[code] ?? code;
async function googleTranslate({ text, source, target }, env, fetchImpl) {
  const key = env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new TranslateError(500, 'GOOGLE_TRANSLATE_API_KEY is not configured');
  const data = await safeFetch(
    fetchImpl,
    `${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: toGoogleCode(source), target: toGoogleCode(target), format: 'text' }),
    },
    env
  );
  const translated = data?.data?.translations?.[0]?.translatedText;
  if (typeof translated !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: translated, provider: 'google' };
}

async function libreTranslate({ text, source, target }, env, fetchImpl) {
  const base = (env.LIBRETRANSLATE_URL || DEFAULT_LIBRETRANSLATE_URL).replace(/\/+$/, '');
  const payload = { q: text, source, target, format: 'text' };
  if (env.LIBRETRANSLATE_API_KEY) payload.api_key = env.LIBRETRANSLATE_API_KEY;
  const data = await safeFetch(
    fetchImpl,
    `${base}/translate`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    env
  );
  if (typeof data?.translatedText !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: data.translatedText, provider: 'libretranslate' };
}

// Any NLLB model behind a Hugging Face Inference Endpoint (paid) or compatible server.
async function huggingFace({ text, source, target }, env, fetchImpl) {
  const token = env.HF_API_TOKEN;
  if (!token) throw new TranslateError(500, 'HF_API_TOKEN is not configured');
  const model = env.HF_MODEL || DEFAULT_HF_MODEL;
  const base = (env.HF_API_URL || DEFAULT_HF_API_URL).replace(/\/+$/, '');
  const src_lang = toNllbCode(source);
  const tgt_lang = toNllbCode(target);
  const data = await safeFetch(
    fetchImpl,
    `${base}/${model}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text, parameters: { src_lang, tgt_lang }, options: { wait_for_model: true } }),
    },
    env
  );
  const first = Array.isArray(data) ? data[0] : data;
  if (typeof first?.translation_text !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: first.translation_text, provider: 'huggingface' };
}

const PROVIDERS = {
  nllb: nllbApi,
  opus: opusTranslate,
  google: googleTranslate,
  libretranslate: libreTranslate,
  huggingface: huggingFace,
};

function resolveProvider(name, label) {
  const key = String(name).toLowerCase();
  const provider = PROVIDERS[key];
  if (!provider) throw new TranslateError(500, `Unknown ${label} "${name}"`);
  return { key, provider };
}

/**
 * The fallback runs only when the primary fails on its side (5xx: unreachable, timed out,
 * provider error). Bad input (4xx) is never retried. When no fallback is named, `opus` is
 * used automatically if an HF_API_TOKEN is present, because it needs nothing else.
 */
function resolveFallback(env, primaryKey) {
  const named = env.TRANSLATE_FALLBACK_PROVIDER && String(env.TRANSLATE_FALLBACK_PROVIDER).toLowerCase();
  if (named === 'none') return null;
  const key = named || (env.HF_API_TOKEN ? 'opus' : null);
  if (!key || key === primaryKey) return null;
  return resolveProvider(key, 'TRANSLATE_FALLBACK_PROVIDER');
}

export async function translateText(body, env = {}, fetchImpl = globalThis.fetch) {
  const { text, source, target } = validate(body);
  if (!text.trim()) return { translatedText: '', provider: 'none' };
  if (source === target) return { translatedText: text, provider: 'none' };

  const primaryName = env.TRANSLATE_PROVIDER || DEFAULT_PROVIDER;
  if (String(primaryName).toLowerCase() === 'none') return { translatedText: text, provider: 'none' };

  const primary = resolveProvider(primaryName, 'TRANSLATE_PROVIDER');
  const fallback = resolveFallback(env, primary.key);
  const input = { text, source, target };

  try {
    return await primary.provider(input, env, fetchImpl);
  } catch (err) {
    const retryable = err instanceof TranslateError && err.status >= 500;
    if (!fallback || !retryable) throw err;
    try {
      return await fallback.provider(input, env, fetchImpl);
    } catch (err2) {
      const status = err2 instanceof TranslateError ? err2.status : 502;
      throw new TranslateError(
        status,
        `${primary.key} failed (${err.message}); ${fallback.key} failed (${err2.message})`
      );
    }
  }
}
