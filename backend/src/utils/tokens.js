const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10);

const signAccessToken = (id) =>
  jwt.sign({ id, type: 'access' }, process.env.JWT_SECRET || 'secret', {
    expiresIn: ACCESS_EXPIRES,
  });

const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const refreshExpiresAt = () => {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_DAYS);
  return d;
};

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiresAt,
  generateResetToken,
  ACCESS_EXPIRES,
  REFRESH_DAYS,
};
