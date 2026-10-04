import { useState } from 'react';
import { useTranslatedText } from '../../hooks/useTranslatedText.js';

export default function MessageBubble({ message, viewerId, viewerLang, chatId }) {
  const own = message.senderId === viewerId;
  const { text, original, isTranslated, pending } = useTranslatedText(message, viewerLang, viewerId, chatId);
  const [showOriginal, setShowOriginal] = useState(false);
  const seen = own && (message.seenBy ?? []).some((id) => id !== viewerId);

  return (
    <div className={`message ${own ? 'own' : ''}`}>
      <div className="texts">
        {message.mediaUrl && <img src={message.mediaUrl} alt="Shared media" />}
        {text && <p>{showOriginal ? original : text}</p>}
        <div className="meta">
          {pending && <span className="translating">Translating…</span>}
          {isTranslated && (
            <button type="button" className="toggle" onClick={() => setShowOriginal((v) => !v)}>
              {showOriginal ? 'Show translation' : 'Show original'}
            </button>
          )}
          {seen && <span>Seen</span>}
        </div>
      </div>
    </div>
  );
}
