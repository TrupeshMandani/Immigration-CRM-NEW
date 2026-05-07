const admin = require("firebase-admin");

let initialized = false;

const getFirebaseAdmin = () => {
  if (initialized && admin.apps.length) {
    return admin;
  }

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn(
      "[Firebase Admin] Missing credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set."
    );
    return null;
  }

  if (!admin.apps.length) {
    const credential = admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });

    admin.initializeApp({ credential });
  }

  initialized = true;
  return admin;
};

module.exports = { getFirebaseAdmin };
