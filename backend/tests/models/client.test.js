const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../../src/models/User');
const Client = require('../../src/models/Client');
const { connectTestDb, disconnectTestDb, clearCollections } = require('../helpers/db');

describe('Client model', () => {
  let userId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  it('creates client with defaults', async () => {
    await clearCollections();
    const user = await User.create({
      name: 'Advisor',
      email: 'advisor@example.com',
      password: 'SecurePass1!',
    });
    userId = user._id;
    const client = await Client.create({
      user: userId,
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
    assert.equal(client.dealStatus, 'New');
    assert.equal(client.kycStatus, 'Not Started');
    assert.equal(client.deletedAt, null);
  });

  it('rejects invalid deal status', async () => {
    await clearCollections();
    const user = await User.create({
      name: 'Advisor',
      email: 'advisor2@example.com',
      password: 'SecurePass1!',
    });
    await assert.rejects(
      () => Client.create({ user: user._id, name: 'Bad', dealStatus: 'Invalid' }),
      (err) => err.name === 'ValidationError'
    );
  });
});
