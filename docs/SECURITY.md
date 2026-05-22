# FinovaTrack — Security Guide

## Environment variables

Never commit `.env` or real secrets to git. Copy `backend/.env.example` to `backend/.env` locally only.

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Min 16 chars; use **32+ random bytes** in production |
| `JWT_ACCESS_EXPIRES_IN` | No | Default `15m` |
| `JWT_REFRESH_EXPIRES_DAYS` | No | Default `7` |
| `FRONTEND_URL` | Recommended in prod | CORS + password-reset links |
| `AUTH_RATE_LIMIT_MAX` | No | Login/register attempts per 15 min per IP (default `15`) |

The API validates required variables at startup and exits with a clear error if anything is missing.

## Rotating the JWT secret

Rotating `JWT_SECRET` **invalidates all existing access and refresh tokens** immediately. Plan a maintenance window:

1. Generate a new secret (example):

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

2. Update `JWT_SECRET` in your deployment environment (Railway, VPS, etc.).
3. Restart the backend process.
4. All users must sign in again (refresh tokens stored in the DB will also fail verification on next refresh).

For zero-downtime rotation in a multi-instance deployment, you would need dual-key verification (not implemented in this app); the simple approach above is appropriate for solo/team internal tools.

## Password policy

Passwords must meet:

- At least 8 characters
- One uppercase, one lowercase, one number, one special character

Enforced on register, reset-password, and change-password.

## Rate limiting

`POST /api/auth/login` and `POST /api/auth/register` are limited per IP (default 15 requests / 15 minutes). Responses use HTTP `429` with `Retry-After`.

## Audit log

Changes to clients, tasks, and appointments are recorded in `AuditLog` with user, timestamp, field-level diffs, IP, and user agent. View via `GET /api/audit-log` (authenticated).

## Compliance fields

Per-client **consents** (data processing, marketing, call recording) and **interaction flags** (call recorded, SMS, etc.) support branch compliance workflows. Document consent method and date when capturing consent in the client profile.
