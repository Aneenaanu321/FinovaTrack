const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { connectTestDb, disconnectTestDb, clearCollections } = require('../helpers/db');

describe('Auth routes', () => {
  let app;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters!!';
    await connectTestDb();
    app = createApp();
  });

  after(async () => {
    await disconnectTestDb();
  });

  it('POST /auth/register creates user', async () => {
    await clearCollections();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Demo User',
        email: 'demo@test.com',
        password: 'SecurePass1!',
      });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.ok(res.body.refreshToken);
    assert.equal(res.body.user.email, 'demo@test.com');
  });

  it('POST /auth/register rejects weak password', async () => {
    await clearCollections();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'x@test.com', password: 'weak' });
    assert.equal(res.status, 400);
    assert.ok(res.body.message);
  });

  it('POST /auth/login returns tokens', async () => {
    await clearCollections();
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@test.com', password: 'SecurePass1!' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'SecurePass1!' });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });

  it('POST /auth/login rejects invalid body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Validation/i);
  });
});
