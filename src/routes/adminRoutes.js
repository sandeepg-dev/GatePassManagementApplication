/**
 * Administrator API Routes
 */
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const adminController = require('../controllers/adminController');

// Authentication & Dashboard Overview
router.post('/login', adminController.adminLogin);
router.get('/stats', adminController.getAdminStats);

// Student Roster & Bulk Management
router.get('/students', adminController.getStudents);
router.post('/students', adminController.createStudent);
router.put('/students/:id', adminController.updateStudent);
router.post('/students/:id/reset-password', adminController.resetStudentPassword);
router.delete('/students/clear-all', adminController.clearAllStudents);
router.post('/students/clear-all', adminController.clearAllStudents);
router.delete('/students/:id', adminController.deleteStudent);
router.post('/students/import', upload.single('file'), adminController.importStudentsExcel);

// Staff & Role Provisioning
router.get('/staff', adminController.getAllStaff);
router.post('/staff/counselor', adminController.assignCounselor);
router.post('/staff/advisor', adminController.assignAdvisor);
router.post('/staff/hod', adminController.assignHod);
router.post('/staff/principal', adminController.assignPrincipal);
router.post('/staff/warden', adminController.assignWarden);
router.post('/staff/:id/reset-password', adminController.resetStaffPassword);
router.delete('/staff/:id', adminController.deleteStaff);

module.exports = router;
