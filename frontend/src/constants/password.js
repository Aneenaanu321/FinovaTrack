export const PASSWORD_RULES = [
  { id: 'length', test: (p) => p.length >= 8, message: 'At least 8 characters' },
  { id: 'lower', test: (p) => /[a-z]/.test(p), message: 'One lowercase letter' },
  { id: 'upper', test: (p) => /[A-Z]/.test(p), message: 'One uppercase letter' },
  { id: 'digit', test: (p) => /\d/.test(p), message: 'One number' },
  { id: 'special', test: (p) => /[^A-Za-z0-9]/.test(p), message: 'One special character' },
];

export function validatePasswordStrength(password) {
  if (!password) {
    return { valid: false, errors: ['Password is required'], message: 'Password is required', rules: [] };
  }
  const rules = PASSWORD_RULES.map((r) => ({ ...r, met: r.test(password) }));
  const errors = rules.filter((r) => !r.met).map((r) => r.message);
  return {
    valid: errors.length === 0,
    errors,
    message: errors.length ? `Password must include: ${errors.join(', ')}` : null,
    rules,
  };
}
