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

const DEFAULT_PROFILE_LANGUAGE = 'en';

/** Fill in fields older profiles may lack so the rest of the app can rely on them. */
export function normalizeProfile(profile) {
  if (!profile) return null;
  return {
    ...profile,
    preferredLanguage: profile.preferredLanguage || DEFAULT_PROFILE_LANGUAGE,
    blocked: Array.isArray(profile.blocked) ? profile.blocked : [],
  };
}

export function dedupeById(list) {
  const seen = new Set();
  return list.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/**
 * When the live window (newest N messages) advances, messages that drop off its older
 * edge must not vanish from the screen. Append them to `older` so the display stays
 * continuous. Returns the same `older` array when nothing changed.
 */
export function absorbDroppedMessages(prevLive, nextLive, older) {
  if (!prevLive) return older;
  const nextIds = new Set(nextLive.map((m) => m.id));
  const olderIds = new Set(older.map((m) => m.id));
  const dropped = prevLive.filter((m) => !nextIds.has(m.id) && !olderIds.has(m.id));
  if (!dropped.length) return older;
  return [...older, ...dropped];
}
