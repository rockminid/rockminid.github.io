import React, { useState, useEffect } from 'react';
import {
  MessageSquarePlus,
  Star,
  Bug,
  Lightbulb,
  Database,
  Palette,
  MessageCircle,
  CheckCircle2,
  X,
  Send,
  History,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitUserFeedback, getLocalFeedbackHistory, FeedbackSubmission } from '../services/feedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSampleName?: string;
  activeSampleContext?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  activeSampleName,
  activeSampleContext,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<'bug' | 'feature' | 'data' | 'ux' | 'other'>('feature');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [attachSampleContext, setAttachSampleContext] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<FeedbackSubmission[]>([]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setHistoryItems(getLocalFeedbackHistory());
      setSubmittedMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = [
    { id: 'bug' as const, label: 'Bug Report', icon: Bug, color: 'text-rose-400 border-rose-800/60 bg-rose-950/30' },
    { id: 'feature' as const, label: 'Feature Request', icon: Lightbulb, color: 'text-amber-400 border-amber-800/60 bg-amber-950/30' },
    { id: 'data' as const, label: 'Mineral/Rock Data', icon: Database, color: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/30' },
    { id: 'ux' as const, label: 'UI & Usability', icon: Palette, color: 'text-purple-400 border-purple-800/60 bg-purple-950/30' },
    { id: 'other' as const, label: 'General Feedback', icon: MessageCircle, color: 'text-sky-400 border-sky-800/60 bg-sky-950/30' },
  ];

  const ratingLabels = ['Needs Work', 'Fair', 'Good', 'Very Good', 'Exceptional Petrology Platform'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      const contextToAttach = attachSampleContext && activeSampleContext
        ? `Sample: ${activeSampleName || 'Active'} | ${activeSampleContext}`
        : undefined;

      const result = await submitUserFeedback(
        {
          category,
          rating,
          message,
          userEmail: email.trim() || undefined,
          sampleContext: contextToAttach,
        },
        user
      );

      setSubmittedMessage(result.message);
      setMessage('');
      setHistoryItems(getLocalFeedbackHistory());
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setSubmittedMessage('Feedback saved locally. Thank you for your support!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md">
              <MessageSquarePlus className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                User Feedback &amp; Suggestions
              </h2>
              <p className="text-xs text-stone-400">
                Help improve RockMin ID&apos;s geochemical algorithms &amp; petrographic tools
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1 transition-colors ${
                showHistory
                  ? 'bg-amber-600 text-stone-950 font-semibold'
                  : 'bg-stone-800 text-stone-300 hover:text-stone-100 hover:bg-stone-700'
              }`}
              title="View your submitted feedback history"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">History ({historyItems.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-stone-300 space-y-4">
          {submittedMessage ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-stone-100">Feedback Received</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
                {submittedMessage}
              </p>
              <div className="pt-3 flex justify-center gap-2">
                <button
                  onClick={() => setSubmittedMessage(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium transition-colors"
                >
                  Submit Another Note
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shadow-md transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : showHistory ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-semibold text-stone-200">Your Past Submissions</span>
                <span>{historyItems.length} total</span>
              </div>
              {historyItems.length === 0 ? (
                <div className="p-8 text-center text-stone-500 border border-dashed border-stone-800 rounded-xl">
                  No feedback submitted from this browser yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {historyItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-stone-950 border border-stone-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-850 text-amber-400 border border-stone-700">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < item.rating ? 'fill-amber-400' : 'text-stone-700'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-stone-200 text-xs whitespace-pre-wrap">{item.message}</p>
                      {item.sampleContext && (
                        <div className="text-[10px] text-stone-500 font-mono truncate">
                          Context: {item.sampleContext}
                        </div>
                      )}
                      <div className="text-[10px] text-stone-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Rating */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-stone-200">
                  How would you rate RockMin ID?
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
                      return (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="p-1 text-stone-600 hover:text-amber-400 transition-colors focus:outline-hidden"
                        >
                          <Star
                            className={`w-6 h-6 transition-all duration-100 ${
                              isFilled ? 'fill-amber-400 text-amber-400 scale-110' : 'text-stone-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs text-amber-300 font-medium pl-2">
                    {ratingLabels[((hoverRating !== null ? hoverRating : rating) || 5) - 1]}
                  </span>
                </div>
              </div>

              {/* Feedback Category */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-stone-200">
                  Feedback Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all ${
                          isSelected
                            ? `${cat.color} font-semibold shadow-md`
                            : 'border-stone-800 bg-stone-950 text-stone-400 hover:bg-stone-850 hover:text-stone-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-xs truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Details */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-message" className="block font-semibold text-stone-200">
                  Your Message or Suggestion <span className="text-amber-500">*</span>
                </label>
                <textarea
                  id="feedback-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe any issues, request new ternary diagrams (e.g., Foid-bearing, Harker plots), or recommend rock reference additions..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-hidden focus:border-amber-500 transition-colors text-xs resize-y"
                  maxLength={3000}
                />
                <div className="text-[10px] text-stone-500 text-right">
                  {message.length} / 3000 characters
                </div>
              </div>

              {/* Contact Email */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-email" className="block font-semibold text-stone-200">
                  Your Email (Optional — for follow-up)
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="geologist@university.edu"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-hidden focus:border-amber-500 transition-colors text-xs"
                />
              </div>

              {/* Attach Current Sample Context */}
              {activeSampleContext && (
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="attach-sample"
                    checked={attachSampleContext}
                    onChange={(e) => setAttachSampleContext(e.target.checked)}
                    className="mt-0.5 rounded-md border-stone-700 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="attach-sample" className="text-[11px] text-stone-400 cursor-pointer">
                    <span className="text-stone-200 font-semibold">Include active sample data:</span>{' '}
                    <span className="text-amber-400">{activeSampleName || 'Sample'}</span> —{' '}
                    <span className="font-mono text-[10px] text-stone-400 truncate block">
                      {activeSampleContext}
                    </span>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
