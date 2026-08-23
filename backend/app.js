const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/Auth');
const documentRouter = require('./routes/Document');
const chatRouter = require('./routes/Chat');

// Builds the Express app without connecting to Mongo or binding a port, so
// it can be required directly by tests (supertest) without starting a
// real server or requiring a live database connection to import it.
function createApp() {
  const app = express();

  // CORS middleware — restricted to the configured frontend origin(s) rather
  // than reflecting any origin, since this API carries auth tokens and user data.
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  }));

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/document', documentRouter);
  app.use('/api/v1/chat', chatRouter);

  // 404 for any route that didn't match above
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Centralized error handler — catches CORS rejections and anything thrown
  // synchronously in a route/middleware, so clients get a clean JSON error
  // instead of an unhandled 500 with a stack trace.
  app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
