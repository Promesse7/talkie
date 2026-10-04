# Talkie

Talkie is a 1:1 real-time chat app. Each user picks the language they read in, and every
incoming message is shown in that language without any click. Translation happens on the
sender's side at send time when possible, and on the receiver's side as a fallback. Each
message bubble has a "Show original" / "Show translation" toggle.

## Stack

- React 18, Vite, Tailwind CSS, Zustand
- Firebase: Authentication, Firestore, Storage (Firebase JS SDK v9)
- Translation API: a Vercel serverless function in `api/translate.js`, backed by a pluggable
  provider in `server/translate/` (LibreTranslate or Hugging Face NLLB). The same handler is
  mounted by a Vite dev middleware so it works under `npm run dev`.
- Tests: Vitest, @testing-library/react, jsdom

## Getting started

1. Copy the env template and fill in your Firebase web app config. The `VITE_FIREBASE_*`
   values come from the Firebase console (Project settings > Your apps > SDK setup).

   ```sh
   cp .env.example .env
   ```

2. Install and run:

   ```sh
   npm install
   npm run dev
   ```

`.env` is gitignored. The `VITE_FIREBASE_*` values are shipped to the browser, so restrict the
API key to your domains in Google Cloud console > Credentials.

## Scripts

| Command           | What it does                                    |
|-------------------|-------------------------------------------------|
| `npm run dev`     | Vite dev server with `/api/translate` mounted   |
| `npm run build`   | Production build into `dist/`                   |
| `npm run preview` | Serve the production build locally              |
| `npm test`        | Run the Vitest suite once (`npm run test:watch` to watch) |

## Firebase setup

Security rules and indexes live in the repo and are deployed with the Firebase CLI:

```sh
npm i -g firebase-tools
firebase login
firebase use <project-id>
firebase deploy --only firestore,storage
```

This deploys `firestore.rules`, `firestore.indexes.json` and `storage.rules` (wired up in
`firebase.json`).

The chat list query (`participants array-contains uid`, ordered by `updatedAt desc`) needs a
composite index on `chats`: `participants` ARRAY_CONTAINS + `updatedAt` DESCENDING. It is
declared in `firestore.indexes.json` and created by the deploy command above. If you skip the
deploy, Firestore will log an error with a link to create it by hand.

## Translation

The translation endpoint only serves signed-in users: the client sends the Firebase ID token as a bearer token and the server verifies it with Identity Toolkit (no Admin SDK needed). Set FIREBASE_WEB_API_KEY on the server, or leave it unset to fall back to VITE_FIREBASE_API_KEY.

The translation backend is chosen with `TRANSLATE_PROVIDER`. These variables are server-side
only; they are read by the serverless function and the Vite dev middleware, never by the browser.

| `TRANSLATE_PROVIDER`      | Env vars                                                                                   | Notes                                                        |
|---------------------------|--------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| `nllb` (default)           | `NLLB_API_URL` (optional; default is the public nllb-api Space)                              | Real NLLB-200 (1.3B, 8-bit) served by the open-source nllb-api on CPU. No key, no card, all nine languages including Kinyarwanda and Swahili, about 1.5 s per message. For anything beyond a pilot, duplicate the Space into your own Hugging Face account (free) so you do not depend on a stranger's instance. See "Running your own NLLB Space" below. |
| `google`                   | `GOOGLE_TRANSLATE_API_KEY`                                                                  | Google Cloud Translation v2 with an API key. First 500,000 characters per month free, then pay as you go. Supports all nine Talkie languages including Kinyarwanda and Swahili. Recommended for the pilot and for production. See "Getting a Google Translate API key" below. |
| `libretranslate`          | `LIBRETRANSLATE_URL` (default `https://libretranslate.com`), `LIBRETRANSLATE_API_KEY` | The public libretranslate.com instance requires an API key (portal.libretranslate.com); without one every request returns 502 and messages show untranslated. Self-hosted instances usually need no key. No Kinyarwanda support. |
| `huggingface`             | `HF_API_TOKEN`, `HF_MODEL` (default `facebook/nllb-200-distilled-600M`)                    | NLLB supports Kinyarwanda (`kin_Latn`). ISO codes are mapped to NLLB codes in `server/translate/languages.js`. |
| `none`                    | none                                                                                       | Returns the original text; lets the app run with translation disabled. |

The endpoint is `POST /api/translate` with `{ text, source, target }` and answers
`{ translatedText, provider }`. `source === target` and empty text short-circuit without
calling a provider. Text is limited to 2000 characters. Provider errors return 502 and the
client falls back to showing the original text.

### Running your own NLLB Space (free, no card)

The default points at the nllb-api author's public Space. For your pilot, run your own copy so it cannot disappear under you:

1. Create a free account at https://huggingface.co if you do not have one.
2. Open https://huggingface.co/spaces/winstxnhdw/nllb-api and click **Duplicate this Space** (top right, under the three-dot menu). Keep the free **CPU basic** hardware. Visibility can stay public; the API has no secrets.
3. Wait for the build to finish (the first start downloads the model and takes a few minutes). Your Space URL is `https://<your-username>-nllb-api.hf.space`.
4. Set `NLLB_API_URL=https://<your-username>-nllb-api.hf.space` in `.env` and in Vercel, with `TRANSLATE_PROVIDER=nllb`.
5. Verify with `npm run translate:check`.

Free Spaces sleep after 48 hours without traffic and take a minute or two to wake; the first message after a sleep will show untranslated and later ones will be fine. You can also run the same image on any machine with Docker: `docker run --init --rm -e SERVER_PORT=7860 -p 7860:7860 ghcr.io/winstxnhdw/nllb-api:main` and point `NLLB_API_URL` at it.

### Getting a Google Translate API key (optional, for paid production)

1. Open https://console.cloud.google.com and select the Firebase project (it is already a Google Cloud project), or create a new one.
2. Billing: APIs > Library > search "Cloud Translation API" > Enable. Google requires a billing account on the project even for the free tier; the first 500,000 characters per month are not charged.
3. APIs & Services > Credentials > Create credentials > API key. Copy it.
4. Restrict the key (Edit key): under API restrictions choose "Restrict key" and tick only "Cloud Translation API". Leave application restrictions on "None" because the key is used server-side.
5. Put it in `.env` as `GOOGLE_TRANSLATE_API_KEY=...` for local dev, and add the same variable in Vercel > Project > Settings > Environment Variables for the deployment.
6. Verify locally: `npm run dev`, sign in, and send a message to a user whose language differs from yours. Or run `npm run translate:check` to call the provider directly.

To cap cost, set a quota in APIs & Services > Cloud Translation API > Quotas (characters per day) and a billing budget alert.

On Vercel, set these as project environment variables. Never prefix them with `VITE_`; that
would bundle them into the client and expose the API keys.

## Deploying to Vercel

- Framework preset: Vite. Build command `vite build`, output directory `dist`.
- `api/translate.js` is deployed as a serverless function.
- `vercel.json` rewrites every path except `/api/*` to `index.html` so the single-page app
  handles its own views.
- Set the `VITE_FIREBASE_*` variables and the translation variables above in the project's
  environment settings.

## Data model

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

Chat media is uploaded to Storage at `chat-media/{chatId}/{timestamp}_{name}`; avatars go to
`avatars/{uid}/...`. Only participants can read or write a chat and its messages; see
`firestore.rules`.

## Migrating v1 data

v1 stored messages as an array on `chats/{id}` and kept per-user summaries in a `userChats`
collection. `scripts/migrate-to-v2.mjs` moves each legacy chat to the v2 model: it derives
`participants` from the `userChats` / `userchats` docs that reference the chat, copies each
message into the `messages` subcollection (`seenBy` derived from the old `isSeen` flag), sets
`lastMessage` / `updatedAt` / `seenBy` on the chat doc, and deletes the `messages` array.

`firebase-admin` is not a project dependency; install it first. The script needs a service
account key and is a dry run unless `--apply` is passed:

```sh
npm i -D firebase-admin
GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/migrate-to-v2.mjs            # dry run
GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/migrate-to-v2.mjs --apply    # write
```

This script has not been run against live data. Take a Firestore export before running it
with `--apply`.

## Known gaps

- Firestore and Storage rules are deployed but not emulator-tested.
- No routing library; views are switched in `App` state.
- Group chat, presence, voice/video calls and push notifications are not implemented.
- Chats migrated from v1 keep their old ids; the deterministic `uidA_uidB` id only applies to
  chats created in v2. `AddUser` finds existing chats with a participants query, so both kinds
  coexist.
