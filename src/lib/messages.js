import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';
import upload from './upload.js';
import { unseenMessagesFor } from './chat.js';
import { DEFAULT_LANGUAGE } from './languages.js';
import { translate } from './translate.js';

const messagesRef = (chatId) => collection(db, 'chats', chatId, 'messages');
const toMessage = (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) });

/**
 * Live subscription to the newest `pageSize` messages of a chat, oldest -> newest.
 */
export function subscribeToMessages(chatId, pageSize, onChange, onError = console.error) {
  const q = query(messagesRef(chatId), orderBy('createdAt', 'desc'), limit(pageSize));
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toMessage).reverse()), onError);
}

/**
 * Messages strictly older than `beforeCreatedAt` (a Firestore Timestamp taken from the
 * oldest message currently displayed), oldest -> newest.
 */
export async function fetchOlderMessages(chatId, beforeCreatedAt, pageSize) {
  const q = query(
    messagesRef(chatId),
    orderBy('createdAt', 'desc'),
    startAfter(beforeCreatedAt),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map(toMessage).reverse();
}

/**
 * Send a text and/or image message. Resolves with the new message id once the message
 * is written; translation into the receiver's language happens afterwards and never
 * delays or fails the send.
 */
export async function sendMessage({ chatId, sender, receiver, text, file }) {
  const trimmed = (text ?? '').trim();
  if (!trimmed && !file) return null;

  const sourceLanguage = sender.preferredLanguage || DEFAULT_LANGUAGE;
  const message = {
    senderId: sender.id,
    createdAt: serverTimestamp(),
    sourceLanguage,
    seenBy: [sender.id],
    translations: {},
  };
  if (trimmed) message.text = trimmed;
  if (file) message.mediaUrl = await upload(file, `chat-media/${chatId}/${Date.now()}_${file.name}`);

  const ref = await addDoc(messagesRef(chatId), message);
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: { text: trimmed || 'Photo', senderId: sender.id, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
    seenBy: [sender.id],
  });

  const targetLang = receiver?.preferredLanguage || DEFAULT_LANGUAGE;
  if (trimmed && targetLang !== sourceLanguage) {
    translate(trimmed, sourceLanguage, targetLang)
      .then((t) => (t && t !== trimmed ? saveTranslation(chatId, ref.id, targetLang, t) : null))
      .catch(() => {});
  }

  return ref.id;
}

export function saveTranslation(chatId, messageId, lang, text) {
  return updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    [`translations.${lang}`]: text,
  });
}

export async function markMessagesSeen(chatId, messages, uid) {
  const unseen = unseenMessagesFor(messages, uid);
  if (!unseen.length) return;
  const batch = writeBatch(db);
  unseen.forEach((m) =>
    batch.update(doc(db, 'chats', chatId, 'messages', m.id), { seenBy: arrayUnion(uid) })
  );
  batch.update(doc(db, 'chats', chatId), { seenBy: arrayUnion(uid) });
  await batch.commit();
}
