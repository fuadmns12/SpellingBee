# SpellingBee-Competition App

Standalone app for public classroom SpellingBee-Competition (separate from `member-app`).

## Tech Stack
- Next.js 16 (App Router)
- React 19
- Firebase Web SDK
- Firebase CLI (`firebase-tools`)
- Firebase Functions (auto cleanup room data)

## Folder Purpose
This app is dedicated for realtime SpellingBee-Competition so `member-app` stays light.

## Setup
1. Install dependencies
```bash
npm install
```

2. Create local env file
```bash
cp .env.example .env.local
```
Fill all `NEXT_PUBLIC_FIREBASE_*` values from Firebase Console.

3. Login Firebase CLI (first time)
```bash
npm run firebase:login
```

4. Set your Firebase project ID
- Edit `.firebaserc`
- Replace `your-firebase-project-id` with your real project ID.

5. Run app
```bash
npm run dev
```

6. (Recommended) Install functions dependencies and deploy cleanup function
```bash
cd functions
npm install
cd ..
npm run firebase:deploy:functions
```

7. Enable Firestore TTL for automatic room deletion
- In Firebase Console, open Firestore -> TTL policies.
- Create TTL policy for collection `rooms` and field `expiresAt`.
- Once `expiresAt` passes, room document is deleted automatically.
- Cleanup function then removes remaining subcollections (`players`, `buzzEvents`, `vocabularyResults`).

## Available Scripts
- `npm run dev` - run local app
- `npm run build` - production build
- `npm run start` - serve production build
- `npm run firebase:emulators` - start Firebase Emulator Suite
- `npm run firebase:deploy` - deploy Firebase resources
- `npm run firebase:deploy:functions` - deploy only cleanup Cloud Function

## Current Routes
- `/` - redirects to host page
- `/games/spelling-bee` - spelling bee host setup page

## Notes
- This setup is public-facing and designed for expansion to realtime buzzer gameplay.
- Initial Firestore rule is public read + authenticated write. Adjust for your security needs.
- Room documents now auto-refresh `expiresAt` while game is active; idle rooms can expire automatically with Firestore TTL.
