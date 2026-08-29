const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100
  },
  password: {
    type: String,
    required: true,
    maxlength: 250
  },
  mobile: {
    type: String,
    required: true,
    maxlength: 10
  },
  department: {
    type: String,
    required: true,
    maxlength: 50
  },
  collegeName: {
    type: String,
    required: true,
    maxlength: 500
  },
  gender: {
    type: String,
    maxlength: 10,
    default: ''
  },
  accommodation: {
    type: String,
    maxlength: 255,
    default: 'No'
  },
  genfee: {
    type: String,
    maxlength: 10,
    default: ''
  },
  memberId: {
    type: Number,
    unique: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
