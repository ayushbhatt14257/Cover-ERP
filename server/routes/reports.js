const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const { auth, adminOnly } = require('../middleware/auth');
const { generateMonthlyReport } = require('../utils/reportGenerator');

// GET /api/reports/monthly?year=2026&month=4
router.get('/monthly', auth, adminOnly, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    let report = await Report.findOne({ year, month });
    if (!report) {
      report = await generateMonthlyReport(year, month);
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/list — list all saved reports
router.get('/list', auth, adminOnly, async (req, res) => {
  try {
    const reports = await Report.find().sort({ year: -1, month: -1 }).select('-dailyData -shiftData').lean();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/export?year=2026&month=4 — download as Excel
router.get('/export', auth, adminOnly, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    const txs = await Transaction.find({ shiftDate: { $regex: `^${prefix}` } })
      .sort({ timestamp: 1 })
      .lean();

    // Sheet 1: All transactions
    const txRows = txs.map(t => ({
      Date: t.shiftDate,
      Shift: `Shift ${t.shift}`,
      Type: t.type,
      'Model Name': t.skuName,
      Quantity: t.quantity,
      Machine: t.machineNumber || '',
      'Row': t.location?.row || '',
      'Shelf': t.location?.shelf || '',
      Department: t.department || '',
      'Receiver Name': t.receiverName || '',
      'Recorded By': t.recordedByName || '',
      Time: new Date(t.timestamp).toLocaleTimeString('en-IN'),
    }));

    // Sheet 2: SKU summary
    const summaryMap = {};
    txs.forEach(t => {
      if (!summaryMap[t.skuName]) summaryMap[t.skuName] = { 'Model Name': t.skuName, 'Total In': 0, 'Total Out': 0 };
      if (t.type === 'IN') summaryMap[t.skuName]['Total In'] += t.quantity;
      if (t.type === 'OUT') summaryMap[t.skuName]['Total Out'] += t.quantity;
    });
    const summaryRows = Object.values(summaryMap).map(r => ({
      ...r,
      Balance: r['Total In'] - r['Total Out'],
    })).sort((a, b) => a['Model Name'].localeCompare(b['Model Name']));

    // Sheet 3: Daily summary
    const dailyMap = {};
    txs.forEach(t => {
      if (!dailyMap[t.shiftDate]) dailyMap[t.shiftDate] = { Date: t.shiftDate, 'Total In': 0, 'Total Out': 0 };
      if (t.type === 'IN') dailyMap[t.shiftDate]['Total In'] += t.quantity;
      if (t.type === 'OUT') dailyMap[t.shiftDate]['Total Out'] += t.quantity;
    });
    const dailyRows = Object.values(dailyMap).sort((a, b) => a.Date.localeCompare(b.Date));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Transactions');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'SKU Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily Summary');

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="Report_${monthName}_${year}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reports/generate — manual trigger
router.post('/generate', auth, adminOnly, async (req, res) => {
  try {
    const { year, month } = req.body;
    const report = await generateMonthlyReport(
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) || new Date().getMonth() + 1,
      false
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
