/**
 * Saved specimen collection.
 *
 * Local-first: every write hits localStorage synchronously, so the collection
 * works with no account and no network. Cloud mirroring is a best-effort
 * addition on top.
 *
 * The Firestore SDK is imported dynamically at each call site rather than at
 * the top of the module. A static import here pulled all ~528 kB of Firebase
 * into the entry chunk, so every visitor paid for it — including the majority
 * who never sign in.
 */

import type { User } from 'firebase/auth';
import { loadFirebase, handleFirestoreError, OperationType } from '../lib/firebase';
import { SavedSample } from '../types/geochem';

const LOCAL_STORAGE_KEY = 'geochem_saved_collection_v1';

// Get local collection from localStorage
export function getLocalCollection(): SavedSample[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading local sample collection:', err);
    return [];
  }
}

// Alias for compatibility
export const getSavedCollection = getLocalCollection;

// Save local collection to localStorage
export function saveLocalCollection(items: SavedSample[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving local sample collection:', err);
  }
}

// Save or create a sample in collection
export async function saveSampleToCollection(
  sample: Omit<SavedSample, 'id' | 'createdAt'> & { id?: string },
  user: User | null
): Promise<SavedSample> {
  const id = sample.id || `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const sampleTypeVal = sample.sampleType || sample.type || 'custom';

  const fullSample: SavedSample = {
    ...sample,
    id,
    userId: user?.uid,
    sampleType: sampleTypeVal,
    type: sampleTypeVal,
    identifiedAs: sample.identifiedAs || sample.identifiedName,
    identifiedName: sample.identifiedName || sample.identifiedAs,
    isSynced: !!user,
    syncedToCloud: !!user,
    createdAt: now,
    savedAt: now,
    updatedAt: now,
  };

  // Always update local cache first for instant feedback
  const existing = getLocalCollection();
  const filtered = existing.filter((item) => item.id !== id);
  const updatedList = [fullSample, ...filtered];
  saveLocalCollection(updatedList);

  // If signed in and cloud is configured, mirror to Firestore.
  const fb = user ? await loadFirebase() : null;
  if (user && fb) {
    const path = `users/${user.uid}/savedSamples`;
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const docRef = doc(fb.db, path, id);
      // Clean undefined values for Firestore compatibility
      const firestorePayload = JSON.parse(JSON.stringify({
        ...fullSample,
        userId: user.uid,
      }));

      await setDoc(docRef, firestorePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${path}/${id}`);
    }
  }

  return fullSample;
}

// Delete sample from collection
export async function deleteSampleFromCollection(
  sampleId: string,
  user: User | null
): Promise<void> {
  // Remove from local storage
  const existing = getLocalCollection();
  const updatedList = existing.filter((item) => item.id !== sampleId);
  saveLocalCollection(updatedList);

  // If signed in and cloud is configured, delete the mirrored copy too.
  const fb = user ? await loadFirebase() : null;
  if (user && fb) {
    const path = `users/${user.uid}/savedSamples`;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const docRef = doc(fb.db, path, sampleId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${sampleId}`);
    }
  }
}

// Sync local samples to Firestore on login
export async function syncLocalCollectionToCloud(user: User): Promise<void> {
  const localItems = getLocalCollection();
  // Checked before loading the SDK: an empty collection needs no network and
  // no 528 kB download.
  if (localItems.length === 0) return;

  const fb = await loadFirebase();
  if (!fb) return;
  const { doc, setDoc } = await import('firebase/firestore');

  const path = `users/${user.uid}/savedSamples`;
  for (const item of localItems) {
    if (!item.isSynced || item.userId !== user.uid) {
      try {
        const docRef = doc(fb.db, path, item.id);
        const syncedItem: SavedSample = {
          ...item,
          userId: user.uid,
          isSynced: true,
        };
        await setDoc(docRef, JSON.parse(JSON.stringify(syncedItem)));
      } catch (err) {
        console.warn('Failed to sync item to cloud:', item.id, err);
      }
    }
  }
}

// Real-time subscription to user collection
export function subscribeToUserCollection(
  user: User,
  onUpdate: (samples: SavedSample[]) => void
): () => void {
  // Serve what is already on the device immediately, so the list is never
  // empty while the SDK loads, and so a local-only deployment still works.
  onUpdate(getLocalCollection());

  let cancelled = false;
  let detach: (() => void) | null = null;

  void (async () => {
    const fb = await loadFirebase();
    if (cancelled || !fb) return;
    const { collection, onSnapshot } = await import('firebase/firestore');
    if (cancelled) return;

    const path = `users/${user.uid}/savedSamples`;
    const colRef = collection(fb.db, path);

    detach = onSnapshot(
    colRef,
    (snapshot) => {
      const cloudSamples: SavedSample[] = [];
      snapshot.forEach((docSnap) => {
        cloudSamples.push(docSnap.data() as SavedSample);
      });

      // Sort by creation date descending
      cloudSamples.sort((a, b) => new Date(b.createdAt || b.savedAt || 0).getTime() - new Date(a.createdAt || a.savedAt || 0).getTime());

      // Update local storage with cloud mirror
      saveLocalCollection(cloudSamples);
      onUpdate(cloudSamples);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
    );
  })();

  return () => {
    cancelled = true;
    if (detach) detach();
  };
}
