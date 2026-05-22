const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MAX_REFRESH_TOKENS = 5;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true },
  branch: { type: String, trim: true, default: '' },
  employeeId: { type: String, trim: true, default: '' },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  refreshTokens: [{
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  monthlyTargets: {
    clientsClosed: { type: Number, default: 5, min: 0 },
    /** Target total deal value from closed deals this month */
    dealValue: { type: Number, default: 0, min: 0 },
    /** @deprecated use dealValue — kept for existing documents */
    revenue: { type: Number, default: 0, min: 0 },
    /** Target expected commission from closed deals this month */
    commission: { type: Number, default: 0, min: 0 },
  },
  notificationPrefs: {
    dailyDigestEnabled: { type: Boolean, default: true },
    dailyDigestHour: { type: Number, default: 7, min: 0, max: 23 },
    pushEnabled: { type: Boolean, default: false },
  },
  backupPrefs: {
    weeklyBackupEnabled: { type: Boolean, default: true },
    weeklyBackupWeekday: { type: Number, default: 1, min: 0, max: 6 },
    weeklyBackupHour: { type: Number, default: 8, min: 0, max: 23 },
  },
  lastDailyDigestAt: { type: Date },
  lastWeeklyBackupAt: { type: Date },
  dismissedNotifications: [{
    key: { type: String, required: true },
    at: { type: Date, default: Date.now },
  }],
  pushSubscriptions: [{
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.addRefreshToken = async function (hashedToken, expiresAt) {
  this.refreshTokens.push({ token: hashedToken, expiresAt });
  if (this.refreshTokens.length > MAX_REFRESH_TOKENS) {
    this.refreshTokens.sort((a, b) => a.createdAt - b.createdAt);
    this.refreshTokens = this.refreshTokens.slice(-MAX_REFRESH_TOKENS);
  }
  await this.save();
};

userSchema.methods.removeRefreshToken = async function (hashedToken) {
  this.refreshTokens = this.refreshTokens.filter((r) => r.token !== hashedToken);
  await this.save();
};

userSchema.methods.findValidRefreshToken = function (hashedToken) {
  const now = new Date();
  return this.refreshTokens.find(
    (r) => r.token === hashedToken && r.expiresAt > now
  );
};

userSchema.methods.pruneExpiredRefreshTokens = function () {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter((r) => r.expiresAt > now);
};

module.exports = mongoose.model('User', userSchema);
