const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  memberId: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  amount: {
    type: Number,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  paymentStatus: {
    type: String,
    required: true,
    default: 'Created',
    maxlength: 50
  },
  addedOn: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

paymentSchema.index({ memberId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
