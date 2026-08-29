const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  type: {
    type: String,
    required: true,
    enum: ['event', 'workshop', 'paper', 'flagship']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  fees: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index for fast lookups and duplicate checks
registrationSchema.index({ email: 1, type: 1, name: 1 });
registrationSchema.index({ type: 1, name: 1 });

module.exports = mongoose.model('Registration', registrationSchema);
