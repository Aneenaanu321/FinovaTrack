const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const { sendPasswordResetEmail } = require('../utils/email');
const { validatePassword } = require('../utils/password');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiresAt,
  generateResetToken,
} = require('../utils/tokens');

const router = express.Router();

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  branch: user.branch || '',
  employeeId: user.employeeId || '',
});

const issueTokens = async (user) => {
  const token = signAccessToken(user._id);
  const refreshToken = generateRefreshToken();
  await user.addRefreshToken(hashToken(refreshToken), refreshExpiresAt());
  return { token, refreshToken, user: toPublicUser(user) };
};

router.post('/register', authRateLimit, async (req, res) => {
  try {
    const { name, email, password, branch, employeeId } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    const pw = validatePassword(password);
    if (!pw.valid) return res.status(400).json({ message: pw.message, errors: pw.errors });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({
      name,
      email,
      password,
      branch: branch || '',
      employeeId: employeeId || '',
    });
    const payload = await issueTokens(user);
    res.status(201).json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    user.pruneExpiredRefreshTokens();
    const payload = await issueTokens(user);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: 'Refresh token is required' });
    const hashed = hashToken(refreshToken);
    const user = await User.findOne({ 'refreshTokens.token': hashed });
    if (!user || !user.findValidRefreshToken(hashed))
      return res.status(401).json({ message: 'Invalid or expired refresh token' });

    await user.removeRefreshToken(hashed);
    const payload = await issueTokens(user);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hashed = hashToken(refreshToken);
      const user = await User.findOne({ 'refreshTokens.token': hashed });
      if (user) await user.removeRefreshToken(hashed);
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/forgot-password', authRateLimit, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const rawToken = generateResetToken();
      user.resetPasswordToken = hashToken(rawToken);
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontend}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({
      message: 'If that email is registered, you will receive reset instructions shortly.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ message: 'Token and new password are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashed = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password updated. You can sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshTokens -resetPasswordToken');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(toPublicUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, branch, employeeId } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name is required' });
      user.name = name.trim();
    }
    if (email !== undefined) {
      const normalized = email.toLowerCase().trim();
      if (!normalized) return res.status(400).json({ message: 'Email is required' });
      if (normalized !== user.email) {
        const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
        if (taken) return res.status(409).json({ message: 'Email already in use' });
        user.email = normalized;
      }
    }
    if (branch !== undefined) user.branch = branch.trim();
    if (employeeId !== undefined) user.employeeId = employeeId.trim();

    await user.save();
    res.json(toPublicUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Current and new password are required' });
    const pw = validatePassword(newPassword);
    if (!pw.valid) return res.status(400).json({ message: pw.message, errors: pw.errors });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
