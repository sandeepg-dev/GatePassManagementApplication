/**
 * Central API Router Aggregator
 */
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const passRoutes = require('./passRoutes');
const approvalRoutes = require('./approvalRoutes');
const studentRoutes = require('./studentRoutes');
const scanRoutes = require('./scanRoutes');
const adminRoutes = require('./adminRoutes');
const onDutyRoutes = require('./onDutyRoutes');

// Mount modular sub-routers
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/approve', approvalRoutes);
router.use('/onduty', onDutyRoutes);
router.use('/', passRoutes);
router.use('/', studentRoutes);
router.use('/', scanRoutes);

module.exports = router;
