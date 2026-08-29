const mongoose = require('mongoose');

// Auto-incrementing counter for generating sequential member IDs
// (needed for payment gateway compatibility — transaction IDs use the member's numeric ID)
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Get the next sequential ID for a given collection.
 * @param {string} name - The counter name (e.g., 'userId')
 * @returns {Promise<number>} The next sequential number
 */
async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return counter.seq;
}

module.exports = { Counter, getNextSequence };
