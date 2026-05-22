const RULES = [
  { id: 'length', test: (p) => p.length >= 8, message: 'At least 8 characters' },
  { id: 'lower', test: (p) => /[a-z]/.test(p), message: 'One lowercase letter' },
  { id: 'upper', test: (p) => /[A-Z]/.test(p), message: 'One uppercase letter' },
  { id: 'digit', test: (p) => /\d/.test(p), message: 'One number' },
  { id: 'special', test: (p) => /[^A-Za-z0-9]/.test(p), message: 'One special character' },
];

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'], message: 'Password is required' };
  }
  const errors = RULES.filter((r) => !r.test(password)).map((r) => r.message);
  return {
    valid: errors.length === 0,
    errors,
    message: errors.length ? `Password must include: ${errors.join(', ')}` : null,
    rules: RULES.map((r) => ({ id: r.id, message: r.message, met: r.test(password) })),
  };
}

module.exports = { validatePassword, PASSWORD_RULES: RULES };
