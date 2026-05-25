const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../src/models/User');
const { connectTestDb, disconnectTestDb, clearCollections } = require('../helpers/db');

describe('User model', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  it('hashes password on save', async () => {
    await clearCollections();
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass1!',
    });
    assert.notEqual(user.password, 'SecurePass1!');
    assert.equal(await user.comparePassword('SecurePass1!'), true);
    assert.equal(await user.comparePassword('wrong'), false);
  });

  it('enforces unique email', async () => {
    await clearCollections();
    await User.create({ name: 'A', email: 'dup@example.com', password: 'SecurePass1!' });
    await assert.rejects(
      () => User.create({ name: 'B', email: 'dup@example.com', password: 'SecurePass1!' }),
      (err) => err.code === 11000
    );
  });
});
