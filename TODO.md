# FinovaTrack — Backlog (solo user)

You are the only person using this app. **Skip** anything about teams, roles, multiple reps, or manager dashboards — not needed.

---

## Already built (done in code)

- [x] Dashboard, Today / Needs attention, clients, Kanban pipeline, tasks, appointments
- [x] Auth (login, refresh tokens, forgot password, settings, profile)
- [x] Call logging, follow-ups, stale leads, KYC, compliance fields, audit log
- [x] Import/export clients (CSV/Excel), duplicate detection, weekly backup email job
- [x] Export tasks, appointments, and commission (CSV)
- [x] Notifications (in-app center, overdue badge, daily digest, PWA + push optional)
- [x] Dark mode, global search, keyboard shortcuts, integrations page
- [x] Solo tweaks: `ALLOW_REGISTRATION`, default home `/attention`, archive cleanup, client pagination
- [x] Zod validation on appointments create; more routes covered over time
- [x] Docker Compose, local Mongo compose (`docker-compose.local.yml`), CI, tests, API docs at `/api/docs`
- [x] [docs/SOLO_SETUP.md](docs/SOLO_SETUP.md) — solo setup and data protection
- [x] E2E: login + register → add client (Playwright + Mongo in CI)
- [x] ESLint clean on frontend (`npm run lint`)

---

## Do first — get it running for yourself (manual — you)

- [ ] **Deploy backend** — Railway, Render, or VPS ([docs/DEPLOY.md](docs/DEPLOY.md))
- [ ] **Deploy frontend** — Netlify, Vercel, or same host; point `/api` to your backend
- [ ] **Production `.env`** — strong `JWT_SECRET` (32+ random chars), Atlas `MONGODB_URI`, `FRONTEND_URL`
- [ ] **SMTP** (optional but recommended) — password reset, daily digest, weekly backup
- [ ] **Create your one account** — register once or `cd backend && npm run seed`, then change password in Settings
- [ ] **Import your real clients** — Clients → Import
- [ ] **Install on phone** — PWA; enable push in Settings if VAPID is set
- [ ] **Commit lockfiles** (if not already): `git add backend/package-lock.json frontend/package-lock.json`
- [ ] After account exists: `ALLOW_REGISTRATION=false` in production `.env`

---

## Optional polish (only if something bothers you)

- [ ] **More E2E flows** — appointments, pipeline drag (basic client flow is done)

---

## Explicitly out of scope (do not build for solo use)

- Multi-user / team accounts, roles (admin, rep, viewer)
- Manager view, assign client to rep, branch leaderboard
- Shared pipelines across colleagues

---

## Notes

- One MongoDB database = all your data. Protect `backend/.env` and use weekly backups in Settings.
- Windows `querySrv` issues: see README → Troubleshooting; local Mongo: `docker compose -f docker-compose.local.yml up -d`
- Step-by-step solo guide: [docs/SOLO_SETUP.md](docs/SOLO_SETUP.md)
