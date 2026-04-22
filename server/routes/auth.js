const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user || !user.isActive)
      return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user), user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/setup — creates first admin (only if no users exist)
router.post('/setup', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.status(400).json({ message: 'Setup already completed' });
    const { username, password, displayName } = req.body;
    const admin = await User.create({ username: username.trim().toLowerCase(), password, displayName, role: 'admin' });
    res.status(201).json({ token: signToken(admin), user: admin.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/users — admin creates a new user (admin or worker)
router.post('/users', auth, adminOnly, async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;
    if (!username || !password || !displayName)
      return res.status(400).json({ message: 'username, password, displayName required' });
    if (!['admin', 'worker'].includes(role))
      return res.status(400).json({ message: 'role must be admin or worker' });

    const user = await User.create({
      username: username.trim().toLowerCase(),
      password,
      displayName: displayName.trim(),
      role: role || 'worker',
    });
    res.status(201).json(user.toSafeObject());
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Username already exists' });
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/auth/users/:id — update password, displayName, isActive
router.patch('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const { displayName, password, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (displayName) user.displayName = displayName.trim();
    if (password) user.password = password; // pre-save hook will hash it
    if (typeof isActive === 'boolean') user.isActive = isActive;
    await user.save();
    res.json(user.toSafeObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
