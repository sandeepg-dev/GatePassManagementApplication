/**
 * Security Gate Barcode Scan Routes
 */
const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

router.post('/scan-pass', scanController.scanPass);
router.get('/scan-history', scanController.getScanHistory);

module.exports = router;
