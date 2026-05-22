# FinovaTrack — Feature & Improvement Backlog

Track progress by checking items off as they are completed.

> **Status verified against the codebase on 2026-05-22.** Items are marked `[x]`
> only where the supporting code was confirmed (model, route, or component).

---

## Already built

Verified against codebase (May 2026). All core items work; minor gaps listed under each.

- [x] User register / login (JWT + refresh tokens) — **OK** (`auth.js`, `AuthContext`, 15m access JWT, forgot/reset password, Settings profile).
- [x] Client CRUD with search and filters — **OK** (API + `Clients.jsx`: create/edit/delete, search name/email/phone, deal & KYC filters). Gap: deleting a client does not remove linked tasks/appointments.
- [x] KYC status tracking — **OK** (schema enum, form selects, badges, filters on list).
- [x] Deal pipeline (New → Contacted → Interested → Closed) — **OK** (schema, mini bar on cards, stepper on detail). Gap: deal/KYC only editable from Clients modal, not on detail page.
- [x] Task management (priority, due date, client link) — **OK** (full CRUD, complete patch, filters, optional client link, overdue styling).
- [x] Appointment management (types, status) — **OK** (In-Person / Call / Video Call, Upcoming / Completed / Cancelled, grouped list Today/Tomorrow/Past).
- [x] Dashboard (stats, today’s tasks/appointments, overdue) — **OK** (`/api/dashboard/stats` + `Dashboard.jsx`). Gap: “today’s tasks” only includes tasks with `dueDate` set to today.
- [x] Client detail page (pipeline, linked tasks & appointments) — **OK** (read-only profile, pipeline UI, tasks with complete, appointments list). Gaps: no “Edit client” / add task / add appointment from this page.
- [x] Responsive layout (sidebar, modals, toasts) — **OK** (mobile sidebar overlay, `md:` breakpoints, `Modal`, `react-hot-toast`, Vite `/api` proxy).
- [x] Forgot password & reset (email link; console log without SMTP)
- [x] Settings (profile, branch, employee ID, change password)
- [x] Logout confirmation modal; demo user `npm run seed`
- [x] Full client export (CSV/Excel) + weekly backup email job (`jobs/weeklyBackup.js`)

---

## Auth & account

_All complete — see “Already built”._

---

## One-tap activity logging

- [x] Client card: Called → pick outcome (Reached / No answer / Callback) — `CallLogFlow`, `PATCH /clients/:id/contact`
- [x] Auto-set `lastContactedAt` and prompt next follow-up after logging a call
- [x] Mobile-friendly two-tap logging flow

---

## Clients & deals

- [x] Product type field (savings, loan, credit card, insurance, etc.) — `Client.productType`
- [x] Deal value / expected commission — `Client.dealValue`, `Client.expectedCommission`
- [x] Lead source (referral, walk-in, campaign) — `Client.leadSource`
- [x] Last contacted date (auto-set on call log) — `Client.lastContactedAt`
- [x] Auto “stale lead” alerts (no contact in X days) — `GET /clients/stale`, `STALE_LEAD_DAYS = 14`, `followUpAttention` util
- [x] Structured next follow-up date on clients — `Client.nextFollowUpDate`
- [x] KYC document checklist (ID, address proof, income, etc.) — `Client.kycDocuments`
- [x] Activity timeline on client detail (calls, notes, status changes) — `Client.activities[]`, `POST /clients/:id/activities`
- [x] Import clients from CSV / Excel (with duplicate preview by email/phone)
- [x] Export clients to CSV / Excel (full backup export)
- [x] Export pipeline report to PDF — `GET /clients/export/pipeline-pdf`, `pipelinePdf` util
- [x] Soft delete clients with restore — `Client.deletedAt`, `POST /clients/:id/restore`, `GET /clients/deleted`
- [x] Duplicate client detection (same phone/email) — `findDuplicates`, `POST /clients/check-duplicates`

---

## Tasks & follow-ups

- [x] Recurring tasks (daily / weekly / monthly)
- [x] Task reminders (browser notifications)
- [x] Email reminders before due date
- [x] Task templates (“Follow up after meeting”, “Send KYC form”)
- [x] Bulk complete tasks
- [x] Bulk delete tasks
- [x] Filter tasks by client, priority, status, date range
- [x] Sort tasks on list page
- [x] Pagination on task list

---

## Appointments

- [x] Calendar view (week / month)
- [x] Google Calendar sync (add-event links, no OAuth)
- [x] Outlook / Microsoft Calendar sync (deeplink + .ics download)
- [x] SMS reminder before meeting (Twilio optional; logs if unset)
- [x] Email reminder before meeting (SMTP optional; logs if unset)
- [x] One-click “log call” after appointment
- [x] Auto-update deal status after meeting (on Complete flow)
- [x] Pagination on appointment list (10 per page)

---

## Dashboard & reporting

- [x] Charts — deals by stage
- [x] Charts — KYC completion percentage
- [x] Charts — tasks completed per week
- [x] Monthly targets vs actual — deals closed goal, deal value & commission (closed + open pipeline reporting)
- [x] “Focus list” — top clients to contact today
- [x] Weekly / monthly summary email
- [x] Export dashboard report (PDF)
- [x] Date range filter on dashboard stats

---

## UX & UI

- [x] Dark mode — `ThemeContext`, Navbar toggle
- [x] Global search (clients, tasks, appointments) — `GlobalSearch`, Ctrl+K
- [x] Keyboard shortcuts — `KeyboardShortcutsModal`, `useKeyboardShortcuts`
- [x] Drag-and-drop deal pipeline (Kanban board) — `Pipeline.jsx` (native HTML5 DnD)
- [x] Pagination on client list — backend `page`/`limit`, `ui/Pagination.jsx`
- [x] Empty-state guides (“Add your first client”) — `ui/EmptyState.jsx`
- [x] Loading skeletons (instead of spinners only) — `ui/Skeleton.jsx`
- [x] Form validation messages (inline) — `ui/FormField.jsx`, `utils/validation.js`
- [x] Confirm dialogs for destructive actions (consistent) — `ConfirmContext.jsx`
- [x] Mobile-friendly improvements (touch targets, bottom nav) — `BottomNav.jsx`, `min-h-[44px]`

---

## Notifications

- [x] In-app notification center — `NotificationCenter.jsx`, `routes/notifications.js`
- [x] Navbar badge for overdue tasks — `NotificationCenter` mounted in `Navbar`
- [x] Daily email digest (tasks + appointments) — `jobs/dailyDigest.js`
- [x] Push notifications (PWA) — `web-push`, `generate-vapid`, `push` utils, `useNotifications`

---

## Team & roles (larger scope)

_Not started — app is currently single-user by design._

- [ ] Multi-user / team support
- [ ] Roles: admin, sales rep, viewer
- [ ] Manager view (all reps’ pipelines)
- [ ] Assign client to a rep
- [ ] Branch / team grouping
- [ ] Leaderboard (optional)

---

## Integrations & mobile

- [x] Progressive Web App (PWA) installable — `vite-plugin-pwa`, `InstallPWA.jsx`
- [x] Click-to-call from client card — `ClientPhoneActions.jsx`
- [x] WhatsApp link from client phone — `ClientPhoneActions.jsx`, `utils/phone.js`
- [x] CRM integration (read-only) — `routes/integrations.js`
- [x] Core banking API integration (read-only) — `routes/integrations.js`, `externalFetch` util
- [x] AI assistant — suggest next action from notes & deal stage — `AiSuggestCard`, `services/aiSuggest.js`

---

## Compliance & security

- [x] Consent tracking per client — `Client.consents` (dataProcessing / marketing / callRecording)
- [x] Call recording / interaction flags — `Client.interactionFlags`
- [x] Audit log (who changed what, when) — `models/AuditLog.js`, `routes/audit.js`, `utils/audit.js`
- [x] Rate limiting on login / register — `middleware/rateLimit.js`
- [x] Stronger password rules — `utils/password.js`
- [x] Rotate JWT secret documentation — `docs/SECURITY.md`
- [x] Environment variable validation at server startup — `config/env.js`, `validateEnv()`
- [ ] Do not commit `.env` — document in README (`.gitignore` covers it; README note still missing)

---

## Technical & DevOps

- [ ] API input validation (Zod or Joi) — currently manual per-route checks only
- [ ] Centralized API error handling — no error-handling middleware mounted in `index.js`
- [ ] Unit tests — backend routes
- [ ] Unit tests — models
- [ ] E2E tests (Playwright or Cypress)
- [ ] ESLint + Prettier (frontend & backend) — no config present
- [ ] Docker Compose for local stack (mongo + api + frontend)
- [ ] GitHub Actions CI (lint, test) — no `.github/` workflows
- [ ] Deploy backend (Railway / Render / VPS)
- [ ] Deploy frontend (Netlify / Vercel / Railway)
- [x] Health endpoint with MongoDB connection status — `GET /api/health`
- [ ] Error logging (e.g. Sentry)
- [ ] API documentation (OpenAPI / Swagger)
- [ ] `package-lock.json` committed to git — files exist but are untracked
- [ ] README: troubleshooting MongoDB `querySrv` on Windows

---

## Suggested build order

1. [x] Forgot password + Settings page
2. [x] Activity timeline + last contacted date on clients
3. [x] Calendar view for appointments
4. [x] Dashboard charts
5. [x] CSV import / export for clients
6. [x] Reminders and in-app notifications

**Next up (remaining work):** Technical & DevOps hardening — testing, linting,
CI/CD, centralized error handling, input validation, and error logging.

---

## Notes

- Prioritize **solo sales rep** workflow unless building for a branch team.
- Keep `.env` out of git; use `.env.example` for templates only.
- Rotate Atlas and JWT secrets before production deploy.
