'use client';

import { useState } from 'react';
import { NotificationPreferences, useNotificationPreferences, getPreferenceSummary } from '@/hooks/useNotificationPreferences';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Notification Preferences Modal
 * Complete settings UI for notification preferences
 */
export function NotificationPreferencesModal({
  isOpen,
  onClose,
}: NotificationPreferencesModalProps) {
  const {
    preferences,
    updatePreference,
    toggleType,
    toggleChannel,
    setQuietHours,
    setGrouping,
    resetPreferences,
  } = useNotificationPreferences();

  const [quietStart, setQuietStart] = useState(preferences.quietHours.start);
  const [quietEnd, setQuietEnd] = useState(preferences.quietHours.end);

  if (!isOpen) return null;

  const handleSaveQuietHours = () => {
    setQuietHours(preferences.quietHours.enabled, quietStart, quietEnd);
  };

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
                <p className="text-sm text-gray-400 mt-1">Customize how you receive notifications</p>
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
            {/* General Settings */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
              <div className="space-y-3">
                <ToggleItem
                  label="Enable Notifications"
                  description="Turn all notifications on or off"
                  checked={preferences.enabled}
                  onChange={(checked) => updatePreference('enabled', checked)}
                />
                <ToggleItem
                  label="Desktop Notifications"
                  description="Show browser notifications even when EMPWR isn't open"
                  checked={preferences.desktop}
                  onChange={(checked) => updatePreference('desktop', checked)}
                  disabled={!preferences.enabled}
                />
                <ToggleItem
                  label="Sound"
                  description="Play sound when receiving notifications"
                  checked={preferences.sound}
                  onChange={(checked) => updatePreference('sound', checked)}
                  disabled={!preferences.enabled}
                />
              </div>
            </section>

            {/* Notification Types */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Notification Types</h3>
              <div className="space-y-3">
                <ToggleItem
                  label="Info"
                  description="General information and updates"
                  icon="💡"
                  checked={preferences.types.info}
                  onChange={() => toggleType('info')}
                  disabled={!preferences.enabled}
                />
                <ToggleItem
                  label="Success"
                  description="Confirmations and completed actions"
                  icon="✅"
                  checked={preferences.types.success}
                  onChange={() => toggleType('success')}
                  disabled={!preferences.enabled}
                />
                <ToggleItem
                  label="Warnings"
                  description="Important alerts that need attention"
                  icon="⚠️"
                  checked={preferences.types.warning}
                  onChange={() => toggleType('warning')}
                  disabled={!preferences.enabled}
                />
                <ToggleItem
                  label="Errors"
                  description="Critical issues and failures"
                  icon="❌"
                  checked={preferences.types.error}
                  onChange={() => toggleType('error')}
                  disabled={!preferences.enabled}
                />
              </div>
            </section>

            {/* Quiet Hours */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Quiet Hours</h3>
              <div className="space-y-3">
                <ToggleItem
                  label="Enable Quiet Hours"
                  description="Mute notifications during specified times (errors still shown)"
                  checked={preferences.quietHours.enabled}
                  onChange={(checked) => setQuietHours(checked, quietStart, quietEnd)}
                  disabled={!preferences.enabled}
                />
                {preferences.quietHours.enabled && (
                  <div className="pl-4 border-l-2 border-purple-500/30 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={quietStart}
                          onChange={(e) => setQuietStart(e.target.value)}
                          onBlur={handleSaveQuietHours}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={quietEnd}
                          onChange={(e) => setQuietEnd(e.target.value)}
                          onBlur={handleSaveQuietHours}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      Quiet hours: {quietStart} to {quietEnd}
                      {quietStart > quietEnd && ' (overnight)'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Grouping */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">Grouping</h3>
              <div className="space-y-3">
                <ToggleItem
                  label="Group Similar Notifications"
                  description="Combine similar notifications to reduce clutter"
                  checked={preferences.grouping.enabled}
                  onChange={(checked) => setGrouping(checked)}
                  disabled={!preferences.enabled}
                />
                {preferences.grouping.enabled && (
                  <div className="pl-4 border-l-2 border-purple-500/30 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Grouping Strategy
                      </label>
                      <select
                        value={preferences.grouping.strategy}
                        onChange={(e) => setGrouping(
                          true,
                          e.target.value as NotificationPreferences['grouping']['strategy']
                        )}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        <option value="auto" className="bg-gray-900">Auto-detect</option>
                        <option value="type" className="bg-gray-900">By Type</option>
                        <option value="title" className="bg-gray-900">By Title</option>
                        <option value="time" className="bg-gray-900">By Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Minimum Group Size: {preferences.grouping.minGroupSize}
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="5"
                        value={preferences.grouping.minGroupSize}
                        onChange={(e) => setGrouping(true, undefined, Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>2 notifications</span>
                        <span>5 notifications</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

interface ToggleItemProps {
  label: string;
  description: string;
  icon?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleItem({ label, description, icon, checked, onChange, disabled = false }: ToggleItemProps) {
  return (
    <div className={`flex items-start justify-between gap-4 p-4 rounded-lg bg-white/5 border border-white/10 transition-all ${
      disabled ? 'opacity-50' : 'hover:bg-white/10'
    }`}>
      <div className="flex items-start gap-3 flex-1">
        {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
        <div className="flex-1">
          <div className="font-medium text-white mb-1">{label}</div>
          <div className="text-sm text-gray-400">{description}</div>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 flex-shrink-0 ${
          checked ? 'bg-purple-500' : 'bg-gray-600'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/**
 * Compact Preferences Button
 * Opens the preferences modal
 */
export function NotificationPreferencesButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { preferences } = useNotificationPreferences();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10"
        title={getPreferenceSummary(preferences)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-sm font-medium">Preferences</span>
      </button>

      <NotificationPreferencesModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
