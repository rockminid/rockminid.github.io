/**
 * Firebase initialization.
 *
 * Every export here is optional-by-design: when Firebase is not configured
 * (no environment variables), `auth` and `db` are null and the application
 * runs in local-only mode. Nothing in the deterministic geochemistry path
 * touches this module.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    authInstance = getAuth(app);
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn(
      'Firebase initialization failed; continuing in local-only mode.',
      err instanceof Error ? err.message : err
    );
    app = null;
    authInstance = null;
    dbInstance = null;
    googleProviderInstance = null;
  }
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = googleProviderInstance;

/** True when cloud features (sign-in, sync, feedback) are available. */
export const isCloudEnabled = (): boolean => Boolean(auth && db);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore error:', errInfo);
  throw new Error(errInfo.error);
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth || !googleProvider) {
    throw new Error(
      'Cloud sign-in is not configured for this deployment. Your specimens are still saved locally in this browser.'
    );
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Subscribes to auth state. When Firebase is not configured this reports
 * "signed out" once and never blocks.
 */
export function onAuthStateChanged(
  _auth: Auth | null,
  cb: (user: User | null) => void
): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return fbOnAuthStateChanged(auth, cb);
}

export { isFirebaseConfigured };
export type { User };
