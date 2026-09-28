/**
 * Gate Pass Management Routes
 */
const express = require('express');
const router = express.Router();
const passController = require('../controllers/passController');
const onDutyController = require('../controllers/onDutyController');

router.get('/passes', passController.getPasses);
router.post('/apply-pass', passController.applyPass);
router.post('/apply-onduty', onDutyController.applyOnDuty);
router.post('/passes/clear-all', passController.clearAllPasses);
router.get('/counselor/attendance-sheet', passController.getCounselorAttendanceSheet);
router.get('/counselor/attendance-data', passController.getCounselorAttendanceData);

module.exports = router;
