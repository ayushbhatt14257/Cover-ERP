const express = require('express');
const router = express.Router();
const { Machine, LocationRow, Department } = require('../models/Masters');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/masters/all — get everything needed for form dropdowns
router.get('/all', auth, async (req, res) => {
  try {
    const [machines, rows, departments] = await Promise.all([
      Machine.find({ isActive: true, isBlackCover: true }).sort({ code: 1 }).lean(),
      LocationRow.find({ isActive: true }).sort({ row: 1 }).lean(),
      Department.find({ isActive: true }).sort({ name: 1 }).lean(),
    ]);
    res.json({ machines, rows, departments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/masters/seed — seed default data (run once on first setup)
router.post('/seed', auth, adminOnly, async (req, res) => {
  try {
    // Seed 10 black cover machines M1-M10
    const machineOps = Array.from({ length: 10 }, (_, i) => ({
      updateOne: {
        filter: { code: `M${i + 1}` },
        update: { $setOnInsert: { code: `M${i + 1}`, isBlackCover: true, isActive: true } },
        upsert: true,
      },
    }));
    await Machine.bulkWrite(machineOps);

    // Seed rows A through T (20 rows)
    const rowLetters = 'ABCDEFGHIJKLMNOPQRST'.split('');
    const rowOps = rowLetters.map(r => ({
      updateOne: {
        filter: { row: r },
        update: { $setOnInsert: { row: r, shelves: 10, isActive: true } },
        upsert: true,
      },
    }));
    await LocationRow.bulkWrite(rowOps);

    // Seed departments
    const depts = ['Printing', 'Packaging', 'Quality Check', 'Dispatch'];
    const deptOps = depts.map(d => ({
      updateOne: {
        filter: { name: d },
        update: { $setOnInsert: { name: d, isActive: true } },
        upsert: true,
      },
    }));
    await Department.bulkWrite(deptOps);

    res.json({ message: 'Master data seeded successfully', machines: 10, rows: 20, departments: depts.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/masters/machines/:code — toggle machine active
router.patch('/machines/:code', auth, adminOnly, async (req, res) => {
  try {
    const machine = await Machine.findOneAndUpdate({ code: req.params.code }, req.body, { new: true });
    res.json(machine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/masters/departments — add department
router.post('/departments', auth, adminOnly, async (req, res) => {
  try {
    const dept = await Department.create({ name: req.body.name });
    res.status(201).json(dept);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Department already exists' });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
