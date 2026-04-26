const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const authMw  = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    const user = await User.create({ username, email, password });
    res.status(201).json({ token: sign(user._id), user: { id: user._id, username, email, color: user.color } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email or username already taken' });
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(user._id), user: { id: user._id, username: user.username, email, color: user.color } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authMw, (req, res) => res.json(req.user));

module.exports = router;