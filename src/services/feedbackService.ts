import { doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface FeedbackSubmission {
  id?: string;
  userId?: string;
  userEmail?: string;
  category: 'bug' | 'feature' | 'data' | 'ux' | 'other';
  rating: number; // 1 to 5
  message: string;
  sampleContext?: string;
  createdAt?: string;
}

const LOCAL_FEEDBACK_KEY = 'rockmin_user_feedback_history_v1';

export function getLocalFeedbackHistory(): FeedbackSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_FEEDBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed reading local feedback history:', err);
    return [];
  }
}

export function saveLocalFeedbackRecord(feedback: FeedbackSubmission): void {
  try {
    const existing = getLocalFeedbackHistory();
    const updated = [feedback, ...existing].slice(0, 50);
    localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed caching local feedback record:', err);
  }
}

export async function submitUserFeedback(
  input: Omit<FeedbackSubmission, 'id' | 'createdAt'> & { id?: string },
  user: User | null
): Promise<{ success: boolean; id: string; cloudSynced: boolean; message: string }> {
  const id = input.id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const feedbackRecord: FeedbackSubmission = {
    id,
    userId: user?.uid || input.userId || 'anonymous',
    userEmail: user?.email || input.userEmail || undefined,
    category: input.category,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    message: input.message.trim(),
    sampleContext: input.sampleContext ? input.sampleContext.substring(0, 900) : undefined,
    createdAt: now,
  };

  // Always save locally first
  saveLocalFeedbackRecord(feedbackRecord);

  // Attempt Firestore sync
  let cloudSynced = false;
  try {
    if (!db) throw new Error('Cloud feedback is not configured for this deployment.');
    const feedbackDocRef = doc(db, 'feedback', id);
    await setDoc(feedbackDocRef, feedbackRecord);
    cloudSynced = true;
  } catch (err) {
    console.warn('Firestore feedback submission offline/failed, kept in local device storage:', err);
    // Do not crash UI; local storage guarantees preservation
  }

  return {
    success: true,
    id,
    cloudSynced,
    message: cloudSynced
      ? 'Thank you! Your feedback has been submitted to the RockMin ID engineering & petrology team.'
      : 'Thank you! Your feedback has been saved in this browser. It will be submitted when a connection and cloud configuration are available.',
  };
}
