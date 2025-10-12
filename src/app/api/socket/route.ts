/**
 * Socket.io API Route
 * Initializes WebSocket server for real-time competition updates
 *
 * NOTE: WebSockets require a persistent server connection.
 * This works in development but requires a custom deployment for production.
 * For Vercel deployment, consider using Vercel's WebSocket support or a separate
 * WebSocket server (e.g., Railway, Render, AWS EC2).
 */

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      message: 'WebSocket server endpoint',
      path: '/api/socket',
      status: 'Socket.io requires custom server setup',
      docs: 'See docs/WEBSOCKET_SETUP.md for deployment instructions',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// For development with custom server (server.js)
// Socket.io will be initialized there
