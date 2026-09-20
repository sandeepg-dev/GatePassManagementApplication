/**
 * User Mongoose Model
 */
const mongoose = require('mongoose');
const { VALID_ROLES } = require('../config/constants');

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: VALID_ROLES
  },
  academicYear: {
    type: String,
    default: '3 Year'
  },
  dept: {
    type: String,
    default: 'CSE',
    uppercase: true,
    trim: true
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
  yearSec: {
    type: String,
    default: 'A',
    uppercase: true,
    trim: true
  },
  startRoll: {
    type: String,
    default: '',
    trim: true
  },
  endRoll: {
    type: String,
    default: '',
    trim: true
  },
  extraRolls: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
