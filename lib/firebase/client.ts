import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const isConfigReady = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean);

if (!isConfigReady && process.env.NODE_ENV !== "production") {
  console.warn("Firebase config is incomplete. Fill NEXT_PUBLIC_FIREBASE_* in .env.local");
}

const firebaseApp = isConfigReady
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

const auth = firebaseApp ? getAuth(firebaseApp) : null;
const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
const realtimeDb = firebaseApp && firebaseConfig.databaseURL ? getDatabase(firebaseApp) : null;

async function ensureAnonymousAuth() {
  if (!auth) return null;
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

export { firebaseApp, auth, firestore, realtimeDb, isConfigReady, ensureAnonymousAuth };
