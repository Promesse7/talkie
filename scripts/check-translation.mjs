#!/usr/bin/env node
// Calls the configured translation provider directly (no browser, no Firebase) so you can
// confirm an API key works. Reads .env from the repo root.
//
//   npm run translate:check                      -> "Hello friend" en -> rw
//   npm run translate:check -- "Bonjour" fr en   -> custom text/source/target
import { readFileSync } from 'node:fs';
import { translateText } from '../server/translate/index.js';

function loadDotEnv(path = '.env') {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#')) env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env; rely on process.env */
  }
  return env;
}

const [text = 'Hello friend', source = 'en', target = 'rw'] = process.argv.slice(2);
const env = loadDotEnv();
console.log(`provider: ${env.TRANSLATE_PROVIDER || 'google'}   ${source} -> ${target}`);
console.log(`in : ${text}`);
try {
  const out = await translateText({ text, source, target }, env, fetch);
  console.log(`out: ${out.translatedText}   (${out.provider})`);
} catch (err) {
  console.error(`FAILED (${err.status ?? '?'}): ${err.message}`);
  process.exit(1);
}
