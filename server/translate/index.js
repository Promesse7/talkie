import { TranslateError } from './errors.js';
import { toNllbCode } from './languages.js';

export { TranslateError };

const MAX_TEXT_LENGTH = 2000;
const LANG_RE = /^[a-z]{2,3}$/i;
const DEFAULT_LIBRETRANSLATE_URL = 'https://libretranslate.com';
const DEFAULT_HF_API_URL = 'https://router.huggingface.co/hf-inference/models';
const DEFAULT_HF_MODEL = 'facebook/nllb-200-distilled-600M';

function validate(body) {
  if (!body || typeof body !== 'object') throw new TranslateError(400, 'Request body must be a JSON object');
  const { text, source, target } = body;
  if (typeof text !== 'string') throw new TranslateError(400, '"text" must be a string');
  if (text.length > MAX_TEXT_LENGTH) throw new TranslateError(400, `"text" must be at most ${MAX_TEXT_LENGTH} characters`);
  if (typeof source !== 'string' || !LANG_RE.test(source)) throw new TranslateError(400, '"source" must be a 2-3 letter language code');
  if (typeof target !== 'string' || !LANG_RE.test(target)) throw new TranslateError(400, '"target" must be a 2-3 letter language code');
  return { text, source: source.toLowerCase(), target: target.toLowerCase() };
}

async function safeFetch(fetchImpl, url, init) {
  let res;
  try {
    res = await fetchImpl(url, init);
  } catch (err) {
    throw new TranslateError(502, `Translation provider unreachable: ${err?.message ?? err}`);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.error?.message ?? data?.error ?? data?.message ?? `HTTP ${res.status}`;
    throw new TranslateError(502, `Translation provider error: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return data;
}

async function libreTranslate({ text, source, target }, env, fetchImpl) {
  const base = (env.LIBRETRANSLATE_URL || DEFAULT_LIBRETRANSLATE_URL).replace(/\/+$/, '');
  const payload = { q: text, source, target, format: 'text' };
  if (env.LIBRETRANSLATE_API_KEY) payload.api_key = env.LIBRETRANSLATE_API_KEY;
  const data = await safeFetch(fetchImpl, `${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (typeof data?.translatedText !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: data.translatedText, provider: 'libretranslate' };
}

async function huggingFace({ text, source, target }, env, fetchImpl) {
  const token = env.HF_API_TOKEN;
  if (!token) throw new TranslateError(500, 'HF_API_TOKEN is not configured');
  const model = env.HF_MODEL || DEFAULT_HF_MODEL;
  const base = (env.HF_API_URL || DEFAULT_HF_API_URL).replace(/\/+$/, '');
  const src_lang = toNllbCode(source);
  const tgt_lang = toNllbCode(target);
  const data = await safeFetch(fetchImpl, `${base}/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: text,
      parameters: { src_lang, tgt_lang },
      options: { wait_for_model: true },
    }),
  });
  const first = Array.isArray(data) ? data[0] : data;
  if (typeof first?.translation_text !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: first.translation_text, provider: 'huggingface' };
}

// Google Cloud Translation v2 (basic) with an API key. Supports every Talkie language,
// including Kinyarwanda and Swahili; the first 500k characters per month are free.
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_LANG_ALIASES = { zh: 'zh-CN' };
const toGoogleCode = (code) => GOOGLE_LANG_ALIASES[code] ?? code;

async function googleTranslate({ text, source, target }, env, fetchImpl) {
  const key = env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new TranslateError(500, 'GOOGLE_TRANSLATE_API_KEY is not configured');
  const data = await safeFetch(fetchImpl, `${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: toGoogleCode(source), target: toGoogleCode(target), format: 'text' }),
  });
  const translated = data?.data?.translations?.[0]?.translatedText;
  if (typeof translated !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: translated, provider: 'google' };
}

// nllb-api (github.com/winstxnhdw/nllb-api): real NLLB-200 1.3B on CPU, free to self-host on a
// Hugging Face Space (no card needed). No API key. Languages use FLORES-200 codes.
const DEFAULT_NLLB_API_URL = 'https://winstxnhdw-nllb-api.hf.space';

async function nllbApi({ text, source, target }, env, fetchImpl) {
  const base = (env.NLLB_API_URL || DEFAULT_NLLB_API_URL).replace(/\/+$/, '');
  const params = new URLSearchParams({ text, source: toNllbCode(source), target: toNllbCode(target) });
  const data = await safeFetch(fetchImpl, `${base}/api/v4/translator?${params}`, { method: 'GET' });
  if (typeof data?.result !== 'string') throw new TranslateError(502, 'Translation provider returned an unexpected response');
  return { translatedText: data.result.trim(), provider: 'nllb' };
}

const PROVIDERS = {
  nllb: nllbApi,
  google: googleTranslate,
  libretranslate: libreTranslate,
  huggingface: huggingFace,
};

export async function translateText(body, env = {}, fetchImpl = globalThis.fetch) {
  const { text, source, target } = validate(body);
  if (!text.trim()) return { translatedText: '', provider: 'none' };
  if (source === target) return { translatedText: text, provider: 'none' };

  const providerName = String(env.TRANSLATE_PROVIDER || 'nllb').toLowerCase();
  if (providerName === 'none') return { translatedText: text, provider: 'none' };

  const provider = PROVIDERS[providerName];
  if (!provider) throw new TranslateError(500, `Unknown TRANSLATE_PROVIDER "${env.TRANSLATE_PROVIDER}"`);
  return provider({ text, source, target }, env, fetchImpl);
}
