const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Helper: Generate a signed JWT token for the authenticated user.
 * @param {string} id - MongoDB user _id
 * @returns {string} signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Register a new user.
 * Body: { name, email, password, city }
 * Returns: { user info + JWT token }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, city } = req.body;

    // Check if email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user (password hashed by pre-save hook in User model)
    const user = await User.create({ name, email, password, city });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      city: user.city,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
/**
 * Login an existing user.
 * Body: { email, password }
 * Returns: { user info + JWT token }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password using bcrypt (matchPassword method in User model)
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      city: user.city,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
