import { describe, it, expect } from 'vitest';
import { normalizeProfile, dedupeById, absorbDroppedMessages } from './chat.js';

describe('normalizeProfile', () => {
  it('fills a missing preferredLanguage and blocked list, keeps the rest', () => {
    expect(normalizeProfile({ id: 'u1', username: 'ann' })).toEqual({
      id: 'u1',
      username: 'ann',
      preferredLanguage: 'en',
      blocked: [],
    });
    expect(normalizeProfile({ id: 'u1', preferredLanguage: 'rw', blocked: ['x'] })).toMatchObject({
      preferredLanguage: 'rw',
      blocked: ['x'],
    });
  });
  it('returns null for null', () => {
    expect(normalizeProfile(null)).toBeNull();
  });
});

describe('dedupeById', () => {
  it('keeps the first occurrence of each id', () => {
    const out = dedupeById([{ id: 'a', v: 1 }, { id: 'b' }, { id: 'a', v: 2 }]);
    expect(out).toEqual([{ id: 'a', v: 1 }, { id: 'b' }]);
  });
});

describe('absorbDroppedMessages', () => {
  it('moves messages that fell out of the live window into older, in order, without duplicates', () => {
    const prevLive = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const nextLive = [{ id: '3' }, { id: '4' }, { id: '5' }];
    const older = [{ id: '0' }, { id: '1' }];
    expect(absorbDroppedMessages(prevLive, nextLive, older).map((m) => m.id)).toEqual(['0', '1', '2']);
  });
  it('returns older unchanged on the first snapshot or when nothing dropped', () => {
    const older = [{ id: '0' }];
    expect(absorbDroppedMessages(null, [{ id: '1' }], older)).toBe(older);
    expect(absorbDroppedMessages([{ id: '1' }], [{ id: '1' }, { id: '2' }], older)).toBe(older);
  });
});
