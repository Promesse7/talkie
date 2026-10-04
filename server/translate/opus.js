import { TranslateError } from './errors.js';
import { safeFetch } from './http.js';

/**
 * Hugging Face's free inference API serves no NLLB model, but it does serve the bilingual
 * Helsinki-NLP opus-mt models (verified live 2026-10-05). This provider routes each
 * language pair to a served model and pivots through English when no direct model exists.
 * Quality is below NLLB, especially for Kinyarwanda, which only the multilingual
 * opus-mt-en-mul / opus-mt-mul-en models cover. Swahili has no served model.
 */
const HF = 'Helsinki-NLP/';
const DEFAULT_HF_API_URL = 'https://router.huggingface.co/hf-inference/models';

const TO_EN = {
  fr: 'opus-mt-fr-en',
  es: 'opus-mt-es-en',
  de: 'opus-mt-de-en',
  ar: 'opus-mt-tc-big-ar-en',
  zh: 'opus-mt-zh-en',
  pt: 'opus-mt-ROMANCE-en',
  rw: 'opus-mt-mul-en',
};

// [model, input prefix]. Multi-target models need a ">>lang<<" token in front of the text.
const FROM_EN = {
  fr: ['opus-mt-en-fr', ''],
  es: ['opus-mt-en-es', ''],
  de: ['opus-mt-en-de', ''],
  ar: ['opus-mt-en-ar', ''],
  zh: ['opus-mt-en-zh', ''],
  pt: ['opus-mt-tc-big-en-pt', '>>por<< '],
  rw: ['opus-mt-en-mul', '>>kin<< '],
};

/** Ordered hops for a pair, or null when a language has no served model. */
export function opusRoute(source, target) {
  if (source === target) return [];
  const hops = [];
  if (source !== 'en') {
    const model = TO_EN[source];
    if (!model) return null;
    hops.push({ model: HF + model, prefix: '' });
  }
  if (target !== 'en') {
    const entry = FROM_EN[target];
    if (!entry) return null;
    hops.push({ model: HF + entry[0], prefix: entry[1] });
  }
  return hops;
}

export async function opusTranslate({ text, source, target }, env, fetchImpl) {
  const token = env.HF_API_TOKEN;
  if (!token) throw new TranslateError(500, 'HF_API_TOKEN is not configured');
  const hops = opusRoute(source, target);
  if (!hops) {
    throw new TranslateError(400, `No free opus-mt model covers ${source} -> ${target}`);
  }
  const base = (env.HF_API_URL || DEFAULT_HF_API_URL).replace(/\/+$/, '');

  let current = text;
  for (const { model, prefix } of hops) {
    const data = await safeFetch(
      fetchImpl,
      `${base}/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true',
        },
        body: JSON.stringify({ inputs: prefix + current }),
      },
      env
    );
    const first = Array.isArray(data) ? data[0] : data;
    if (typeof first?.translation_text !== 'string') {
      throw new TranslateError(502, 'Translation provider returned an unexpected response');
    }
    current = first.translation_text.trim();
  }
  return { translatedText: current, provider: 'opus' };
}
