const mongoose = require('mongoose');

// Machines (M1-M10 black cover machines, subset of 52)
const machineSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // "M1"
  label: { type: String }, // optional friendly label
  isActive: { type: Boolean, default: true },
  isBlackCover: { type: Boolean, default: true },
}, { timestamps: true });

// Godown Rows
const locationRowSchema = new mongoose.Schema({
  row: { type: String, required: true, unique: true }, // "A", "B" ... "T"
  shelves: { type: Number, default: 10 }, // number of shelves in this row
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Departments for Stock Out
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // "Printing"
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Machine = mongoose.model('Machine', machineSchema);
const LocationRow = mongoose.model('LocationRow', locationRowSchema);
const Department = mongoose.model('Department', departmentSchema);

module.exports = { Machine, LocationRow, Department };
