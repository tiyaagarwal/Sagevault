const rateLimit = require('express-rate-limit');

// Auth endpoints are the highest-value brute-force target (credential
// stuffing, password guessing) — cap attempts per IP independently of any
// other rate limiting the app may add elsewhere.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

module.exports = { authRateLimiter };
