# Talkie v2 Design: Vite, participant-based chat model, zero-click translation

Date: 2026-10-04
Source brief: the Talkie Engineering Handoff & Sprint Spec supplied by the project owner.
Status: approved for implementation (owner asked for autonomous execution of the handoff).

## 1. Goal

Turn the Talkie prototype into a shippable 1:1 messenger MVP:

- Production build on a maintained toolchain (Vite).
- A Firestore model that survives real usage and can be locked down with rules.
- Users set a preferred language; messages are shown to each user in their own language
  without any click.
- No crashes on missing profiles or avatars; errors are surfaced to the user.

Out of scope: group chats, voice/video, presence, push notifications, message edit/delete,
routing library, TypeScript, Firebase SDK major upgrade.

## 2. Deviations from the handoff, and why

| Handoff said | This design does | Reason |
|---|---|---|
| Standardize on a `userChats` collection | Remove `userChats`; chat list is a query on `chats` where `participants array-contains uid` | The handoff's rules restrict `userChats/{uid}` to its owner, but sending a message must update the other user's summary. The model and the rules cannot both hold. Putting `lastMessage`/`updatedAt`/`seenBy` on the chat doc fixes this and removes the typo class of bugs. |
| `chats/{id}` readable/writable by any signed-in user | Only by `participants` | Otherwise any user can read every conversation. |
| Client-side translation utility *or* serverless function | Serverless function `api/translate` with pluggable provider; a Vite dev middleware mounts the same handler | Keeps API keys off the client; works in `npm run dev` without Vercel CLI. |
| `seenBy` array on messages | Kept, plus `seenBy` on the chat doc for the list's unread marker | List needs unread state without reading every message. |

## 3. Toolchain

- Replace `react-scripts` with `vite` + `@vitejs/plugin-react`. Remove `postcss-loader`, `web-vitals`,
  CRA test files, `reportWebVitals.js`, `logo.svg`, and the stray `presets`/`plugins` keys in package.json.
- `package.json` gets `"type": "module"`; Tailwind and PostCSS configs become ESM.
- `index.html` moves to the repo root and loads `/src/main.jsx`. `public/` keeps `logo.png`,
  `manifest.json`, `robots.txt`; the duplicated demo photos in `public/images` are removed.
- Files containing JSX are renamed to `.jsx`. `chatStore .js` (with a space) becomes `chatStore.js`.
- `src/components/lib/*` moves to `src/lib/*` (stores, firebase, upload, translate, chat helpers).
- Firebase config reads `import.meta.env.VITE_FIREBASE_*`. `.env` is removed from git and added to
  `.gitignore`; `.env.example` documents every variable. The existing values stay in git history, so
  the owner should restrict the web API key to the app's domains in Google Cloud console.
- Tests: Vitest + @testing-library/react + jsdom. `npm test` runs them.
- `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules` live in the repo so
  `firebase deploy --only firestore,storage` publishes them.
- Vercel: build command `vite build`, output `dist`. Serverless functions live in `api/`.
  `vercel.json` adds an SPA rewrite for everything except `/api/*`.

## 4. Data model

```
users/{uid}
  id, username, email, avatar, blocked: [uid], preferredLanguage: "en" | "rw" | "fr" | "sw" | ...
  createdAt

chats/{chatId}            chatId = [uidA, uidB].sort().join("_")
  participants: [uidA, uidB]
  createdAt, updatedAt
  lastMessage: { text, senderId, createdAt } | null
  seenBy: [uid]            reset to [senderId] on every send; opening the chat adds the reader

chats/{chatId}/messages/{messageId}
  senderId, createdAt (serverTimestamp)
  text?: string
  mediaUrl?: string
  sourceLanguage: string
  translations: { [lang]: string }   written by sender at send time, or by receiver on fallback
  seenBy: [uid]
```

- Messages are read with `query(messages, orderBy("createdAt","desc"), limit(50))` under `onSnapshot`,
  reversed for display. A "Load earlier messages" control fetches the next page with `startAfter`.
- Marking seen: when a snapshot arrives, every loaded message not sent by me and missing my uid in
  `seenBy` gets `arrayUnion(uid)` in one batch. The chat doc also gets `seenBy: arrayUnion(uid)`.
- Chat media uploads go to Storage path `chat-media/{chatId}/{timestamp}_{name}`; avatars stay at
  `avatars/{uid}/...`. The upload helper takes an explicit path.
- Block state is derived, not stored in the store: `isReceiverBlocked = me.blocked.includes(them.id)`,
  `isCurrentUserBlocked = them.blocked.includes(me.id)`. The receiver's profile is kept live with
  `onSnapshot(users/{them.id})` while a chat is open.

### Composite index

`chats`: `participants` ARRAY_CONTAINS + `updatedAt` DESCENDING. Declared in `firestore.indexes.json`.

### Migration of existing data

`scripts/migrate-to-v2.mjs` (firebase-admin, needs `GOOGLE_APPLICATION_CREDENTIALS`):
for every legacy `chats/{id}` doc with a `messages` array, derive `participants` from the
`userChats`/`userchats` docs that reference it, copy each message into the subcollection with
`seenBy` from the old `isSeen` flag, set `lastMessage`/`updatedAt`/`seenBy` on the chat doc, delete the
`messages` field. Legacy chat IDs are kept (the deterministic ID only applies to new chats; AddUser
checks for an existing chat by participants query before creating). The script is idempotent and
dry-run by default. It is not executed as part of this work.

## 5. Security rules

```
users/{uid}:     read if signed in; create/update if uid == auth.uid
chats/{chatId}:  read if auth.uid in resource.participants
                 create if auth.uid in request.participants and participants.size() == 2
                 update if auth.uid in resource.participants and participants unchanged
  messages/{id}: read if participant
                 create if participant and senderId == auth.uid
                 update if participant and only seenBy / translations change
storage:         avatars/{uid}/** write if uid == auth.uid; chat-media/** write if signed in; read if signed in
```

Rules are deployed by the owner; they are not unit tested here (needs the emulator).

## 6. State

- `useUserStore`: `currentUser` (Firestore profile, live via `onSnapshot`), `authUser`, `status`
  (`"loading" | "signedOut" | "ready" | "profileMissing"`), `updatePreferredLanguage(lang)`.
  `App` calls `init()` once.
- `useChatStore`: `chatId`, `receiver` (live profile), `openChat(chatId, receiver)`, `closeChat()`.
  Block flags are selectors computed from both stores.
- `useTranslationStore`: in-memory cache `{ [key]: text }`, key = `source|target|text`, mirrored to
  localStorage (best effort).
- The two `onAuthStateChanged` listeners collapse into one, in `useUserStore.init()`.

## 7. Translation engine

### Server: `api/translate.js`

POST `{ text, source, target }` -> `200 { translatedText, provider }` or `4xx/5xx { error }`.
Pure handler `translateText({ text, source, target }, env, fetchImpl)` lives in
`server/translate/index.js` so it is unit-testable and reusable by the Vite dev middleware.

Providers, chosen by `TRANSLATE_PROVIDER` (server-side env, never `VITE_`):

| Provider | Env | Notes |
|---|---|---|
| `libretranslate` (default) | `LIBRETRANSLATE_URL` (default `https://libretranslate.com`), `LIBRETRANSLATE_API_KEY` optional | No Kinyarwanda. |
| `huggingface` | `HF_API_TOKEN`, `HF_MODEL` (default `facebook/nllb-200-distilled-600M`) | Supports Kinyarwanda (`kin_Latn`). ISO codes map to NLLB codes in `server/translate/languages.js`. |
| `none` | | Returns the original text; lets the app run with translation disabled. |

Short-circuits: `source === target` returns the text; empty text returns empty. Any provider error
returns 502 with a message. Request body limits text to 2000 chars.

### Vite dev

`vite.config.js` registers a plugin whose `configureServer` mounts `POST /api/translate` using the
same handler and `process.env` (loaded from `.env` by Vite's `loadEnv` with no prefix filter).

### Client: `src/lib/translate.js` and `useTranslatedText`

- `translate(text, source, target)` -> cached fetch to `/api/translate`; on failure resolves to
  `null` (caller shows the original).
- On send, `Chat` writes the message, then (non-blocking) translates into the receiver's
  `preferredLanguage` and `updateDoc`s `translations.{lang}`. Sending is never delayed by the API.
- On render, a message bubble shows:
  - my own messages: original text;
  - others' messages: `translations[myLang]` if present; otherwise, if `sourceLanguage !== myLang`,
    the hook requests a translation, shows the original with a subtle "translating" state, then swaps
    in the translation and writes it back to `translations.{myLang}` (best effort);
  - a small "Show original" / "Show translation" toggle per bubble when a translation is shown.
- Languages offered: `src/lib/languages.js` exports `SUPPORTED_LANGUAGES` =
  en, rw, fr, sw, es, pt, de, ar, zh (code, English name, native name).

### UI

- Register form gains a language `<select>` (default `en`).
- UserInfo's edit icon opens a small settings panel with the language `<select>`; changing it writes
  `users/{uid}.preferredLanguage`.
- Detail shows the receiver's language under their name.

## 8. Error handling and guards

- `App` renders by `status`: loading spinner (no artificial delay), landing/login/register when
  signed out, main when ready, and a "profile not found" screen with a sign-out button when the
  auth user has no `users/{uid}` doc.
- `UserInfo`, `Detail`, `Chat` use optional chaining and placeholders for missing avatar/username.
- Login shows `toast.error` on failure; Register shows the Firebase error message.
- Send failures and upload failures toast.
- `AddUser`: searching yourself or an existing chat opens the existing chat instead of creating one.
- Navbar's Register and Login buttons are wired to the view switcher.

## 9. Landing content

Replace testimonials attributed to public figures and the fake customer counts with three product
feature cards (real-time, translation, media). No invented numbers.

## 10. Testing

Vitest, jsdom environment:

- `server/translate`: provider selection, short-circuits, LibreTranslate and HF request/response
  mapping, error -> 502, NLLB code mapping.
- `src/lib/chat.js`: `chatIdFor(a, b)` is order-independent; `isBlocked` selectors;
  `unseenMessagesFor(messages, uid)`; `displayTextFor(message, myLang)`.
- `src/lib/translate.js`: cache hit avoids fetch; failure resolves null.
- Smoke render of `MessageBubble` with and without translation.

Manual verification: `npm run build` passes; `npm run dev` serves the app and `/api/translate` answers.

## 11. Deliverables checklist

- [ ] Vite toolchain, tests runnable, build green
- [ ] New data model in all components, `userChats` gone
- [ ] Rules, indexes, storage rules, firebase.json
- [ ] Migration script (not executed)
- [ ] Null guards and error toasts
- [ ] Language preference in Register and UserInfo settings
- [ ] Translation API + dev middleware + client hook + per-bubble toggle
- [ ] Landing content cleanup, Navbar wired
- [ ] `.env` untracked, `.env.example` added, README updated
