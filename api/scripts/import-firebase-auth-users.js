require('dotenv').config();

const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const { pool } = require('../db');

function initFirebaseAdmin() {
  if (getApps().length) return getAuth();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId,
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  return getAuth();
}

function cleanText(value) {
  return String(value || '').trim();
}

function legacyUid(id) {
  return `legacy-sys-user-${id}`;
}

function normalizePasswordHash(value) {
  const hash = cleanText(value);
  if (!hash) return '';
  return hash;
}

async function getLegacyUsers() {
  const [rows] = await pool.query(
    `select
       PKID,
       FIRST_NAME,
       LAST_NAME,
       EMAILID,
       IS_ADMIN,
       ADMIN_CODE,
       ADMIN_TYPE
     from SYS_USERS
     where EMAILID is not null
       and EMAILID <> ''
       and ADMIN_CODE is not null
       and ADMIN_CODE <> ''
     order by PKID`,
  );

  return rows.map((row) => {
    const firstName = cleanText(row.FIRST_NAME);
    const lastName = cleanText(row.LAST_NAME);
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || cleanText(row.EMAILID);
    return {
      uid: legacyUid(row.PKID),
      email: cleanText(row.EMAILID).toLowerCase(),
      displayName,
      passwordHash: normalizePasswordHash(row.ADMIN_CODE),
      legacyUserId: String(row.PKID),
      isAdmin: cleanText(row.IS_ADMIN) === '1',
      adminType: cleanText(row.ADMIN_TYPE || 'ALL') || 'ALL',
    };
  });
}

async function userExists(auth, email) {
  try {
    const user = await auth.getUserByEmail(email);
    return user;
  } catch (error) {
    if (error.code === 'auth/user-not-found') return null;
    throw error;
  }
}

async function importFirebaseAuthUsers() {
  const auth = initFirebaseAdmin();
  const legacyUsers = await getLegacyUsers();
  const toImport = [];
  const existing = [];

  for (const user of legacyUsers) {
    const existingUser = await userExists(auth, user.email);
    if (existingUser) {
      existing.push({ ...user, uid: existingUser.uid });
    } else {
      toImport.push(user);
    }
  }

  let imported = 0;
  const errors = [];

  if (toImport.length) {
    const result = await auth.importUsers(
      toImport.map((user) => ({
        uid: user.uid,
        email: user.email,
        emailVerified: true,
        displayName: user.displayName,
        passwordHash: Buffer.from(user.passwordHash),
        disabled: !user.isAdmin,
      })),
      {
        hash: {
          algorithm: 'BCRYPT',
        },
      },
    );

    imported = result.successCount;
    errors.push(...result.errors.map((error) => ({
      index: error.index,
      reason: error.error?.message || 'Import failed',
    })));
  }

  const claimUsers = [...toImport, ...existing];
  for (const user of claimUsers) {
    await auth.setCustomUserClaims(user.uid, {
      admin: user.isAdmin,
      adminType: user.adminType,
      legacyUserId: user.legacyUserId,
    });
  }

  return {
    imported,
    existing: existing.length,
    claimsUpdated: claimUsers.length,
    skipped: legacyUsers.length - claimUsers.length,
    errors,
  };
}

if (require.main === module) {
  importFirebaseAuthUsers()
    .then(async (result) => {
      console.log(JSON.stringify(result, null, 2));
      await pool.end();
    })
    .catch(async (error) => {
      if (error.code === 'auth/configuration-not-found') {
        console.error('Firebase Authentication is not enabled for this project. In Firebase Console, open Authentication, click Get started, enable Email/Password, then rerun npm run firebase:import-users.');
      } else {
        console.error(error);
      }
      await pool.end();
      process.exit(1);
    });
}

module.exports = { importFirebaseAuthUsers };
