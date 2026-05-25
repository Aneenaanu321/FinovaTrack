const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../../src/app');

describe('GET /api/config/public', () => {
  it('returns registration and home route defaults', async () => {
    const app = createApp();
    const res = await request(app).get('/api/config/public');
    assert.equal(res.status, 200);
    assert.equal(res.body.allowRegistration, true);
    assert.equal(res.body.defaultHomeRoute, '/attention');
    assert.equal(res.body.emailNotificationsAvailable, false);
  });

  it('respects ALLOW_REGISTRATION=false', async () => {
    const prev = process.env.ALLOW_REGISTRATION;
    process.env.ALLOW_REGISTRATION = 'false';
    const app = createApp();
    const res = await request(app).get('/api/config/public');
    assert.equal(res.body.allowRegistration, false);
    process.env.ALLOW_REGISTRATION = prev;
  });
});
