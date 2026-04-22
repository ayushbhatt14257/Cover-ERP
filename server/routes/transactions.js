const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const SKU = require('../models/SKU');
const { auth } = require('../middleware/auth');

// Cast any skuId to ObjectId — aggregate() bypasses Mongoose auto-casting
function toOid(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
}

// Get current balance for a SKU
async function getBalance(skuId) {
  const oid = toOid(skuId);
  const result = await Transaction.aggregate([
    { $match: { sku: oid } },
    {
      $group: {
        _id: null,
        totalIn:  { $sum: { $cond: [{ $eq: ['$type', 'IN']  }, '$quantity', 0] } },
        totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', 0] } },
      },
    },
  ]);
  if (!result.length) return { totalIn: 0, totalOut: 0, balance: 0 };
  const { totalIn, totalOut } = result[0];
  return { totalIn, totalOut, balance: totalIn - totalOut };
}

function getTodayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// POST /api/transactions/in
router.post('/in', auth, async (req, res) => {
  try {
    const { skuId, shift, machineNumber, quantity, location, recordedByName } = req.body;
    if (!skuId || !shift || !machineNumber || !quantity)
      return res.status(400).json({ message: 'skuId, shift, machineNumber, quantity required' });

    const sku = await SKU.findById(skuId);
    if (!sku || !sku.isActive) return res.status(404).json({ message: 'SKU not found' });

    const tx = await Transaction.create({
      type: 'IN',
      sku: sku._id,
      skuName: sku.name,
      shift: parseInt(shift),
      shiftDate: getTodayIST(),
      quantity: parseInt(quantity),
      machineNumber,
      location: location || { row: null, shelf: null },
      recordedBy: req.user._id,
      recordedByName: recordedByName || req.user.displayName,
    });

    const balanceData = await getBalance(sku._id);
    req.app.get('io').emit('transaction:new', { transaction: tx, skuId: sku._id, skuName: sku.name, ...balanceData });
    res.status(201).json({ transaction: tx, ...balanceData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/transactions/out
router.post('/out', auth, async (req, res) => {
  try {
    const { skuId, shift, quantity, department, receiverName } = req.body;
    if (!skuId || !shift || !quantity || !department || !receiverName)
      return res.status(400).json({ message: 'skuId, shift, quantity, department, receiverName required' });

    const sku = await SKU.findById(skuId);
    if (!sku || !sku.isActive) return res.status(404).json({ message: 'SKU not found' });

    const shiftDate = getTodayIST();
    const shiftInt = parseInt(shift);
    const qtyInt = parseInt(quantity);

    // SHIFT GATE
    const shiftInExists = await Transaction.findOne({ sku: sku._id, type: 'IN', shift: shiftInt, shiftDate });
    if (!shiftInExists) {
      return res.status(400).json({
        message: `No Stock In for "${sku.name}" in Shift ${shiftInt} today. Record Stock In first.`,
        code: 'SHIFT_GATE',
      });
    }

    // BALANCE GUARD
    const { balance } = await getBalance(sku._id);
    if (qtyInt > balance) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${balance} pcs. Requested: ${qtyInt} pcs.`,
        code: 'INSUFFICIENT_STOCK',
        available: balance,
      });
    }

    const tx = await Transaction.create({
      type: 'OUT',
      sku: sku._id,
      skuName: sku.name,
      shift: shiftInt,
      shiftDate,
      quantity: qtyInt,
      department,
      receiverName,
      recordedBy: req.user._id,
      recordedByName: req.user.displayName,
    });

    const balanceData = await getBalance(sku._id);
    req.app.get('io').emit('transaction:new', { transaction: tx, skuId: sku._id, skuName: sku.name, ...balanceData });
    res.status(201).json({ transaction: tx, ...balanceData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/daily
router.get('/daily', auth, async (req, res) => {
  try {
    const date = req.query.date || getTodayIST();
    const txs = await Transaction.find({ shiftDate: date }).sort({ timestamp: -1 }).limit(200).lean();
    res.json(txs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/balance/:skuId
router.get('/balance/:skuId', auth, async (req, res) => {
  try {
    const oid = toOid(req.params.skuId);
    const data = await getBalance(oid);
    const lastIn = await Transaction.findOne({ sku: oid, type: 'IN', 'location.row': { $ne: null } })
      .sort({ timestamp: -1 }).select('location shiftDate shift').lean();
    res.json({ ...data, lastLocation: lastIn?.location || null, lastIn });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/shift-check
router.get('/shift-check', auth, async (req, res) => {
  try {
    const { skuId, shift, date } = req.query;
    const oid = toOid(skuId);
    const exists = await Transaction.findOne({ sku: oid, type: 'IN', shift: parseInt(shift), shiftDate: date || getTodayIST() });
    res.json({ allowed: !!exists });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
