/**
 * Multi-Tier Clearance Approval Routes
 */
const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');

router.post('/counselor', approvalController.approveCounselor);
router.post('/advisor', approvalController.approveAdvisor);
router.post('/hod', approvalController.approveHod);
router.post('/principal', approvalController.approvePrincipal);
router.post('/warden', approvalController.approveWarden);
router.post('/boys-warden', approvalController.approveBoysWarden);
router.post('/girls-warden', approvalController.approveGirlsWarden);
router.post('/warden-exit', approvalController.markWardenExit);
router.post('/warden-return', approvalController.markWardenReturn);
router.post('/reject', approvalController.rejectPass);

module.exports = router;
