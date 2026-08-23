require('dotenv').config();

// Fail fast on boot if required configuration is missing, instead of a
// confusing crash deep inside a downstream module (e.g. the Gemini client
// throwing on missing GOOGLE_API_KEY) or silently signing JWTs with `undefined`.
// This must run before requiring app.js, since some of its routers construct
// LLM clients as a module-level side effect at require() time.
const REQUIRED_ENV_VARS = ['MONGODB_URL', 'JWT_SECRET', 'GOOGLE_API_KEY'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`FATAL: missing required environment variable(s): ${missingEnvVars.join(', ')}`);
  console.error('See backend/sample.env for the full list of required variables.');
  process.exit(1);
}

const { createApp } = require('./app');
const connectDB = require('./config/database');

connectDB();

const app = createApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
