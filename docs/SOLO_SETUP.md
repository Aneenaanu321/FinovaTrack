# Solo setup (one user)

FinovaTrack is built for a single account — you. This guide covers day-one setup and ongoing data safety.

## 1. Run locally

```bash
# Terminal 1 — API
cd backend
cp .env.example .env   # edit MONGODB_URI, JWT_SECRET
npm install
npm run seed          # optional demo user
npm run dev

# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 → register once or sign in with the seed user (`demo@finovatrack.local` / `DemoPass123!` — change password in Settings).

## 2. Production environment

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | 32+ random characters |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `FRONTEND_URL` | Your deployed UI URL (CORS, email links) |
| `ALLOW_REGISTRATION` | Set `false` after you create your account |
| `DEFAULT_HOME_ROUTE` | `/attention` (Today) or `/dashboard` |
| SMTP vars | Password reset, daily digest, weekly backup |

See [DEPLOY.md](./DEPLOY.md) for hosting.

## 3. Lock down registration

After your account exists:

```env
ALLOW_REGISTRATION=false
```

Restart the API. The login page hides “Register”; existing login and password reset still work.

## 4. Email features (optional)

Without SMTP, password-reset links print in the server console. New accounts get **daily digest** and **weekly backup** disabled by default until SMTP is configured.

In **Settings** you can toggle daily digest, push, and weekly backup when email is ready.

## 5. Protect your data

- **Settings → Protect your data** — full client CSV/Excel export, manual backup email
- **Clients** — import with duplicate preview; archive moves tasks off the client and cancels upcoming appointments
- **Weekly backup** — enable in Settings when SMTP works
- **MongoDB Atlas** — enable [cloud backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/) in addition to CSV exports
- Store `MONGODB_URI`, Atlas password, and export files in a password manager + cloud drive

## 6. Local-only MongoDB (privacy)

Use Docker for Mongo on your machine without Atlas:

```bash
docker compose -f docker-compose.local.yml up -d
```

Set `MONGODB_URI=mongodb://localhost:27017/finovatrack` in `backend/.env` and run the API + frontend on your laptop.

## 7. PWA on your phone

Deploy the frontend over HTTPS, open in Chrome/Safari → **Add to Home Screen**. Enable push in Settings if you generated VAPID keys (`npm run generate-vapid` in `backend`).

## 8. Exports

| Data | Where |
|------|--------|
| Clients | Clients page or Settings |
| Tasks | Settings → Export tasks (CSV) |
| Appointments | Settings → Export appointments (CSV) |
| Commission | Dashboard → Export commission CSV |

## Troubleshooting

- **`querySrv` / DNS errors on Windows** — see project README Troubleshooting; try `mongodb://127.0.0.1:27017/...` for local Docker Mongo.
- **Registration disabled** — use seed or an existing account; reset password via email if SMTP is set.
