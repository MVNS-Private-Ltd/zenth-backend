require('dotenv').config();
const express = require('express');
const cors = require('cors');

const leadsRouter = require('./routes/leads');
const adminRouter = require('./routes/admin');
const memberRouter = require('./routes/member');
const chatRouter = require('./routes/chat');

const app = express();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'https://zenthweb.dev',
  'https://www.zenthweb.dev',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow any Vercel preview URL for this project
      if (origin.match(/https:\/\/zenth.*\.vercel\.app/)) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json()); // Parse JSON bodies

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Mount routes
app.use('/api/leads', leadsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/member', memberRouter);
app.use('/api/chat', chatRouter);

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
