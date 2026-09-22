/**
 * Firebase, loaded on demand.
 *
 * The Firebase SDK is roughly 528 kB of JavaScript. It used to be imported
 * statically here, which put it in the entry chunk's dependency graph, so
 * every visitor downloaded and parsed all of it before the app became
 * interactive — including the overwhelming majority who never sign in, and
 * including every visitor when the deployment has no Firebase project
 * configured at all.
 *
 * Nothing in the deterministic geochemistry path touches this module, so the
 * SDK is now fetched only when something actually needs it: a sign-in, a
 * cloud read or write. `loadFirebase()` memoizes both the import and the
 * initialization, so concurrent callers share one in-flight promise and the
 * SDK is fetched at most once.
 *
 * Every export is optional-by-design: when Firebase is not configured the
 * loader resolves to null and the application runs in local-only mode.
 */

import type { Auth, GoogleAuthProvider, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

export interface FirebaseBundle {
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
}

/** Memoized in-flight or settled load. */
let bundlePromise: Promise<FirebaseBundle | null> | null = null;

/** The resolved bundle, for the few places that need a synchronous peek. */
let bundle: FirebaseBundle | null = null;

/**
 * Loads and initializes Firebase, or resolves null when this deployment has
 * no project configured.
 */
export function loadFirebase(): Promise<FirebaseBundle | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (bundlePromise) return bundlePromise;

  bundlePromise = (async () => {
    try {
      const [{ initializeApp, getApps, getApp }, authMod, firestoreMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);

      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

      const db = firebaseConfig.firestoreDatabaseId
        ? firestoreMod.getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : firestoreMod.getFirestore(app);

      const auth = authMod.getAuth(app);
      const googleProvider = new authMod.GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });

      bundle = { auth, db, googleProvider };
      return bundle;
    } catch (err) {
      console.warn(
        'Firebase initialization failed; continuing in local-only mode.',
        err instanceof Error ? err.message : err
      );
      // Reset so a later attempt can retry rather than being stuck on a
      // transient network failure during the chunk fetch.
      bundlePromise = null;
      bundle = null;
      return null;
    }
  })();

  return bundlePromise;
}

/**
 * The Firestore instance, if Firebase has already finished loading.
 *
 * Returns null when it has not, so callers that cannot await must treat that
 * as "not yet" rather than "not configured". Prefer `loadFirebase()`.
 */
export function peekDb(): Firestore | null {
  return bundle?.db ?? null;
}

/** The signed-in user, if any, without forcing the SDK to load. */
export function peekCurrentUser(): User | null {
  return bundle?.auth.currentUser ?? null;
}

/**
 * True when cloud features are available for this deployment.
 *
 * This is now a question about CONFIGURATION, not about whether the SDK
 * happens to have finished downloading. Gating the UI on the latter meant the
 * sign-in button flickered in and out of existence as the chunk loaded.
 */
export const isCloudEnabled = (): boolean => isFirebaseConfigured;

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
  const user = peekCurrentUser();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore error:', errInfo);
  throw new Error(errInfo.error);
}

export async function signInWithGoogle(): Promise<User> {
  const fb = await loadFirebase();
  if (!fb) {
    throw new Error(
      'Cloud sign-in is not configured for this deployment. Your specimens are still saved locally in this browser.'
    );
  }
  const { signInWithPopup } = await import('firebase/auth');
  const result = await signInWithPopup(fb.auth, fb.googleProvider);
  return result.user;
}

export async function logOut(): Promise<void> {
  const fb = await loadFirebase();
  if (!fb) return;
  const { signOut } = await import('firebase/auth');
  await signOut(fb.auth);
}

/**
 * Subscribes to auth state.
 *
 * Returns an unsubscribe function synchronously so callers can use it in a
 * React effect cleanup without awaiting. When Firebase is not configured this
 * reports "signed out" once and never blocks; when it is, the real listener
 * is attached as soon as the SDK finishes loading, and a cleanup that runs
 * before then cancels the attachment.
 */
export function onAuthStateChanged(cb: (user: User | null) => void): () => void {
  let cancelled = false;
  let detach: (() => void) | null = null;

  if (!isFirebaseConfigured) {
    cb(null);
    return () => {};
  }

  void (async () => {
    const fb = await loadFirebase();
    if (cancelled) return;
    if (!fb) {
      cb(null);
      return;
    }
    const { onAuthStateChanged: fbOnAuthStateChanged } = await import('firebase/auth');
    if (cancelled) return;
    detach = fbOnAuthStateChanged(fb.auth, cb);
  })();

  return () => {
    cancelled = true;
    if (detach) detach();
  };
}

export { isFirebaseConfigured };
export type { User };
