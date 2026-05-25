# FinovaTrack

A personal productivity web application for bank sales employees to track clients, appointments, and daily tasks.

## Features

- **Dashboard** — Today's tasks, appointments, overdue items, quick stats
- **Client Management** — Add/edit clients with KYC & deal status tracking, search & filter
- **Task Management** — Create tasks (linked to clients or general), priorities, due dates, completion tracking
- **Appointment Tracking** — Schedule meetings grouped by day (Today, Tomorrow, Upcoming, Past)
- **Progress Tracking** — Visual deal pipeline progress per client
- **Authentication** — JWT access tokens (15m) with refresh tokens, forgot/reset password, profile settings

**Solo user?** See [docs/SOLO_SETUP.md](docs/SOLO_SETUP.md) for one-account setup, `ALLOW_REGISTRATION`, backups, and local Mongo.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT (jsonwebtoken + bcryptjs) |

## Project Structure

```
FinovaTrack/
├── backend/
│   ├── src/
│   │   ├── models/      # User, Client, Task, Appointment
│   │   ├── routes/      # auth, clients, tasks, appointments, dashboard
│   │   ├── middleware/  # JWT auth middleware
│   │   └── index.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/  # Layout, Sidebar, Navbar, Modal
    │   ├── pages/       # Dashboard, Clients, ClientDetail, Tasks, Appointments, Login
    │   ├── context/     # AuthContext
    │   ├── services/    # api.js (axios client)
    │   └── App.jsx
    └── package.json
```

## Database Schema

### User
- `name`, `email`, `password` (bcrypt hashed)
- `branch`, `employeeId` (optional)
- `refreshTokens` (hashed, rotating)
- `resetPasswordToken`, `resetPasswordExpires` (for email reset links)

### Client
- `user` (ref), `name`, `phone`, `email`, `notes`
- `kycStatus`: Not Started | In Progress | Completed
- `dealStatus`: New | Contacted | Interested | Closed
- `nextAction`

### Task
- `user` (ref), `client` (ref, optional)
- `title`, `description`, `dueDate`
- `priority`: Low | Medium | High
- `status`: Pending | Completed
- `completedAt`

### Appointment
- `user` (ref), `client` (ref)
- `dateTime`, `type`: In-Person | Call | Video Call
- `location`, `notes`
- `status`: Upcoming | Completed | Cancelled

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login (returns `token`, `refreshToken`, `user`) |
| POST | /api/auth/refresh | Rotate access + refresh tokens |
| POST | /api/auth/logout | Revoke refresh token |
| POST | /api/auth/forgot-password | Send password reset link |
| POST | /api/auth/reset-password | Set new password via reset token |
| GET | /api/auth/me | Current user |
| PUT | /api/auth/profile | Update name, email, branch, employee ID |
| PUT | /api/auth/change-password | Change password (authenticated) |
| GET | /api/clients | List clients (search/filter) |
| POST | /api/clients | Create client |
| GET | /api/clients/:id | Get client |
| PUT | /api/clients/:id | Update client |
| DELETE | /api/clients/:id | Delete client |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| PATCH | /api/tasks/:id/complete | Mark complete |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/appointments | List appointments |
| POST | /api/appointments | Create appointment |
| PUT | /api/appointments/:id | Update appointment |
| DELETE | /api/appointments/:id | Delete appointment |
| GET | /api/dashboard/stats | Dashboard data |

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env   # Edit with your MongoDB URI
npm run dev            # Starts on http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev            # Starts on http://localhost:5173
```

### First Login

Register an account via the `/login` page — click "Register" to create one.

Or seed a demo user:

```bash
cd backend
npm run seed
# demo@finovatrack.com / Demo123!
```

Password reset links are printed to the backend console when SMTP is not configured (see `.env.example` for optional SMTP settings).

### API documentation

With the backend running, open [http://localhost:5000/api/docs](http://localhost:5000/api/docs) for interactive Swagger UI.

### Tests & quality

```bash
cd backend && npm test && npm run lint
cd frontend && npm run build && npm run lint && npm run test:e2e
```

CI runs the same checks via GitHub Actions (`.github/workflows/ci.yml`).

### Docker (full stack)

```bash
docker compose up --build
```

See [docs/DEPLOY.md](docs/DEPLOY.md) for Railway, Render, Netlify, VPS, and Sentry setup.

### Commit lockfiles

Commit `backend/package-lock.json` and `frontend/package-lock.json` so installs are reproducible in CI and production:

```bash
git add backend/package-lock.json frontend/package-lock.json
```

## Troubleshooting MongoDB on Windows (`querySrv` / DNS)

If `npm run dev` fails with `querySrv ECONNREFUSED`, `ENOTFOUND`, or DNS errors when using a MongoDB Atlas `mongodb+srv://` URI:

1. **Use a standard connection string** — In Atlas → Connect → Drivers, choose the non-SRV URI (`mongodb://host1,host2,...`) instead of `mongodb+srv://`.
2. **Check network** — Corporate VPN/firewall often blocks SRV DNS lookups; try another network or mobile hotspot.
3. **Flush DNS** — `ipconfig /flushdns` in an elevated Command Prompt.
4. **Local MongoDB for dev** — Install [MongoDB Community](https://www.mongodb.com/try/download/community) or run `docker run -d -p 27017:27017 mongo:7` and set `MONGODB_URI=mongodb://localhost:27017/finovatrack` in `backend/.env`.
5. **Node DNS order** — Try `set NODE_OPTIONS=--dns-result-order=ipv4first` before starting the server on some Windows setups.

## Environment variables & secrets

- **Do not commit** `backend/.env` or any file containing real secrets. The repo `.gitignore` excludes `.env`.
- Copy `backend/.env.example` → `backend/.env` and fill in values locally only.
- **Required at startup:** `MONGODB_URI`, `JWT_SECRET` (min 16 characters; use 32+ random bytes in production).
- The API exits immediately if required variables are missing or invalid.

See [docs/SECURITY.md](docs/SECURITY.md) for password policy, rate limiting, audit logs, consent fields, and **how to rotate `JWT_SECRET`**.

## Compliance features

- **Client consents** — data processing, marketing, and call recording (with date, method, notes) on the client profile.
- **Interaction flags** — call recorded, SMS, marketing contact, sensitive data discussed.
- **Audit log** — view recent create/update/delete actions under **Settings → Audit log** (`GET /api/audit-log`).

## Deployment

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for Railway, Render, Netlify/Vercel, VPS, Docker Compose, and Sentry.
