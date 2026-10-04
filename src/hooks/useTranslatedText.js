import { useEffect, useState } from 'react';
import { displayTextFor } from '../lib/chat.js';
import { translate } from '../lib/translate.js';
import { saveTranslation } from '../lib/messages.js';

/**
 * Decide what text a viewer sees for a message. Uses a stored translation when one
 * exists for the viewer's language; otherwise fetches one, shows it, and stores it on
 * the message so the next reader (or device) gets it for free.
 */
export function useTranslatedText(message, myLang, viewerId, chatId) {
  const base = displayTextFor(message, myLang, viewerId);
  const [fetched, setFetched] = useState(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFetched(null);
    if (!base.needsTranslation) {
      setPending(false);
      return undefined;
    }
    setPending(true);
    translate(message.text, message.sourceLanguage, myLang).then((result) => {
      if (cancelled) return;
      setPending(false);
      if (result && result !== message.text) {
        setFetched(result);
        if (chatId && message.id) {
          saveTranslation(chatId, message.id, myLang, result).catch(() => {});
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // base.needsTranslation is derived from these inputs.
  }, [message.id, message.text, message.sourceLanguage, myLang, base.needsTranslation, chatId]);

  if (fetched) {
    return { ...base, text: fetched, isTranslated: true, needsTranslation: false, pending: false };
  }
  return { ...base, pending };
}
