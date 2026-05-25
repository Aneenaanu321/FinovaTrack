const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const { asyncHandler, AppError } = require('../middleware/errors');
const { validate } = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  changePasswordSchema,
} = require('../validation/schemas');
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

router.post('/register', authRateLimit, validate(registerSchema), asyncHandler(async (req, res) => {
  if (process.env.ALLOW_REGISTRATION === 'false') {
    throw new AppError('Registration is disabled on this server', 403);
  }
  const { name, email, password, branch, employeeId } = req.validated.body;
  const pw = validatePassword(password);
  if (!pw.valid) throw new AppError(pw.message, 400, pw.errors);
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new AppError('Email already registered', 409);
    const hasSmtp =
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS;

    const user = await User.create({
      name,
      email,
      password,
      branch: branch || '',
      employeeId: employeeId || '',
      notificationPrefs: {
        dailyDigestEnabled: !!hasSmtp,
        dailyDigestHour: 7,
        pushEnabled: false,
      },
      backupPrefs: {
        weeklyBackupEnabled: !!hasSmtp,
        weeklyBackupWeekday: 1,
        weeklyBackupHour: 8,
      },
    });
  const payload = await issueTokens(user);
  res.status(201).json(payload);
}));

router.post('/login', authRateLimit, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }
  user.pruneExpiredRefreshTokens();
  res.json(await issueTokens(user));
}));

router.post('/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.validated.body;
  const hashed = hashToken(refreshToken);
  const user = await User.findOne({ 'refreshTokens.token': hashed });
  if (!user || !user.findValidRefreshToken(hashed)) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  await user.removeRefreshToken(hashed);
  res.json(await issueTokens(user));
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hashed = hashToken(refreshToken);
    const user = await User.findOne({ 'refreshTokens.token': hashed });
    if (user) await user.removeRefreshToken(hashed);
  }
  res.json({ message: 'Logged out' });
}));

router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const { email } = req.validated.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    const rawToken = generateResetToken();
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    await sendPasswordResetEmail(user.email, `${frontend}/reset-password?token=${rawToken}`);
  }
  res.json({
    message: 'If that email is registered, you will receive reset instructions shortly.',
  });
}));

router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(async (req, res) => {
  const { token, password } = req.validated.body;
  const pw = validatePassword(password);
  if (!pw.valid) throw new AppError(pw.message, 400, pw.errors);
  const hashed = hashToken(token);
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('Invalid or expired reset link', 400);
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshTokens = [];
  await user.save();
  res.json({ message: 'Password updated. You can sign in with your new password.' });
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -refreshTokens -resetPasswordToken');
  if (!user) throw new AppError('User not found', 404);
  res.json(toPublicUser(user));
}));

router.put('/profile', authMiddleware, validate(profileSchema), asyncHandler(async (req, res) => {
  const { name, email, branch, employeeId } = req.validated.body;
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);

  if (name !== undefined) {
    if (!name.trim()) throw new AppError('Name is required', 400);
    user.name = name.trim();
  }
  if (email !== undefined) {
    const normalized = email.toLowerCase().trim();
    if (normalized !== user.email) {
      const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
      if (taken) throw new AppError('Email already in use', 409);
      user.email = normalized;
    }
  }
  if (branch !== undefined) user.branch = branch.trim();
  if (employeeId !== undefined) user.employeeId = employeeId.trim();

  await user.save();
  res.json(toPublicUser(user));
}));

router.put('/change-password', authMiddleware, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;
  const pw = validatePassword(newPassword);
  if (!pw.valid) throw new AppError(pw.message, 400, pw.errors);

  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User not found', 404);
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed successfully' });
}));

module.exports = router;
