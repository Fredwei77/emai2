// Simple API server to run alongside Nginx for same-origin /api endpoints
// Usage:
//   1) Ensure Node.js >= 18 is installed on the server
//   2) Install runtime deps: npm i express
//   3) Set environment variables (OPENROUTER_API_KEY, SMTP_*)
//   4) Run: node server.cjs (or use pm2/systemd)

const express = require('express');

// Import existing handlers (Vercel-style: module.exports = (req, res) => {...})
const aiHealth = require('./api/ai-health.cjs');
const aiChat = require('./api/ai-chat.cjs');
const aiChatStream = require('./api/ai-chat-stream.cjs');
const models = require('./api/models.cjs');
const sendContact = require('./api/send-contact.cjs');

const app = express();

// JSON parser for POST bodies
app.use(express.json({ limit: '5mb' }));

// Health
app.get('/api/ai-health', (req, res) => aiHealth(req, res));

// Chat (non-streaming)
app.post('/api/ai-chat', (req, res) => aiChat(req, res));

// Chat (streaming, SSE)
app.post('/api/ai-chat/stream', (req, res) => {
  // Let the handler manage headers/streaming
  aiChatStream(req, res);
});

// Models list
app.get('/api/models', (req, res) => models(req, res));

// Send contact (GET verify, POST send)
app.get('/api/send-contact', (req, res) => sendContact(req, res));
app.post('/api/send-contact', (req, res) => sendContact(req, res));

// Basic error handler (avoid crashing on uncaught)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: err?.message || String(err) });
});

const port = Number(process.env.PORT || 9000);
app.listen(port, () => {
  console.log(`[emai2-api] running at http://127.0.0.1:${port}`);
});
