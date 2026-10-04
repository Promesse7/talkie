import { describe, it, expect } from 'vitest';
import { isLegacyChat, legacyMessageToV2 } from './legacy.mjs';

describe('isLegacyChat', () => {
  it('is true only when a messages array is present', () => {
    expect(isLegacyChat({ messages: [] })).toBe(true);
    expect(isLegacyChat({ messages: [{ text: 'x' }] })).toBe(true);
    expect(isLegacyChat({ participants: ['a', 'b'], lastMessage: null })).toBe(false);
    expect(isLegacyChat({})).toBe(false);
  });
});

describe('legacyMessageToV2', () => {
  it('maps text, img and isSeen, and omits empty fields', () => {
    const out = legacyMessageToV2({ senderId: 'a', text: 'hi', isSeen: true, createdAt: 't' }, ['a', 'b']);
    expect(out).toEqual({
      senderId: 'a',
      text: 'hi',
      createdAt: 't',
      sourceLanguage: 'en',
      translations: {},
      seenBy: ['a', 'b'],
    });
    const img = legacyMessageToV2({ senderId: 'b', img: 'u', isSeen: false, createdAt: 't' }, ['a', 'b']);
    expect(img).toEqual({
      senderId: 'b',
      mediaUrl: 'u',
      createdAt: 't',
      sourceLanguage: 'en',
      translations: {},
      seenBy: ['b'],
    });
    expect('text' in img).toBe(false);
  });
});
