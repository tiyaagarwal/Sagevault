require('dotenv').config();

// Fail fast on boot if required configuration is missing, instead of a
// confusing crash deep inside a downstream module (e.g. the Gemini client
// throwing on missing GOOGLE_API_KEY) or silently signing JWTs with `undefined`.
// This must run before requiring any router, since some of them construct
// LLM clients as a module-level side effect at require() time.
const REQUIRED_ENV_VARS = ['MONGODB_URL', 'JWT_SECRET', 'GOOGLE_API_KEY'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`FATAL: missing required environment variable(s): ${missingEnvVars.join(', ')}`);
  console.error('See backend/sample.env for the full list of required variables.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors'); // Import cors
const authRouter = require('./routes/Auth'); // Import auth routes
const documentRouter = require('./routes/Document');
const chatRouter = require('./routes/Chat');
// Import database connection
const connectDB = require('./config/database');

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});