/**
 * Student Batch Upload and Roster Routes
 */
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const studentController = require('../controllers/studentController');

router.post('/upload-students', upload.single('file'), studentController.uploadStudents);
router.get('/students/count', studentController.getStudentCount);

module.exports = router;
