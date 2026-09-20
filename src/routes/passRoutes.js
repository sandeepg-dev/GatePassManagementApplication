/**
 * Gate Pass Management Routes
 */
const express = require('express');
const router = express.Router();
const passController = require('../controllers/passController');

router.get('/passes', passController.getPasses);
router.post('/apply-pass', passController.applyPass);
router.post('/passes/clear-all', passController.clearAllPasses);

module.exports = router;
