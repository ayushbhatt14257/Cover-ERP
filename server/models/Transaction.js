const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  sku: { type: mongoose.Schema.Types.ObjectId, ref: 'SKU', required: true },
  skuName: { type: String, required: true }, // denormalised for fast queries

  // Shift info
  shift: { type: Number, enum: [1, 2, 3], required: true },
  shiftDate: { type: String, required: true }, // "YYYY-MM-DD" — date the shift belongs to

  quantity: { type: Number, required: true, min: 1 },

  // Stock IN specific
  machineNumber: { type: String, default: null }, // e.g. "M3"
  location: {
    row: { type: String, default: null },   // e.g. "B"
    shelf: { type: String, default: null }, // e.g. "3"
  },

  // Stock OUT specific
  department: { type: String, default: null }, // e.g. "Printing"
  receiverName: { type: String, default: null },

  // Who recorded it
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedByName: { type: String },

  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes for dashboard queries
transactionSchema.index({ shiftDate: 1, type: 1 });
transactionSchema.index({ sku: 1, shiftDate: 1 });
transactionSchema.index({ sku: 1, shift: 1, shiftDate: 1 });
transactionSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
