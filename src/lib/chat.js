export function chatIdFor(uidA, uidB) {
  if (!uidA || !uidB) throw new Error('chatIdFor requires two user ids');
  return [uidA, uidB].sort().join('_');
}

export function otherParticipant(chat, uid) {
  return (chat?.participants ?? []).find((p) => p !== uid);
}

export function blockFlags(me, them) {
  return {
    isReceiverBlocked: Boolean(me?.blocked?.includes(them?.id)),
    isCurrentUserBlocked: Boolean(them?.blocked?.includes(me?.id)),
  };
}

export function unseenMessagesFor(messages, uid) {
  return (messages ?? []).filter((m) => m.senderId !== uid && !(m.seenBy ?? []).includes(uid));
}

export function displayTextFor(message, myLang, viewerId) {
  const original = message?.text ?? '';
  const base = { text: original, original, isTranslated: false, needsTranslation: false };
  if (!original) return base;
  if (message.senderId === viewerId || !myLang || message.sourceLanguage === myLang) return base;
  const stored = message.translations?.[myLang];
  if (stored) return { ...base, text: stored, isTranslated: true };
  return { ...base, needsTranslation: true };
}
