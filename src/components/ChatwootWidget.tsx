'use client';

/**
 * Chatwoot Widget Component
 *
 * Dynamically loads Chatwoot chat widget with specified token.
 * Used for multi-inbox support (SD→Tech, SD→CD, CD→Tech)
 *
 * Wave 4.1: Chatwoot Integration
 */

import { useEffect } from 'react';

interface ChatwootWidgetProps {
  websiteToken: string;
  baseUrl: string;
  user?: {
    name?: string;
    email?: string;
    identifier?: string;
  };
  locale?: string;
}

declare global {
  interface Window {
    $chatwoot?: {
      toggle: () => void;
      isOpen: boolean;
    };
    chatwootSettings?: {
      hideMessageBubble?: boolean;
      position?: 'left' | 'right';
      locale?: string;
      type?: 'standard' | 'expanded_bubble';
    };
    chatwootSDK?: {
      run: (settings: any) => void;
    };
  }
}

export function ChatwootWidget({
  websiteToken,
  baseUrl,
  user,
  locale = 'en',
}: ChatwootWidgetProps) {
  useEffect(() => {
    // Skip if no token
    if (!websiteToken || !baseUrl) {
      console.warn('ChatwootWidget: Missing websiteToken or baseUrl');
      return;
    }

    // Configure Chatwoot settings
    window.chatwootSettings = {
      hideMessageBubble: false,
      position: 'right',
      locale,
      type: 'standard',
    };

    // Load Chatwoot SDK script
    const script = document.createElement('script');
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.defer = true;
    script.async = true;

    script.onload = () => {
      if (window.chatwootSDK) {
        window.chatwootSDK.run({
          websiteToken,
          baseUrl,
        });

        // Set user if provided
        if (user) {
          // Wait for Chatwoot to be ready
          setTimeout(() => {
            if (window.$chatwoot) {
              // Set user identity
              (window as any).chatwootSDK?.setUser?.(user.identifier || user.email, {
                name: user.name,
                email: user.email,
              });
            }
          }, 1000);
        }
      }
    };

    document.body.appendChild(script);

    // Cleanup function
    return () => {
      // Remove script
      if (script.parentNode) {
        document.body.removeChild(script);
      }

      // Remove Chatwoot bubble
      const bubble = document.querySelector('.woot-widget-bubble');
      const holder = document.querySelector('.woot-widget-holder');
      if (bubble) bubble.remove();
      if (holder) holder.remove();

      // Clean up global objects
      delete window.$chatwoot;
      delete window.chatwootSettings;
      delete window.chatwootSDK;
    };
  }, [websiteToken, baseUrl, user, locale]);

  // Widget is injected by script, no UI needed
  return null;
}
