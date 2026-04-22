const express = require('express');
const router = express.Router();
const SKU = require('../models/SKU');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/skus/search?q=sam — fast prefix search for dropdowns
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const token = q.toLowerCase().replace(/\s+/g, '');
    const results = await SKU.find({
      isActive: true,
      searchToken: { $regex: `^${token}`, $options: 'i' },
    })
      .select('name brand _id')
      .limit(30)
      .lean();

    // Also search by original name (contains) as fallback
    if (results.length < 5) {
      const fallback = await SKU.find({
        isActive: true,
        name: { $regex: q, $options: 'i' },
        _id: { $nin: results.map(r => r._id) },
      })
        .select('name brand _id')
        .limit(20)
        .lean();
      return res.json([...results, ...fallback]);
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/skus — paginated list (admin)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const q = req.query.q || '';

    const filter = { isActive: true };
    if (q) filter.name = { $regex: q, $options: 'i' };

    const [skus, total] = await Promise.all([
      SKU.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      SKU.countDocuments(filter),
    ]);

    res.json({ skus, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/skus — add single SKU
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, brand } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });

    const searchToken = name.trim().toLowerCase().replace(/\s+/g, '');
    const existing = await SKU.findOne({ searchToken });
    if (existing) return res.status(400).json({ message: 'SKU already exists' });

    // Pass searchToken explicitly so Mongoose validation passes before the pre-save hook runs
    const sku = await SKU.create({
      name: name.trim(),
      searchToken,
      brand: brand || '',
      createdBy: req.user._id,
    });
    res.status(201).json(sku);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/skus/bulk — bulk import from parsed Excel data
router.post('/bulk', auth, adminOnly, async (req, res) => {
  try {
    const { skus } = req.body; // Array of { name, brand }
    if (!Array.isArray(skus) || skus.length === 0)
      return res.status(400).json({ message: 'No SKUs provided' });

    const ops = skus
      .filter(s => s.name && s.name.trim())
      .map(s => {
        const searchToken = s.name.trim().toLowerCase().replace(/\s+/g, '');
        return {
          updateOne: {
            filter: { searchToken },
            // bulkWrite bypasses Mongoose pre-save hooks, so set searchToken explicitly here
            update: {
              $setOnInsert: {
                name: s.name.trim(),
                searchToken,
                brand: s.brand || '',
                isActive: true,
                createdBy: req.user._id,
              },
            },
            upsert: true,
          },
        };
      });

    const result = await SKU.bulkWrite(ops);
    res.json({
      inserted: result.upsertedCount,
      skipped: skus.length - result.upsertedCount,
      total: skus.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/skus/:id — edit or deactivate
router.patch('/:id', auth, adminOnly, async (req, res) => {
  try {
    const sku = await SKU.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sku) return res.status(404).json({ message: 'SKU not found' });
    res.json(sku);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
