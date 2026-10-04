import { describe, it, expect } from 'vitest';
import { chatIdFor, otherParticipant, blockFlags, unseenMessagesFor, displayTextFor } from './chat.js';

describe('chatIdFor', () => {
  it('is independent of argument order', () => {
    expect(chatIdFor('b', 'a')).toBe('a_b');
    expect(chatIdFor('a', 'b')).toBe('a_b');
  });
  it('throws when an id is missing', () => {
    expect(() => chatIdFor('a', undefined)).toThrow();
  });
});

describe('otherParticipant', () => {
  it('returns the id that is not mine', () => {
    expect(otherParticipant({ participants: ['me', 'them'] }, 'me')).toBe('them');
  });
});

describe('blockFlags', () => {
  it('derives both directions from the blocked arrays', () => {
    const me = { id: 'me', blocked: ['them'] };
    const them = { id: 'them', blocked: [] };
    expect(blockFlags(me, them)).toEqual({ isReceiverBlocked: true, isCurrentUserBlocked: false });
    expect(blockFlags(them, me)).toEqual({ isReceiverBlocked: false, isCurrentUserBlocked: true });
  });
  it('is false when profiles are missing', () => {
    expect(blockFlags(null, undefined)).toEqual({ isReceiverBlocked: false, isCurrentUserBlocked: false });
  });
});

describe('unseenMessagesFor', () => {
  it('returns only messages from others that I have not seen', () => {
    const msgs = [
      { id: '1', senderId: 'me', seenBy: ['me'] },
      { id: '2', senderId: 'them', seenBy: ['them'] },
      { id: '3', senderId: 'them', seenBy: ['them', 'me'] },
      { id: '4', senderId: 'them' },
    ];
    expect(unseenMessagesFor(msgs, 'me').map((m) => m.id)).toEqual(['2', '4']);
  });
});

describe('displayTextFor', () => {
  const msg = { senderId: 'them', text: 'Bonjour', sourceLanguage: 'fr', translations: { en: 'Hello' } };
  it('shows my own messages untranslated', () => {
    expect(displayTextFor({ ...msg, senderId: 'me' }, 'en', 'me')).toMatchObject({ text: 'Bonjour', isTranslated: false, needsTranslation: false });
  });
  it('shows the original when languages match', () => {
    expect(displayTextFor(msg, 'fr', 'me')).toMatchObject({ text: 'Bonjour', isTranslated: false, needsTranslation: false });
  });
  it('uses a stored translation for my language', () => {
    expect(displayTextFor(msg, 'en', 'me')).toMatchObject({ text: 'Hello', original: 'Bonjour', isTranslated: true, needsTranslation: false });
  });
  it('flags a missing translation for my language', () => {
    expect(displayTextFor(msg, 'rw', 'me')).toMatchObject({ text: 'Bonjour', isTranslated: false, needsTranslation: true });
  });
  it('handles media-only messages', () => {
    expect(displayTextFor({ senderId: 'them', mediaUrl: 'x' }, 'en', 'me')).toMatchObject({ text: '', needsTranslation: false });
  });
});
