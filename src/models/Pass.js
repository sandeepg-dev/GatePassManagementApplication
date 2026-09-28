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
  requestCategory: {
    type: String,
    enum: ['gate_pass', 'leave'],
    default: 'gate_pass',
    index: true
  },
  leaveType: {
    type: String,
    default: 'Personal Leave'
  },
  placeOrEvent: {
    type: String,
    default: ''
  },
  destination: {
    type: String,
    default: ''
  },
  hostelRoom: {
    type: String,
    default: ''
  },
  hostelBlock: {
    type: String,
    default: ''
  },
  hostelDepartureInfo: {
    type: String,
    default: ''
  },
  hostelReturnInfo: {
    type: String,
    default: ''
  },
  contactNumber: {
    type: String,
    default: ''
  },
  fromDate: {
    type: String,
    default: ''
  },
  toDate: {
    type: String,
    default: ''
  },
  additionalDetails: {
    type: String,
    default: ''
  },
  formalLetter: {
    type: String,
    default: ''
  },
  status: {
    type: String,
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
    principalName: String,
    approved: { type: Boolean, default: false },
    time: String
  },
  wardenApproval: {
    wardenName: String,
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

  gatePassId: {
    type: String,
    index: true,
    trim: true
  },
  finalApprovingAuthority: {
    type: String,
    default: ''
  },
  finalApprovalTime: {
    type: String,
    default: ''
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
  },
  clearedByAuthorities: [{
    type: String,
    index: true
  }]
});

// Targeted Compound Indexes for sub-millisecond authority query response
PassSchema.index({ counselorName: 1, status: 1, createdAt: -1 });
PassSchema.index({ dept: 1, yearSec: 1, status: 1 });
PassSchema.index({ dept: 1, status: 1 });
PassSchema.index({ accommodation: 1, gender: 1, status: 1 });
PassSchema.index({ rollNo: 1, createdAt: -1 });
PassSchema.index({ isOD: 1, status: 1 });

module.exports = mongoose.model('Pass', PassSchema);
