require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const leadsRouter = require('./routes/leads');
const adminRouter = require('./routes/admin');
const memberRouter = require('./routes/member');
const chatRouter = require('./routes/chat');

const app = express();

// Trust proxy is required when running behind a reverse proxy (like Railway/Heroku/Render)
// so that rate limiting uses the real client IP instead of the proxy's IP.
app.set('trust proxy', 1);

// 1. Security Headers (Helmet)
// Disabling crossOriginResourcePolicy allows cross-origin requests (necessary for our API)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS
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
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      // Allow Vercel preview deployments securely
      if (origin.match(/^https:\/\/zenth.*\.vercel\.app$/)) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) return callback(null, true);
      
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// 3. Body Parsing
app.use(express.json({ limit: '1mb' })); // Limit body size to prevent payload too large attacks

// 4. Rate Limiting
// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Strict Rate Limiter for Sensitive Routes (Auth, Leads)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 sensitive requests per windowMs
  message: { error: 'Too many attempts from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Health Check (Unauthenticated & lightweight)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 6. Routes
app.use('/api/leads', strictLimiter, leadsRouter);
// Apply strict limiter to login specifically
app.use('/api/admin/login', strictLimiter);
app.use('/api/admin', adminRouter);
app.use('/api/member/login', strictLimiter); // Assuming member might have login, good practice
app.use('/api/member', memberRouter);
app.use('/api/chat', chatRouter);

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: 'CORS policy violation.' });
  }
  
  console.error('[server] Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // ─── Keep-alive ping (Render free tier shuts down after 15min of inactivity) ───
  // Pings our own /health endpoint every 14 minutes to prevent cold starts.
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      const res = await fetch(`${SELF_URL}/health`);
      console.log(`[keep-alive] Pinged /health → ${res.status}`);
    } catch (err) {
      console.warn('[keep-alive] Ping failed:', err.message);
    }
  }, 14 * 60 * 1000); // every 14 minutes
});
