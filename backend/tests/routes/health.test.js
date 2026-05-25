const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { connectTestDb, disconnectTestDb } = require('../helpers/db');

describe('GET /api/health', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters!!';
    await connectTestDb();
  });

  after(async () => {
    await disconnectTestDb();
  });

  it('returns ok when database is connected', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.db, 'connected');
  });
});
