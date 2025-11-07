'use client';

/**
 * Feedback Widget Component
 *
 * Always-visible feedback button positioned beside support chat button.
 * Features:
 * - Optional star rating (1-5)
 * - Required feedback type selection
 * - Required comment field with contextual prompts
 * - Auto-popup on every 5th login
 * - Beautiful UI matching support button aesthetic
 *
 * Created: November 7, 2025
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface FeedbackWidgetProps {
  userRole: 'studio_director' | 'competition_director' | 'super_admin';
}

type FeedbackType = 'dream_feature' | 'clunky_experience' | 'bug_report' | 'general';

const feedbackTypeConfig: Record<FeedbackType, { icon: string; label: string; prompt: string; color: string }> = {
  dream_feature: {
    icon: '🌟',
    label: 'Dream Feature',
    prompt: 'What feature would make your experience 10x better?',
    color: '#fbbf24',
  },
  clunky_experience: {
    icon: '🐌',
    label: 'Clunky/Tedious Experience',
    prompt: 'Which part of the process felt tedious or confusing?',
    color: '#f59e0b',
  },
  bug_report: {
    icon: '🐛',
    label: 'Bug Report',
    prompt: 'What went wrong? Please describe what happened.',
    color: '#ef4444',
  },
  general: {
    icon: '💬',
    label: 'General Feedback',
    prompt: 'Share your thoughts with us!',
    color: '#3b82f6',
  },
};

export function FeedbackWidget({ userRole }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [starRating, setStarRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const submitMutation = trpc.feedback.submit.useMutation();

  // Don't show for super admin
  if (userRole === 'super_admin') {
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedType || !comment.trim()) return;

    setIsSubmitting(true);

    try {
      await submitMutation.mutateAsync({
        feedbackType: selectedType,
        starRating: starRating || undefined,
        comment: comment.trim(),
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });

      // Show success message
      setShowSuccess(true);
      setIsOpen(false);

      // Reset form
      setSelectedType(null);
      setStarRating(null);
      setComment('');

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentConfig = selectedType ? feedbackTypeConfig[selectedType] : null;

  return (
    <>
      {/* Trigger Button - Positioned left of support button with safe spacing */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 animate-pulse-glow"
        title="Give Feedback"
      >
        <span className="text-xl">💡</span>
        <span className="font-medium">Feedback</span>
      </button>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 animate-slide-in">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-bold">Thank you!</div>
            <div className="text-sm">Your feedback has been received.</div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Help us improve CompSync!</h2>
                  <p className="text-purple-100 mt-1">Your feedback shapes our roadmap</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Star Rating (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate your overall experience? (optional)
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setStarRating(star)}
                      className="text-4xl transition-transform hover:scale-110 text-gray-400 hover:text-gray-600"
                    >
                      {star <= (starRating || 0) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Type Selection (Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What type of feedback? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(feedbackTypeConfig) as FeedbackType[]).map((type) => {
                    const config = feedbackTypeConfig[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedType === type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{config.icon}</span>
                          <span className="font-medium text-gray-900 text-sm">{config.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Field with Contextual Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentConfig ? currentConfig.prompt : 'Your feedback'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    currentConfig
                      ? currentConfig.prompt
                      : 'Tell us what you think...'
                  }
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 min-h-[150px] resize-y text-gray-900 placeholder:text-gray-400"
                  maxLength={5000}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {comment.length} / 5000 characters
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedType || !comment.trim() || isSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.4);
          }
          50% {
            box-shadow: 0 10px 25px -3px rgba(139, 92, 246, 0.6);
          }
        }

        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
