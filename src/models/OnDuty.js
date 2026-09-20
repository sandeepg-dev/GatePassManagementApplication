/**
 * On-Duty (OD) Requisition Mongoose Model
 * Separate from Gate Pass (Pass.js)
 * Approval Workflow: Student -> Counsellor -> Class Advisor -> HOD -> Completed
 */
const mongoose = require('mongoose');
const { getISTTimeString } = require('../utils/formatters');

const OnDutySchema = new mongoose.Schema({
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
  parentContact: {
    type: String,
    default: '-'
  },
  
  // On-Duty Timing Configuration:
  // Can be 'dates' (From Date to To Date) or 'time' (From Time to To Time on a Date)
  mode: {
    type: String,
    enum: ['dates', 'time'],
    default: 'dates'
  },
  fromDate: {
    type: String,
    default: ''
  },
  toDate: {
    type: String,
    default: ''
  },
  specificDate: {
    type: String,
    default: ''
  },
  fromTime: {
    type: String,
    default: ''
  },
  toTime: {
    type: String,
    default: ''
  },

  reason: {
    type: String,
    required: true,
    trim: true
  },
  placeEvent: {
    type: String,
    default: '-'
  },
  expectedReturnTime: {
    type: String,
    default: '-'
  },

  status: {
    type: String,
    enum: [
      'Pending Counselor',
      'Pending Advisor',
      'Pending HOD',
      'Completed',
      'Rejected'
    ],
    default: 'Pending Counselor',
    index: true
  },

  appliedTime: {
    type: String,
    default: () => getISTTimeString()
  },

  odLetter: {
    type: String,
    default: ''
  },

  // Milestone Clearances
  counselorApproval: {
    counselorName: String,
    approved: { type: Boolean, default: false },
    time: String,
    remarks: String
  },
  advisorApproval: {
    advisorName: String,
    approved: { type: Boolean, default: false },
    time: String,
    remarks: String
  },
  hodApproval: {
    hodName: String,
    approved: { type: Boolean, default: false },
    time: String,
    remarks: String
  },

  // Rejection Record
  rejection: {
    rejected: { type: Boolean, default: false },
    rejectedBy: String,
    role: String,
    roleTitle: String,
    reason: String,
    time: String
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('OnDuty', OnDutySchema);
