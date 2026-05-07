import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigValid = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.length > 0
);

if (!isConfigValid) {
  console.warn(
    "[Firebase] Missing configuration values. Check your VITE_FIREBASE_* env vars."
  );
}

const app =
  !getApps().length && isConfigValid
    ? initializeApp(firebaseConfig)
    : getApps()[0];

export const firebaseAuth = app ? getAuth(app) : null;
export default app;
