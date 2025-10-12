/**
 * Custom Next.js Server with Socket.io Support
 * Required for real-time WebSocket communication
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize WebSocket server
  // Import dynamically to avoid issues with ES modules
  import('./src/lib/websocket.mjs').then(({ wsManager }) => {
    wsManager.initialize(server);
    console.log('✅ WebSocket server initialized on /api/socket');
  }).catch((err) => {
    console.error('Failed to initialize WebSocket:', err);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
