import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { chatIdFor, otherParticipant } from './chat.js';

/** Live subscription to a user's profile document. Calls back with null when it does not exist. */
export function subscribeToUser(uid, onChange, onError = console.error) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onChange(snap.exists() ? { id: uid, ...snap.data() } : null),
    onError
  );
}

/** Return the id of the chat between two users, creating it if needed. */
export async function ensureChat(me, them) {
  if (me.id === them.id) throw new Error('You cannot start a chat with yourself');

  const id = chatIdFor(me.id, them.id);
  const ref = doc(db, 'chats', id);
  if ((await getDoc(ref)).exists()) return id;

  // Chats created before deterministic ids were introduced.
  const mine = await getDocs(
    query(collection(db, 'chats'), where('participants', 'array-contains', me.id))
  );
  const legacy = mine.docs.find((d) => (d.data().participants ?? []).includes(them.id));
  if (legacy) return legacy.id;

  await setDoc(ref, {
    participants: [me.id, them.id],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
    seenBy: [me.id],
  });
  return id;
}

/**
 * Live list of the chats a user participates in, newest first.
 * Each item is the chat document plus `user`, the other participant's profile.
 */
export function subscribeToChats(uid, onChange, onError = console.error) {
  const profiles = new Map();
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    async (snap) => {
      const items = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const otherId = otherParticipant(data, uid);
          if (otherId && !profiles.has(otherId)) {
            const p = await getDoc(doc(db, 'users', otherId));
            profiles.set(
              otherId,
              p.exists() ? { id: otherId, ...p.data() } : { id: otherId, username: 'Unknown user' }
            );
          }
          return { id: d.id, ...data, user: otherId ? profiles.get(otherId) : null };
        })
      );
      onChange(items);
    },
    onError
  );
}

export function markChatSeen(chatId, uid) {
  return updateDoc(doc(db, 'chats', chatId), { seenBy: arrayUnion(uid) });
}

export async function findUserByUsername(username) {
  const snap = await getDocs(
    query(collection(db, 'users'), where('username', '==', username.trim()), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}
