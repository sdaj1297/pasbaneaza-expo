const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function ensureFirebaseAdmin() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    initializeApp({
      credential: serviceAccountJson ? cert(JSON.parse(serviceAccountJson)) : applicationDefault(),
      projectId,
    });
  }
}

function getFirebaseAdminDb() {
  ensureFirebaseAdmin();
  return getFirestore();
}

function getFirebaseAdminAuth() {
  ensureFirebaseAdmin();
  return getAuth();
}

module.exports = { getFirebaseAdminAuth, getFirebaseAdminDb };
