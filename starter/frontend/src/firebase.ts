import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { createClient } from "@uncrud/client";
import { firebaseAuthSource, firestoreProjections } from "@uncrud/client/firebase";

const local = import.meta.env.DEV;
if (local && !["127.0.0.1", "localhost"].includes(location.hostname)) throw new Error("Local starter requires loopback");
const projectId = local ? "demo-uncrud" : import.meta.env.VITE_FIREBASE_PROJECT_ID;
if (!local && (!projectId || projectId.startsWith("demo-") || import.meta.env.VITE_AUTH_EMULATOR_HOST
  || import.meta.env.VITE_FIRESTORE_EMULATOR_HOST)) throw new Error("Configure a cloud Firebase project without emulators");
const app = initializeApp({
  projectId,
  apiKey: local ? "demo-key" : import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: local ? "demo-uncrud.firebaseapp.com" : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  appId: local ? "demo-app" : import.meta.env.VITE_FIREBASE_APP_ID,
});
export const auth = getAuth(app);
const databaseId = local ? "(default)" : import.meta.env.VITE_FIRESTORE_DATABASE_ID;
if (!databaseId) throw new Error("Configure VITE_FIRESTORE_DATABASE_ID");
export const database = getFirestore(app, databaseId);
if (local) {
  connectAuthEmulator(auth, "http://127.0.0.1:9199", { disableWarnings: true });
  connectFirestoreEmulator(database, "127.0.0.1", 8180);
}
export const authSource = firebaseAuthSource(auth);
export const projections = firestoreProjections(database);
export const client = createClient({ endpoint: "/api/v1", auth: authSource });

let signingIn: Promise<unknown> | undefined;
export async function signIn() {
  await auth.authStateReady();
  if (auth.currentUser) return;
  signingIn ??= signInAnonymously(auth).finally(() => { signingIn = undefined; });
  await signingIn;
}
