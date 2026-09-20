import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
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

  // If user is authenticated, persist to Firestore
  if (user) {
    const path = `users/${user.uid}/savedSamples`;
    try {
      const docRef = doc(db, path, id);
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

  // If user is authenticated, delete from Firestore
  if (user) {
    const path = `users/${user.uid}/savedSamples`;
    try {
      const docRef = doc(db, path, sampleId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/${sampleId}`);
    }
  }
}

// Sync local samples to Firestore on login
export async function syncLocalCollectionToCloud(user: User): Promise<void> {
  const localItems = getLocalCollection();
  if (localItems.length === 0) return;

  const path = `users/${user.uid}/savedSamples`;
  for (const item of localItems) {
    if (!item.isSynced || item.userId !== user.uid) {
      try {
        const docRef = doc(db, path, item.id);
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
  const path = `users/${user.uid}/savedSamples`;
  const colRef = collection(db, path);

  const unsubscribe = onSnapshot(
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

  return unsubscribe;
}
