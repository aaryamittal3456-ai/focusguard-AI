# FocusGuard AI

> AI-powered eye fatigue prevention ecosystem for students, developers, and professionals.

FocusGuard AI is a full-stack SaaS that uses MediaPipe Face Mesh + the EAR
algorithm to track blink rate in real-time, classify fatigue, and route alerts
through an n8n workflow (Telegram + Gmail + Google Sheets).

## Stack

- **Backend**: FastAPI + MongoDB · JWT auth · httpx for n8n forwarding · Claude Sonnet 4.5 (via Emergent LLM key)
- **Frontend**: React 19 · Tailwind · Shadcn UI · Framer Motion · Recharts · jsPDF
- **AI**: MediaPipe Face Mesh (in-browser) · 468 landmarks · EAR algorithm
- **Automation**: n8n workflow (Telegram + Gmail + Sheets)
- **Desktop client (optional)**: Python + OpenCV + MediaPipe reference

## Project structure

```
/app
├── backend/                FastAPI app
├── frontend/               React SPA
├── desktop-client/         Optional Python client
├── n8n/                    Workflow JSON + setup docs
└── memory/                 PRD, test credentials
```

## Quickstart (in this environment)

The platform is already running on supervisor:
- Backend on `0.0.0.0:8001` (proxied via `/api`)
- Frontend on `:3000` (served via Kubernetes ingress)
- MongoDB on `mongodb://localhost:27017`

### Default admin

```
Email:    admin@focusguard.ai
Password: Admin@FocusGuard123
```

## Core flows

### 1. Auth
- `POST /api/auth/register` `{email, password, name}`
- `POST /api/auth/login` `{email, password}`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- httpOnly cookie sessions

### 2. Session capture
1. User opens `/live` and clicks **Start session**
2. MediaPipe runs in-browser, computes EAR each frame, counts blinks
3. On stop, frontend POSTs `/api/sessions`
4. Backend forwards payload to user-configured n8n webhook
5. n8n fires Telegram alert + Sheets log + Gmail report

### 3. n8n
See `n8n/README.md` for full setup. Import `n8n/focusguard_workflow.json`.

### 4. AI Recommendations
`POST /api/ai/recommendations` returns 4 personalized eye-health tips from Claude Sonnet 4.5.

## Required JSON payload

```json
{
  "user_name": "Aarya",
  "user_email": "user@example.com",
  "timestamp": "2026-02-09T10:23:11Z",
  "blink_count": 120,
  "blinks_per_min": 8,
  "fatigue_status": "STRAIN DETECTED",
  "session_duration_sec": 3600,
  "alert": true
}
```

## Environment variables

### `backend/.env`
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="focusguard_ai"
JWT_SECRET="<64-char-hex>"
ADMIN_EMAIL="admin@focusguard.ai"
ADMIN_PASSWORD="Admin@FocusGuard123"
EMERGENT_LLM_KEY="<emergent-llm-key>"
FRONTEND_URL="<your-frontend-url>"
```

### `frontend/.env`
```
REACT_APP_BACKEND_URL=<your-backend-url>
```

## Routes (frontend)

- `/`           Landing page
- `/login`      Login
- `/register`   Sign up
- `/dashboard`  Dashboard with stats, charts, AI tips
- `/live`       Real-time webcam fatigue detection
- `/analytics`  Charts + session history + CSV/PDF export
- `/settings`   Webhook, Telegram, thresholds, notifications
- `/admin`      Admin: users, health, n8n status (admin only)

## License

MIT
