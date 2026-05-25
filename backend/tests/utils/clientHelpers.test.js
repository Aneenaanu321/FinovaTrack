const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../src/models/User');
const Client = require('../../src/models/Client');
const { findDuplicates, normalizeEmail } = require('../../src/utils/clientHelpers');
const { connectTestDb, disconnectTestDb, clearCollections } = require('../helpers/db');

describe('clientHelpers', () => {
  let userId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  it('normalizeEmail lowercases', () => {
    assert.equal(normalizeEmail('  Test@MAIL.COM '), 'test@mail.com');
  });

  it('findDuplicates matches email and phone', async () => {
    await clearCollections();
    const user = await User.create({
      name: 'U',
      email: 'u@example.com',
      password: 'SecurePass1!',
    });
    userId = user._id;
    await Client.create({
      user: userId,
      name: 'Existing',
      email: 'client@example.com',
      phone: '+15551234567',
    });
    const dups = await findDuplicates(userId, {
      email: 'client@example.com',
      phone: '+19999999999',
    });
    assert.equal(dups.length, 1);
    assert.deepEqual(dups[0].matchedOn, ['email']);
  });
});
