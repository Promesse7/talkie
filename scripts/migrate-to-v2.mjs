#!/usr/bin/env node
// One-off migration from the v1 schema (messages array on chats/{id}, userChats summaries)
// to v2 (participants on chats/{id}, chats/{id}/messages subcollection).
//
// firebase-admin is NOT a project dependency; install it separately before running:
//   npm i -D firebase-admin
//
// The script is a DRY RUN unless `--apply` is passed. Without the flag it only prints
// what it would do and writes nothing.
//
// Usage: GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/migrate-to-v2.mjs [--apply]
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const APPLY = process.argv.includes('--apply');
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const toMillis = (t) => (t?.toMillis ? t.toMillis() : t ? new Date(t).getTime() : 0);

async function participantsFor(chatId) {
  const ids = new Set();
  for (const coll of ['userChats', 'userchats']) {
    const snap = await db.collection(coll).get();
    snap.forEach((d) => {
      if ((d.data().chats ?? []).some((c) => c.chatId === chatId)) ids.add(d.id);
    });
  }
  return [...ids];
}

async function migrateChat(chatDoc) {
  const data = chatDoc.data();
  const legacy = Array.isArray(data.messages) ? data.messages : [];
  const participants =
    data.participants?.length === 2 ? data.participants : await participantsFor(chatDoc.id);
  if (participants.length !== 2) {
    console.warn(
      `skip ${chatDoc.id}: could not determine 2 participants (${participants.join(',')})`
    );
    return;
  }
  const sorted = [...legacy].sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
  console.log(
    `${APPLY ? 'migrate' : 'would migrate'} ${chatDoc.id}: ${sorted.length} messages, participants ${participants.join(', ')}`
  );
  if (!APPLY) return;

  const messagesRef = chatDoc.ref.collection('messages');
  let batch = db.batch();
  let n = 0;
  for (const m of sorted) {
    const other = participants.find((p) => p !== m.senderId);
    // Omit null fields: the client checks `message.text` / `message.mediaUrl` for presence.
    batch.set(messagesRef.doc(), {
      senderId: m.senderId,
      ...(m.text ? { text: m.text } : {}),
      ...(m.img ? { mediaUrl: m.img } : {}),
      createdAt: m.createdAt ?? FieldValue.serverTimestamp(),
      sourceLanguage: 'en',
      translations: {},
      seenBy: m.isSeen && other ? [m.senderId, other] : [m.senderId],
    });
    if (++n % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  const last = sorted[sorted.length - 1];
  batch.update(chatDoc.ref, {
    participants,
    lastMessage: last
      ? { text: last.text ?? 'Photo', senderId: last.senderId, createdAt: last.createdAt ?? null }
      : null,
    updatedAt: last?.createdAt ?? data.createdAt ?? FieldValue.serverTimestamp(),
    seenBy: participants,
    messages: FieldValue.delete(),
  });
  await batch.commit();
}

const chats = await db.collection('chats').get();
for (const c of chats.docs) await migrateChat(c);
console.log(APPLY ? 'done' : 'dry run complete; re-run with --apply to write');
