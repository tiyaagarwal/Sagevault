const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { auth} = require('../middlewares/auth');
const { authRateLimiter } = require('../middlewares/rateLimit');

// Auth routes
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.get('/profile', auth, authController.getProfile);

module.exports = router;