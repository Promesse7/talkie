/** Pure helpers for the v1 -> v2 migration, kept separate so they can be unit tested. */

/** A v1 chat stores its messages as an array on the chat document. */
export function isLegacyChat(data) {
  return Array.isArray(data?.messages);
}

/** Convert one v1 message (text/img/isSeen) into a v2 message document. */
export function legacyMessageToV2(m, participants) {
  const other = participants.find((p) => p !== m.senderId);
  return {
    senderId: m.senderId,
    ...(m.text ? { text: m.text } : {}),
    ...(m.img ? { mediaUrl: m.img } : {}),
    createdAt: m.createdAt ?? null,
    sourceLanguage: 'en',
    translations: {},
    seenBy: m.isSeen && other ? [m.senderId, other] : [m.senderId],
  };
}
