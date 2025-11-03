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
  tenantName?: string;
  subdomain?: string;
  studioName?: string;
  studioPublicCode?: string;
}

type ChatPath = 'sd_tech' | 'sd_cd' | 'cd_sa';

export function SupportChatButton({
  userRole,
  userEmail,
  userName,
  userId,
  tenantName,
  subdomain,
  studioName,
  studioPublicCode,
}: SupportChatButtonProps) {
  const [selectedPath, setSelectedPath] = useState<ChatPath | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;
  const websocketURL = process.env.NEXT_PUBLIC_CHATWOOT_WEBSOCKET_URL;
  const tokens = {
    sd_tech: process.env.NEXT_PUBLIC_CHATWOOT_SD_TECH_TOKEN,
    sd_cd: process.env.NEXT_PUBLIC_CHATWOOT_SD_CD_TOKEN,
    cd_sa: process.env.NEXT_PUBLIC_CHATWOOT_CD_SA_TOKEN,
  };

  // Don't show for super admin
  if (userRole === 'super_admin') {
    return null;
  }

  // Validate configuration
  if (!baseUrl || !tokens.sd_tech || !tokens.sd_cd || !tokens.cd_sa) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('SupportChatButton: Missing Chatwoot configuration');
    }
    return null;
  }

  // Auto-select tech support for everyone (single path)
  useEffect(() => {
    if (!selectedPath) {
      // Everyone goes to tech support (sd_tech for SD, cd_sa for CD)
      if (userRole === 'studio_director') {
        setSelectedPath('sd_tech');
      } else if (userRole === 'competition_director') {
        setSelectedPath('cd_sa');
      }
    }
  }, [userRole, selectedPath]);

  const getChatConfig = () => {
    if (!selectedPath) return null;

    const token = tokens[selectedPath];
    if (!token) return null;

    // Build custom attributes for Chatwoot
    const customAttributes: Record<string, string> = {};
    if (tenantName) customAttributes.tenant_name = tenantName;
    if (subdomain) customAttributes.subdomain = subdomain;
    if (studioName) customAttributes.studio_name = studioName;
    if (studioPublicCode) customAttributes.studio_public_code = studioPublicCode;

    return {
      websiteToken: token,
      baseUrl: baseUrl!,
      websocketURL: websocketURL,
      user: {
        identifier: userId,
        email: userEmail,
        name: userName,
      },
      customAttributes,
    };
  };

  const chatConfig = getChatConfig();

  return (
    <>
      {/* Floating Chat Button - Auto-opens tech support */}
      <button
        onClick={() => {
          // Everyone goes straight to tech support (no modal)
          if (typeof window !== 'undefined' && window.$chatwoot) {
            window.$chatwoot.toggle();
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

      {/* Load Chatwoot Widget */}
      {chatConfig && (
        <ChatwootWidget
          websiteToken={chatConfig.websiteToken}
          baseUrl={chatConfig.baseUrl}
          websocketURL={chatConfig.websocketURL}
          user={chatConfig.user}
          customAttributes={chatConfig.customAttributes}
        />
      )}
    </>
  );
}
