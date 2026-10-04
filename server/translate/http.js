import { TranslateError } from './errors.js';

const DEFAULT_TIMEOUT_MS = 8000;

export function timeoutMs(env = {}) {
  const n = Number(env.TRANSLATE_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

/**
 * fetch + JSON with the failure modes every provider shares mapped to TranslateError:
 * unreachable -> 502, timeout -> 504, non-2xx -> 502 (with the provider's message).
 */
export async function safeFetch(fetchImpl, url, init = {}, env = {}) {
  const ms = timeoutMs(env);
  const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(ms) : undefined;
  let res;
  try {
    res = await fetchImpl(url, { ...init, signal });
  } catch (err) {
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      throw new TranslateError(504, `Translation provider timed out after ${ms}ms`);
    }
    throw new TranslateError(502, `Translation provider unreachable: ${err?.message ?? err}`);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.error?.message ?? data?.error ?? data?.detail ?? data?.message ?? `HTTP ${res.status}`;
    throw new TranslateError(
      502,
      `Translation provider error: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`
    );
  }
  return data;
}
