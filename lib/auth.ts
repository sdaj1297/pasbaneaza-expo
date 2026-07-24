import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';

export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  adminType: string;
};

export function isAuthEnabled() {
  return isFirebaseConfigured();
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void) {
  if (!isAuthEnabled()) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
    callback(firebaseUser ? await normalizeUser(firebaseUser) : null);
  });
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim().toLowerCase(), password);
  return normalizeUser(credential.user);
}

export async function logout() {
  await signOut(getFirebaseAuth());
}

export async function sendLoginReset(email: string) {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

async function normalizeUser(user: User): Promise<AuthUser> {
  const token = await user.getIdTokenResult();
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email || 'Pasban Admin',
    isAdmin: token.claims.admin === true,
    adminType: typeof token.claims.adminType === 'string' ? token.claims.adminType : '',
  };
}
