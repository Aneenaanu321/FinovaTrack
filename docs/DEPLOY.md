# FinovaTrack deployment guide

## Prerequisites

- Node.js 20+
- MongoDB (Atlas or self-hosted)
- `package-lock.json` committed in `backend/` and `frontend/` for reproducible installs

## Environment variables (backend)

Copy `backend/.env.example` → `backend/.env`. Required:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Min 16 chars (32+ recommended in production) |
| `FRONTEND_URL` | Public frontend URL (CORS + reset links) |

Optional: `SMTP_*`, `SENTRY_DSN`, `VAPID_*` — see `.env.example`.

## Docker Compose (local full stack)

```bash
# From repo root — set a strong JWT in .env or shell
export JWT_SECRET=your-long-random-secret-at-least-32-chars

docker compose up --build
```

- Frontend: http://localhost:8080  
- API: http://localhost:5000  
- API docs: http://localhost:5000/api/docs  

## Railway

### Backend

1. New service from GitHub repo, root directory `backend`.
2. Add MongoDB plugin or set `MONGODB_URI` to Atlas.
3. Variables: `JWT_SECRET`, `FRONTEND_URL` (your frontend URL), `NODE_ENV=production`.
4. Start command: `npm start` (default).

### Frontend

1. New service, root directory `frontend`.
2. Build: `npm run build`, output `dist`.
3. Set `VITE_*` only if you add build-time env vars; API calls use `/api` proxy in production nginx or configure reverse proxy to backend.

Alternatively deploy frontend to **Netlify** or **Vercel** with `dist` and proxy `/api` to the Railway backend URL.

## Render

Similar to Railway: Web Service for `backend` (`npm start`), Static Site for `frontend` (`npm run build`, publish `dist`). Set environment variables in the dashboard.

## VPS (Ubuntu)

```bash
# MongoDB (or use Atlas only)
sudo apt update && sudo apt install -y mongodb-org || docker run -d -p 27017:27017 mongo:7

cd backend && npm ci --omit=dev
cp .env.example .env   # edit values
npm install -g pm2
pm2 start src/index.js --name finovatrack-api
pm2 save

cd ../frontend && npm ci && npm run build
# Serve dist with nginx — proxy /api to localhost:5000
```

## Vercel (frontend) + Render (backend) — recommended split

### 1. Deploy backend on Render

1. [render.com](https://render.com) → **New** → **Web Service** → connect your GitHub repo.
2. **Branch:** `feat/followups-integrations-audit` (or merge to `main` first — must match the branch that has the latest `backend/` code).
3. **Root directory:** `backend` (required — not repo root).
4. **Build command:** `npm ci`
5. **Start command:** `npm start`
5. **Environment variables:**

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your Atlas URI (`mongodb+srv://.../finovatrack?...`) |
| `JWT_SECRET` | 32+ random characters |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (set after Vercel deploy, then update) |
| `NODE_ENV` | `production` |
| `PORT` | Leave empty — Render sets this automatically |

6. Deploy. Copy the service URL, e.g. `https://finovatrack-api.onrender.com`.
7. Test: open `https://YOUR-RENDER-URL.onrender.com/api/health` → should show `"status":"ok"`.

#### Render deploy failed / 404 on `/api/health`

| Symptom | Fix |
|---------|-----|
| Build fails `npm ci` | Ensure `backend/package-lock.json` is committed; **Root directory** = `backend` |
| Crash: `MONGODB_URI is required` | Add `MONGODB_URI` and `JWT_SECRET` in Render **Environment** |
| Crash: `MongoDB connection error` | Atlas → **Network Access** → Add IP `0.0.0.0/0`; verify password (`@` → `%40` in URI); use database name `/finovatrack` |
| `querySrv` errors | On Render, `mongodb+srv://...` usually works; if not, paste the **standard** connection string from Atlas (Connect → Drivers) |
| 404 Not Found | Service not running — open **Logs** tab; wrong branch or root directory; redeploy after fixing env |
| Do not set `PORT` | Render sets `PORT` automatically — leave it unset |

**Logs:** Render dashboard → your service → **Logs** → look for `[startup]` or `Environment validation failed`.

### 2. Deploy frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the same repo.
2. **Root directory:** leave as **repo root** (`.`). The repo includes a root `vercel.json` that builds `frontend/`.  
   **Or** set Root directory to `frontend` and use `frontend/vercel.json` only — do not use both conflicting setups.
3. **Framework preset:** Vite (auto-detected)
4. **Build command:** `npm run build` (default)
5. **Output directory:** `dist` (default)
6. Edit `frontend/vercel.json` — replace `REPLACE-WITH-YOUR-RENDER-URL` with your Render hostname (no trailing slash), e.g. `finovatrack-api.onrender.com`.
7. Deploy. Note your Vercel URL, e.g. `https://finovatrack.vercel.app`.
8. Back on **Render** → Environment → set `FRONTEND_URL` to that exact Vercel URL → **Save** (redeploy if needed).

### 3. Verify

- Open Vercel URL → login/register should work.
- Browser devtools → Network → API calls go to `your-app.vercel.app/api/...` (proxied to Render).

**Alternative:** set Vercel env `VITE_API_BASE_URL=https://your-app.onrender.com/api` and use direct API calls (CORS must match `FRONTEND_URL` on Render).

## Netlify (frontend only)

1. Build command: `cd frontend && npm ci && npm run build`
2. Publish directory: `frontend/dist`
3. Add redirect/proxy for `/api/*` → your backend URL, or set `VITE_API_BASE_URL` to the Render API host.

## Error logging (Sentry)

1. Create a Sentry Node project.
2. Set `SENTRY_DSN` in backend environment.
3. Unhandled 5xx errors are reported automatically.

## API documentation

Swagger UI: `https://<your-api-host>/api/docs`  
OpenAPI JSON: `https://<your-api-host>/api/docs/openapi.json`

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs lint, backend tests, frontend build, and Playwright E2E on push/PR.
