# FocusGuard AI — Product Requirements Document

**Created**: 2026-02-09
**Status**: MVP Complete

## Original Problem Statement

Build FocusGuard AI — a real-time eye fatigue detection + n8n automation platform with:
- Webcam-based blink rate detection (MediaPipe Face Mesh + EAR algorithm)
- Real-time fatigue classification (HEALTHY / LOW BLINK RATE / STRAIN DETECTED)
- Full SaaS dashboard (landing, auth, dashboard, settings, admin)
- Backend integration with provided n8n workflow (Telegram + Gmail + Google Sheets)
- AI fatigue prediction & personalized eye-health recommendations
- Premium startup-grade UI with futuristic AI health-tech branding

## Architecture

- **Frontend**: React 19 + Tailwind + Shadcn UI + Framer Motion + Recharts + jsPDF
- **Backend**: FastAPI + MongoDB + httpx + JWT (httpOnly cookies) + bcrypt
- **AI**: MediaPipe Face Mesh in-browser; Claude Sonnet 4.5 (Emergent Universal Key) for recommendations
- **Automation**: n8n workflow (provided JSON in `/n8n/`) — backend forwards session data via webhook
- **Optional**: Python desktop client reference in `/desktop-client/`

## User Personas

1. **Developer/Designer** — heavy screen time, wants ambient eye-health monitoring
2. **Student** — long study sessions, wants automated reminders + email summaries
3. **Admin** — manages multiple users in an org, monitors API/n8n health

## Core Requirements (Static)

- JWT-based auth with email/password + httpOnly cookie sessions
- Per-user n8n webhook URL (configurable in settings)
- Real-time blink/EAR computation in browser (privacy-preserving)
- Session payload in EXACT shape required by n8n workflow
- Admin RBAC for /admin routes

## What's Been Implemented (2026-02-09)

### Backend
- ✅ Auth: register, login, logout, refresh, me (httpOnly cookies)
- ✅ Admin seeding (admin@focusguard.ai / Admin@FocusGuard123)
- ✅ Sessions: POST/GET + auto-forward to user's n8n webhook
- ✅ Stats aggregation (today, daily-7, status distribution, productivity & eye-health scores)
- ✅ Settings: per-user webhook URL, telegram fields, thresholds, notifications
- ✅ Webhook test endpoint (`/api/settings/test-webhook`)
- ✅ AI recommendations via Claude Sonnet 4.5 (with graceful fallback)
- ✅ Admin: users, sessions, health, n8n-status
- ✅ MongoDB indexes (users.email unique, sessions.user_id, settings.user_id)
- ✅ 22/22 backend tests passing

### Frontend
- ✅ Landing page (hero, stats, features, how-it-works, CTA)
- ✅ Login + Register (split-screen aurora design)
- ✅ Dashboard (stat cards, productivity & eye-health rings, charts, AI recs panel)
- ✅ Live Session (MediaPipe Face Mesh, HUD overlay, EAR, blink counter, real-time status)
- ✅ Analytics (bar/line charts, sessions table, CSV + PDF export)
- ✅ Settings (n8n webhook + test, telegram, thresholds, toggles)
- ✅ Admin panel (health pills, users, all sessions)
- ✅ Sidebar + mobile sheet navigation
- ✅ Outfit + Manrope fonts, purple/cyan aurora theme

### Extras
- ✅ `/n8n/focusguard_workflow.json` + setup README
- ✅ `/desktop-client/` Python reference + README
- ✅ Top-level `/app/README.md`
- ✅ `/app/memory/test_credentials.md`

## Backlog / Next Tasks (P1 / P2)

### P1
- Live in-app sound + desktop notification alerts (Web Audio + Notification API)
- Auto break-reminder timer (countdown overlay) — currently saved in settings but not enforced
- Forgot-password flow (currently scaffolded in playbook, not exposed)

### P2
- Google OAuth via Emergent Auth as alternate sign-in
- Per-user time-zone aware analytics
- Productivity heatmap (calendar view, last 90 days)
- Webhook-event log per user (audit trail of every n8n delivery)
- Stripe-based Pro plan (multi-user orgs, retention > 90 days, SSO)
- Native Electron desktop wrapper packaging the existing Python client

## Test Credentials

See `/app/memory/test_credentials.md`.
