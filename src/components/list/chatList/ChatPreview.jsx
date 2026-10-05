import { useTranslatedText } from '../../../hooks/useTranslatedText.js';

/**
 * The last-message line in the chat list, shown in the viewer's language the same way the
 * bubbles are. Older chat documents may lack lastMessage.sourceLanguage; since a message I
 * did not send came from the other participant, their language is the right fallback.
 */
export default function ChatPreview({ chat, viewerId, viewerLang }) {
  const last = chat.lastMessage;
  const message = last
    ? {
        id: `${chat.id}:last`,
        text: last.text ?? '',
        senderId: last.senderId,
        sourceLanguage: last.sourceLanguage ?? chat.user?.preferredLanguage,
        translations: last.translations ?? {},
      }
    : { id: `${chat.id}:none`, text: '' };
  // No chatId: a preview never writes translations back to Firestore.
  const { text } = useTranslatedText(message, viewerLang, viewerId, null);
  return <p>{last ? text || 'Photo' : 'Say hello'}</p>;
}
