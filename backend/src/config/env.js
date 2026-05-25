/**
 * Validates required environment variables before the server starts.
 */
function validateEnv() {
  if (process.env.NODE_ENV === 'test') return;

  const errors = [];
  const warnings = [];

  const mongo = process.env.MONGODB_URI?.trim();
  const jwt = process.env.JWT_SECRET?.trim();

  if (!mongo) errors.push('MONGODB_URI is required');
  if (!jwt) errors.push('JWT_SECRET is required');

  if (jwt && jwt.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters');
  } else if (jwt && jwt.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 random characters in production');
  }

  if (jwt && /^(your_|changeme|secret|test)/i.test(jwt)) {
    warnings.push('JWT_SECRET appears to be a placeholder — generate a strong random value before production');
  }

  const port = Number(process.env.PORT);
  if (process.env.PORT && (Number.isNaN(port) || port < 1 || port > 65535)) {
    errors.push('PORT must be a valid number between 1 and 65535');
  }

  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL?.trim()) {
    warnings.push('FRONTEND_URL should be set in production for CORS and password-reset links');
  }

  for (const w of warnings) console.warn(`[env] ${w}`);
  if (errors.length) {
    throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

module.exports = { validateEnv };
