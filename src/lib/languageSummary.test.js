import { describe, it, expect } from 'vitest';
import { languageSummary } from './chat.js';

describe('languageSummary', () => {
  it('names both readers so the line cannot be mistaken for the viewer alone', () => {
    const me = { id: 'me', username: 'PromSystems', preferredLanguage: 'fr' };
    const them = { id: 'them', username: 'Prometheus', preferredLanguage: 'en' };
    expect(languageSummary(me, them)).toBe('You read in French · Prometheus reads in English');
  });

  it('says so plainly when both read the same language', () => {
    const me = { id: 'me', username: 'A', preferredLanguage: 'en' };
    const them = { id: 'them', username: 'B', preferredLanguage: 'en' };
    expect(languageSummary(me, them)).toBe('You both read in English');
  });

  it('copes with a missing profile', () => {
    expect(languageSummary(null, { username: 'B', preferredLanguage: 'rw' })).toBe('B reads in Kinyarwanda');
  });
});
