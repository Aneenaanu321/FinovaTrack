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

## Netlify / Vercel (frontend only)

1. Build command: `cd frontend && npm ci && npm run build`
2. Publish directory: `frontend/dist`
3. Add redirect/proxy for `/api/*` → your backend URL, or set axios `baseURL` to the API host.

## Error logging (Sentry)

1. Create a Sentry Node project.
2. Set `SENTRY_DSN` in backend environment.
3. Unhandled 5xx errors are reported automatically.

## API documentation

Swagger UI: `https://<your-api-host>/api/docs`  
OpenAPI JSON: `https://<your-api-host>/api/docs/openapi.json`

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs lint, backend tests, frontend build, and Playwright E2E on push/PR.
