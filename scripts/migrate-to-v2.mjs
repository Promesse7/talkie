#!/usr/bin/env node
// One-off migration from the v1 schema (messages array on chats/{id}, userChats summaries)
// to v2 (participants on chats/{id}, chats/{id}/messages subcollection).
//
// firebase-admin is NOT a project dependency; install it separately before running:
//   npm i -D firebase-admin
//
// The script is a DRY RUN unless `--apply` is passed. Without the flag it only prints
// what it would do and writes nothing. It is idempotent: chats that already have the v2
// shape (no `messages` array) are skipped, so re-running is safe.
//
// Usage: GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/migrate-to-v2.mjs [--apply]
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { isLegacyChat, legacyMessageToV2 } from './lib/legacy.mjs';

const APPLY = process.argv.includes('--apply');
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const toMillis = (t) => (t?.toMillis ? t.toMillis() : t ? new Date(t).getTime() : 0);

// Cache the legacy summary collections once instead of re-reading them per chat.
let legacySummaries = null;
async function loadLegacySummaries() {
  if (legacySummaries) return legacySummaries;
  legacySummaries = [];
  for (const coll of ['userChats', 'userchats']) {
    const snap = await db.collection(coll).get();
    snap.forEach((d) => legacySummaries.push({ uid: d.id, chats: d.data().chats ?? [] }));
  }
  return legacySummaries;
}

async function participantsFor(chatId) {
  const ids = new Set();
  for (const { uid, chats } of await loadLegacySummaries()) {
    if (chats.some((c) => c.chatId === chatId)) ids.add(uid);
  }
  return [...ids];
}

async function migrateChat(chatDoc) {
  const data = chatDoc.data();
  if (!isLegacyChat(data)) {
    console.log(`skip ${chatDoc.id}: already v2`);
    return;
  }
  const participants =
    data.participants?.length === 2 ? data.participants : await participantsFor(chatDoc.id);
  if (participants.length !== 2) {
    console.warn(`skip ${chatDoc.id}: could not determine 2 participants (${participants.join(',')})`);
    return;
  }
  const sorted = [...data.messages].sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
  console.log(
    `${APPLY ? 'migrate' : 'would migrate'} ${chatDoc.id}: ${sorted.length} messages, participants ${participants.join(', ')}`
  );
  if (!APPLY) return;

  const messagesRef = chatDoc.ref.collection('messages');
  let batch = db.batch();
  let n = 0;
  for (const m of sorted) {
    const v2 = legacyMessageToV2(m, participants);
    if (!v2.createdAt) v2.createdAt = FieldValue.serverTimestamp();
    batch.set(messagesRef.doc(), v2);
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

async function backfillUsers() {
  const snap = await db.collection('users').get();
  const missing = snap.docs.filter((d) => !d.data().preferredLanguage);
  console.log(`${APPLY ? 'backfill' : 'would backfill'} preferredLanguage=en on ${missing.length} user(s)`);
  if (!APPLY) return;
  let batch = db.batch();
  let n = 0;
  for (const d of missing) {
    batch.update(d.ref, { preferredLanguage: 'en' });
    if (++n % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
}

const chats = await db.collection('chats').get();
for (const c of chats.docs) await migrateChat(c);
await backfillUsers();
console.log(APPLY ? 'done' : 'dry run complete; re-run with --apply to write');
