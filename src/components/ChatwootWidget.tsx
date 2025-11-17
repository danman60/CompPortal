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
  websocketURL?: string;
  user?: {
    name?: string;
    email?: string;
    identifier?: string;
  };
  customAttributes?: Record<string, string>;
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
  websocketURL,
  user,
  customAttributes,
  locale = 'en',
}: ChatwootWidgetProps) {
  useEffect(() => {
    // Skip if no token or baseUrl
    if (!websiteToken || !baseUrl) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('ChatwootWidget: Missing websiteToken or baseUrl', { websiteToken, baseUrl });
      }
      return;
    }

    // Additional safety check to prevent undefined in template literal
    if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
      console.error('ChatwootWidget: Invalid baseUrl', { baseUrl });
      return;
    }

    // Prevent duplicate script loading
    if (document.querySelector(`script[src="${baseUrl}/packs/js/sdk.js"]`)) {
      return;
    }

    // Configure Chatwoot settings
    window.chatwootSettings = {
      hideMessageBubble: true, // Hide default bubble - we use custom Support button
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
        // Build config object with user info if provided
        const config: any = {
          websiteToken,
          baseUrl,
        };

        // Add websocketURL if provided (required for some deployments)
        if (websocketURL) {
          config.websocketURL = websocketURL;
        }

        // Add user info directly to config (Chatwoot's recommended approach)
        if (user && user.email) {
          config.user = {
            email: user.email,
            name: user.name || user.email,
            identifier_hash: user.identifier, // Optional: for identity verification
          };
        }

        // Add custom attributes for support context
        if (customAttributes && Object.keys(customAttributes).length > 0) {
          config.customAttributes = customAttributes;
        }

        // Wrap SDK initialization to suppress known race condition errors
        try {
          window.chatwootSDK.run(config);
        } catch (error) {
          // Suppress known Chatwoot SDK race condition with contentWindow
          // This is a cosmetic error that doesn't affect functionality
          if (error instanceof Error && error.message?.includes('contentWindow')) {
            if (process.env.NODE_ENV === 'development') {
              console.debug('Chatwoot SDK race condition (harmless, widget will still work):', error.message);
            }
          } else {
            // Re-throw unexpected errors
            console.error('ChatwootWidget: Unexpected SDK initialization error', error);
            throw error;
          }
        }
      }
    };

    script.onerror = () => {
      console.error('ChatwootWidget: Failed to load Chatwoot SDK', {
        scriptSrc: script.src,
        possibleCause: 'Mixed content (HTTP on HTTPS page) or server unavailable',
        solution: 'Ensure Chatwoot server is accessible via HTTPS',
      });
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
  }, [websiteToken, baseUrl, websocketURL, user, customAttributes, locale]);

  // Widget is injected by script, no UI needed
  return null;
}
