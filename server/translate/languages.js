import { TranslateError } from './errors.js';

const NLLB = {
  en: 'eng_Latn',
  rw: 'kin_Latn',
  fr: 'fra_Latn',
  sw: 'swh_Latn',
  es: 'spa_Latn',
  pt: 'por_Latn',
  de: 'deu_Latn',
  ar: 'arb_Arab',
  zh: 'zho_Hans',
};

export function toNllbCode(iso) {
  const code = NLLB[String(iso).toLowerCase()];
  if (!code) throw new TranslateError(400, `Language "${iso}" is not supported by the NLLB provider`);
  return code;
}
