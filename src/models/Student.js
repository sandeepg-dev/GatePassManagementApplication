/**
 * Student Mongoose Model
 */
const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  academicYear: {
    type: String,
    default: '3 Year'
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
  dept: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  yearSec: {
    type: String,
    default: 'A',
    uppercase: true,
    trim: true
  },
  counselorName: {
    type: String,
    default: 'Class Counselor',
    trim: true
  },
  parentName: {
    type: String,
    default: '-',
    trim: true
  },
  mobile: {
    type: String,
    default: '-'
  },
  parentContact: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    default: '-'
  },
  address: {
    type: String,
    default: 'GRT College Campus'
  }
});

module.exports = mongoose.model('Student', StudentSchema);
