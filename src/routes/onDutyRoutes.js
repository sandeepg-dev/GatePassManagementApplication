/**
 * On-Duty (OD) Routes
 */
const express = require('express');
const router = express.Router();
const onDutyController = require('../controllers/onDutyController');

router.post('/apply', onDutyController.applyOnDuty);
router.get('/', onDutyController.getOnDutyRequests);
router.get('/:id', onDutyController.getOnDutyById);
router.post('/approve/counselor', onDutyController.approveCounselorOD);
router.post('/approve/advisor', onDutyController.approveAdvisorOD);
router.post('/approve/hod', onDutyController.approveHodOD);
router.post('/reject', onDutyController.rejectOnDuty);

module.exports = router;
