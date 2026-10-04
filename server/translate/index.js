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

const PROVIDERS = { libretranslate: libreTranslate, huggingface: huggingFace };

export async function translateText(body, env = {}, fetchImpl = globalThis.fetch) {
  const { text, source, target } = validate(body);
  if (!text.trim()) return { translatedText: '', provider: 'none' };
  if (source === target) return { translatedText: text, provider: 'none' };

  const providerName = String(env.TRANSLATE_PROVIDER || 'libretranslate').toLowerCase();
  if (providerName === 'none') return { translatedText: text, provider: 'none' };

  const provider = PROVIDERS[providerName];
  if (!provider) throw new TranslateError(500, `Unknown TRANSLATE_PROVIDER "${env.TRANSLATE_PROVIDER}"`);
  return provider({ text, source, target }, env, fetchImpl);
}
