require('dotenv').config();
const express = require('express');
const cors = require('cors');

const leadsRouter = require('./routes/leads');
const adminRouter = require('./routes/admin');
const memberRouter = require('./routes/member');
const chatRouter = require('./routes/chat');

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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
