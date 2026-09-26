/**
 * Authentication & Authorization Routes
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/check-role-exists', authController.checkRoleExists);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-session', authController.verifySession);

module.exports = router;
