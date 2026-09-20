/**
 * Gate Pass Mongoose Model
 */
const mongoose = require('mongoose');
const { getISTTimeString } = require('../utils/formatters');

const PassSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    index: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    default: 'Student'
  },
  academicYear: {
    type: String,
    default: '3 Year'
  },
  dept: {
    type: String,
    uppercase: true,
    index: true
  },
  yearSec: {
    type: String,
    uppercase: true,
    index: true
  },
  accommodation: {
    type: String,
    default: 'Day Scholar'
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Male'
  },
  counselorName: {
    type: String,
    index: true
  },
  mobile: {
    type: String,
    default: '-'
  },
  parentName: {
    type: String,
    default: '-'
  },
  fatherName: {
    type: String,
    default: '-'
  },
  parentContact: {
    type: String,
    default: '-'
  },
  email: {
    type: String,
    default: '-'
  },
  address: {
    type: String,
    default: 'GRT College Campus'
  },
  reason: {
    type: String,
    required: true
  },
  leaveDate: {
    type: String,
    default: ''
  },
  leaveTime: {
    type: String,
    default: ''
  },
  departureDate: {
    type: String,
    default: ''
  },
  departureTime: {
    type: String,
    default: ''
  },
  expectedReturnDate: {
    type: String,
    default: ''
  },
  expectedReturnTime: {
    type: String,
    default: ''
  },
  expectedReturnDateTime: {
    type: String,
    default: ''
  },
  formalLetter: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: [
      'Pending Counselor',
      'Pending Advisor',
      'Pending HOD',
      'Pending Principal',
      'Pending Boys Warden',
      'Pending Girls Warden',
      'Approved',
      'Exited',
      'Returned',
      'Expired',
      'Rejected'
    ],
    default: 'Pending Counselor',
    index: true
  },
  appliedTime: {
    type: String,
    default: () => getISTTimeString()
  },
  parentCalledBy: {
    type: String,
    default: '-'
  },
  parentCallVerified: {
    type: Boolean,
    default: false
  },
  parentCallTime: {
    type: String,
    default: '-'
  },

  counselorApproval: {
    counselorName: String,
    approved: { type: Boolean, default: false },
    time: String
  },
  advisorApproval: {
    advisorName: String,
    approved: { type: Boolean, default: false },
    time: String
  },
  hodApproval: {
    hodName: String,
    approved: { type: Boolean, default: false },
    time: String
  },
  principalApproval: {
    approved: { type: Boolean, default: false },
    time: String
  },
  wardenApproval: {
    approved: { type: Boolean, default: false },
    time: String
  },

  customExitTime: {
    type: String,
    default: ''
  },
  customReturnTime: {
    type: String,
    default: ''
  },

  rejectionReason: {
    type: String,
    default: ''
  },
  rejectedBy: {
    type: String,
    default: ''
  },
  rejectedTime: {
    type: String,
    default: ''
  },
  rejection: {
    rejected: { type: Boolean, default: false },
    rejectedBy: String,
    role: String,
    roleTitle: String,
    reason: String,
    time: String
  },

  approvalTime: String,
  validUntil: String,
  expiresAt: {
    type: Date,
    index: true
  },
  exitStatus: {
    type: String,
    default: 'Inside Campus'
  },
  exitTime: {
    type: String,
    default: '-'
  },
  returnStatus: {
    type: String,
    default: 'Not Returned'
  },
  returnTime: {
    type: String,
    default: '-'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Pass', PassSchema);
