/**
 * Firebase configuration, read from build-time environment variables.
 *
 * Previously this was a committed `firebase-applet-config.json` pointing at a
 * disposable AI Studio project. Web API keys are not secrets (they are visible
 * in any client bundle), but the project must be one you control and the key
 * must be domain-restricted in the Google Cloud console.
 *
 * Copy `.env.example` to `.env.local` and fill in your own project's values.
 * When the variables are absent the app runs fully in local-only mode: all
 * deterministic geochemistry, every diagram, CSV batch processing, export and
 * the local specimen collection continue to work; only cloud sync, Google
 * sign-in and feedback submission are disabled.
 */

export interface RockMinFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const env = import.meta.env;

function read(key: string): string {
  const v = env[key as keyof typeof env];
  return typeof v === 'string' ? v.trim() : '';
}

export const firebaseConfig: RockMinFirebaseConfig = {
  apiKey: read('VITE_FIREBASE_API_KEY'),
  authDomain: read('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: read('VITE_FIREBASE_PROJECT_ID'),
  appId: read('VITE_FIREBASE_APP_ID'),
  storageBucket: read('VITE_FIREBASE_STORAGE_BUCKET') || undefined,
  messagingSenderId: read('VITE_FIREBASE_MESSAGING_SENDER_ID') || undefined,
  measurementId: read('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
  // Optional: only set when using a named (non-default) Firestore database.
  firestoreDatabaseId: read('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || undefined,
};

/**
 * True when enough configuration is present to initialize Firebase.
 * Everything cloud-related must be gated on this.
 */
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && firebaseConfig.authDomain
);

/** Optional backend base URL for the AI interpretation endpoint. */
export const apiBaseUrl: string = read('VITE_API_BASE_URL').replace(/\/$/, '');

/** True when an AI interpretation backend has been configured. */
export const isAiBackendConfigured: boolean = Boolean(apiBaseUrl);
