const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    maxlength: 250
  },
  designation: {
    type: String,
    required: true,
    maxlength: 25
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);
