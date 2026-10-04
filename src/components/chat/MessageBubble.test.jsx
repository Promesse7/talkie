import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/messages.js', () => ({ saveTranslation: vi.fn(() => Promise.resolve()) }));
vi.mock('../../lib/translate.js', () => ({ translate: vi.fn(() => Promise.resolve(null)) }));

import { translate } from '../../lib/translate.js';
import { saveTranslation } from '../../lib/messages.js';
import MessageBubble from './MessageBubble.jsx';

const base = {
  id: 'm1',
  senderId: 'them',
  text: 'Bonjour',
  sourceLanguage: 'fr',
  translations: { en: 'Hello' },
  seenBy: ['them'],
};

beforeEach(() => {
  translate.mockClear();
  saveTranslation.mockClear();
});

describe('MessageBubble', () => {
  it('shows the stored translation and can toggle to the original', () => {
    render(<MessageBubble message={base} viewerId="me" viewerLang="en" chatId="c" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show original/i }));
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(translate).not.toHaveBeenCalled();
  });

  it('shows my own message untranslated with no toggle', () => {
    render(<MessageBubble message={{ ...base, senderId: 'me' }} viewerId="me" viewerLang="en" chatId="c" />);
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('marks my message as seen only when the other person has seen it', () => {
    const { rerender } = render(
      <MessageBubble message={{ ...base, senderId: 'me', seenBy: ['me'] }} viewerId="me" viewerLang="en" chatId="c" />
    );
    expect(screen.queryByText('Seen')).toBeNull();
    rerender(
      <MessageBubble message={{ ...base, senderId: 'me', seenBy: ['me', 'them'] }} viewerId="me" viewerLang="en" chatId="c" />
    );
    expect(screen.getByText('Seen')).toBeInTheDocument();
  });

  it('falls back to on-the-fly translation and stores it when my language is missing', async () => {
    translate.mockResolvedValueOnce('Muraho');
    render(<MessageBubble message={base} viewerId="me" viewerLang="rw" chatId="c" />);
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Muraho')).toBeInTheDocument());
    expect(translate).toHaveBeenCalledWith('Bonjour', 'fr', 'rw');
    expect(saveTranslation).toHaveBeenCalledWith('c', 'm1', 'rw', 'Muraho');
  });

  it('keeps the original when translation fails', async () => {
    translate.mockResolvedValueOnce(null);
    render(<MessageBubble message={base} viewerId="me" viewerLang="rw" chatId="c" />);
    await waitFor(() => expect(translate).toHaveBeenCalled());
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(saveTranslation).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
