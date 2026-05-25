const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword } = require('../../src/utils/password');

describe('validatePassword', () => {
  it('rejects empty password', () => {
    const r = validatePassword('');
    assert.equal(r.valid, false);
  });

  it('accepts strong password', () => {
    const r = validatePassword('SecurePass1!');
    assert.equal(r.valid, true);
    assert.equal(r.errors.length, 0);
  });

  it('reports missing rules', () => {
    const r = validatePassword('short');
    assert.equal(r.valid, false);
    assert.ok(r.errors.length > 0);
  });
});
