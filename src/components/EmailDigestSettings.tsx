'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  useEmailDigest,
  getScheduleDescription,
  getContentSummary,
} from '@/hooks/useEmailDigest';

interface EmailDigestSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Email Digest Settings Modal
 * Configure scheduled email summaries
 */
export function EmailDigestSettingsModal({ isOpen, onClose }: EmailDigestSettingsProps) {
  const {
    preferences,
    updatePreference,
    setFrequency,
    resetPreferences,
    getNextSendTime,
    isSaving,
  } = useEmailDigest();

  const [time, setTime] = useState(preferences.time);
  const [dayOfWeek, setDayOfWeek] = useState(preferences.dayOfWeek || 1);
  const [dayOfMonth, setDayOfMonth] = useState(preferences.dayOfMonth || 1);

  if (!isOpen) return null;

  const handleSaveTime = () => {
    updatePreference('time', time);
  };

  const handleSaveDay = () => {
    if (preferences.frequency === 'weekly') {
      setFrequency('weekly', dayOfWeek);
    } else if (preferences.frequency === 'monthly') {
      setFrequency('monthly', dayOfMonth);
    }
  };

  const nextSend = getNextSendTime();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Email Digest Settings</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {getScheduleDescription(preferences)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
            {/* Enable/Disable */}
            <section>
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">Enable Email Digest</div>
                  <div className="text-sm text-gray-400">
                    Receive scheduled email summaries of your activity
                  </div>
                </div>
                <button
                  onClick={() => updatePreference('enabled', !preferences.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 flex-shrink-0 ${
                    preferences.enabled ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={preferences.enabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {nextSend && (
                <p className="text-xs text-gray-400 mt-2 ml-4">
                  Next digest: {formatDistanceToNow(nextSend, { addSuffix: true })}
                </p>
              )}
            </section>

            {/* Frequency */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Frequency</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={preferences.frequency === 'daily'}
                    onChange={() => setFrequency('daily')}
                    disabled={!preferences.enabled}
                    className="w-4 h-4 text-purple-500 focus:ring-purple-500/50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Daily</div>
                    <div className="text-sm text-gray-400">Receive a digest every day</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={preferences.frequency === 'weekly'}
                    onChange={() => setFrequency('weekly', dayOfWeek)}
                    disabled={!preferences.enabled}
                    className="w-4 h-4 text-purple-500 focus:ring-purple-500/50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Weekly</div>
                    <div className="text-sm text-gray-400">Receive a digest once a week</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="monthly"
                    checked={preferences.frequency === 'monthly'}
                    onChange={() => setFrequency('monthly', dayOfMonth)}
                    disabled={!preferences.enabled}
                    className="w-4 h-4 text-purple-500 focus:ring-purple-500/50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Monthly</div>
                    <div className="text-sm text-gray-400">Receive a digest once a month</div>
                  </div>
                </label>
              </div>
            </section>

            {/* Day Selection */}
            {preferences.frequency === 'weekly' && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Day of Week</h3>
                <select
                  value={dayOfWeek}
                  onChange={(e) => {
                    setDayOfWeek(Number(e.target.value));
                    setFrequency('weekly', Number(e.target.value));
                  }}
                  disabled={!preferences.enabled}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value={0} className="bg-gray-900">Sunday</option>
                  <option value={1} className="bg-gray-900">Monday</option>
                  <option value={2} className="bg-gray-900">Tuesday</option>
                  <option value={3} className="bg-gray-900">Wednesday</option>
                  <option value={4} className="bg-gray-900">Thursday</option>
                  <option value={5} className="bg-gray-900">Friday</option>
                  <option value={6} className="bg-gray-900">Saturday</option>
                </select>
              </section>
            )}

            {preferences.frequency === 'monthly' && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-4">Day of Month</h3>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDayOfMonth(val);
                  }}
                  onBlur={handleSaveDay}
                  disabled={!preferences.enabled}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </section>
            )}

            {/* Time */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Time</h3>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                onBlur={handleSaveTime}
                disabled={!preferences.enabled}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </section>

            {/* Content */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Content to Include</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.includeActivities}
                    onChange={(e) => updatePreference('includeActivities', e.target.checked)}
                    disabled={!preferences.enabled}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500/50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Recent Activity</div>
                    <div className="text-sm text-gray-400">Latest updates and changes</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.includeNotifications}
                    onChange={(e) => updatePreference('includeNotifications', e.target.checked)}
                    disabled={!preferences.enabled}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500/50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Notifications</div>
                    <div className="text-sm text-gray-400">Unread notifications</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.includeUpcomingEvents}
                    onChange={(e) => updatePreference('includeUpcomingEvents', e.target.checked)}
                    disabled={!preferences.enabled}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500/50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Upcoming Events</div>
                    <div className="text-sm text-gray-400">Competitions and deadlines</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.includePendingActions}
                    onChange={(e) => updatePreference('includePendingActions', e.target.checked)}
                    disabled={!preferences.enabled}
                    className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500/50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Pending Actions</div>
                    <div className="text-sm text-gray-400">Tasks requiring your attention</div>
                  </div>
                </label>
              </div>
            </section>

            {/* Minimum Activity */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Send Threshold</h3>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Minimum items to send: {preferences.minimumActivityCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={preferences.minimumActivityCount}
                  onChange={(e) => updatePreference('minimumActivityCount', Number(e.target.value))}
                  disabled={!preferences.enabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Send even with 1 item</span>
                  <span>Need 10+ items</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Skip digest if fewer than {preferences.minimumActivityCount} item{preferences.minimumActivityCount > 1 ? 's' : ''} to report
                </p>
              </div>
            </section>

            {/* Summary */}
            <section className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-2">Summary</h3>
              <p className="text-sm text-gray-300 mb-1">
                {getScheduleDescription(preferences)}
              </p>
              <p className="text-xs text-gray-400">
                {getContentSummary(preferences).join(' • ')}
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/20 bg-white/5">
            <button
              onClick={resetPreferences}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all font-medium"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface EmailDigestButtonProps {
  className?: string;
}

/**
 * Compact Email Digest Settings Button
 * Opens the settings modal
 */
export function EmailDigestButton({ className = '' }: EmailDigestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { preferences } = useEmailDigest();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10 ${className}`}
        title={getScheduleDescription(preferences)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium">Email Digest</span>
        {preferences.enabled && (
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        )}
      </button>

      <EmailDigestSettingsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
