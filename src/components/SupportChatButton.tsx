'use client';

/**
 * Support Chat Button Component
 *
 * Role-based chat selector for EMPWR support
 *
 * Chat Paths:
 * - SD (Studio Director): Tech Support OR Questions for CD
 * - CD (Competition Director): Tech Support
 * - SA (Super Admin): Not shown (has direct access)
 *
 * Wave 4.1: Chatwoot Integration
 */

import { useState, useEffect } from 'react';
import { ChatwootWidget } from './ChatwootWidget';

interface SupportChatButtonProps {
  userRole: 'studio_director' | 'competition_director' | 'super_admin';
  userEmail?: string;
  userName?: string;
  userId?: string;
}

type ChatPath = 'sd_tech' | 'sd_cd' | 'cd_tech';

export function SupportChatButton({
  userRole,
  userEmail,
  userName,
  userId,
}: SupportChatButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<ChatPath | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;
  const tokens = {
    sd_tech: process.env.NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN,
    sd_cd: process.env.NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN,
    cd_tech: process.env.NEXT_PUBLIC_CHATWOOT_CD_TECH_TOKEN,
  };

  // Don't show for super admin
  if (userRole === 'super_admin') {
    return null;
  }

  // Validate configuration
  if (!baseUrl || !tokens.sd_tech || !tokens.sd_cd || !tokens.cd_tech) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('SupportChatButton: Missing Chatwoot configuration');
    }
    return null;
  }

  const handleChatSelection = (path: ChatPath) => {
    setSelectedPath(path);
    setIsModalOpen(false);

    // Open Chatwoot widget after a brief delay
    setTimeout(() => {
      if (window.$chatwoot) {
        window.$chatwoot.toggle();
      }
    }, 500);
  };

  // Auto-select for CD (only one option)
  useEffect(() => {
    if (userRole === 'competition_director' && !selectedPath) {
      setSelectedPath('cd_tech');
    }
  }, [userRole, selectedPath]);

  const getChatConfig = () => {
    if (!selectedPath) return null;

    const token = tokens[selectedPath];
    if (!token) return null;

    return {
      websiteToken: token,
      baseUrl: baseUrl!,
      user: {
        identifier: userId,
        email: userEmail,
        name: userName,
      },
    };
  };

  const chatConfig = getChatConfig();

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => {
          if (userRole === 'studio_director') {
            // SD needs to choose between Tech Support and CD Questions
            setIsModalOpen(true);
          } else {
            // CD goes straight to tech support
            if (window.$chatwoot) {
              window.$chatwoot.toggle();
            }
          }
        }}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        title="Get Support"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        <span className="font-medium">Support</span>
      </button>

      {/* Chat Path Selection Modal (Studio Directors Only) */}
      {isModalOpen && userRole === 'studio_director' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Get Support
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Choose who you'd like to chat with
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Technical Support */}
              <button
                onClick={() => handleChatSelection('sd_tech')}
                className="w-full text-left p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      Technical Support
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Help with portal issues, bugs, or features
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* Option 2: Competition Director */}
              <button
                onClick={() => handleChatSelection('sd_cd')}
                className="w-full text-left p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Competition Director
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Questions about entries, reservations, or rules
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
              Your messages will be answered via email
            </div>
          </div>
        </div>
      )}

      {/* Load Chatwoot Widget */}
      {chatConfig && (
        <ChatwootWidget
          websiteToken={chatConfig.websiteToken}
          baseUrl={chatConfig.baseUrl}
          user={chatConfig.user}
        />
      )}
    </>
  );
}
