import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../lib/messages.js', () => ({ saveTranslation: vi.fn(() => Promise.resolve()) }));
vi.mock('../../../lib/translate.js', () => ({ translate: vi.fn(() => Promise.resolve(null)) }));

import { translate } from '../../../lib/translate.js';
import ChatPreview from './ChatPreview.jsx';

const them = { id: 'them', username: 'Prometheus', preferredLanguage: 'en' };

describe('ChatPreview', () => {
  it('invites a first message when the chat is empty', () => {
    render(<ChatPreview chat={{ id: 'c1', lastMessage: null, user: them }} viewerId="me" viewerLang="fr" />);
    expect(screen.getByText('Say hello')).toBeInTheDocument();
  });

  it("shows the other person's last message in my language when a translation exists", () => {
    const chat = {
      id: 'c1',
      user: them,
      lastMessage: { text: 'How is your day', senderId: 'them', sourceLanguage: 'en', translations: { fr: 'Comment va ta journée ?' } },
    };
    render(<ChatPreview chat={chat} viewerId="me" viewerLang="fr" />);
    expect(screen.getByText('Comment va ta journée ?')).toBeInTheDocument();
  });

  it('shows my own last message as I wrote it', () => {
    const chat = { id: 'c1', user: them, lastMessage: { text: 'Bonjour', senderId: 'me', sourceLanguage: 'fr', translations: { en: 'Hello' } } };
    render(<ChatPreview chat={chat} viewerId="me" viewerLang="fr" />);
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(translate).not.toHaveBeenCalled();
  });

  it("falls back to the other person's language when an old lastMessage has no sourceLanguage", async () => {
    translate.mockResolvedValueOnce('Comment va ta journée ?');
    const chat = { id: 'c1', user: them, lastMessage: { text: 'How is your day', senderId: 'them' } };
    render(<ChatPreview chat={chat} viewerId="me" viewerLang="fr" />);
    expect(await screen.findByText('Comment va ta journée ?')).toBeInTheDocument();
    expect(translate).toHaveBeenCalledWith('How is your day', 'en', 'fr');
  });
});
