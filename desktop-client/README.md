# FocusGuard Desktop Client

A reference Python desktop client that runs MediaPipe Face Mesh on your local webcam
and pushes session telemetry to your FocusGuard backend (or directly to the n8n webhook).

## Run

```bash
cd desktop-client
pip install -r requirements.txt

export FOCUSGUARD_API_URL="https://your-focusguard-host/api/sessions"
export FOCUSGUARD_TOKEN="<bearer token from /api/auth/login>"
export FOCUSGUARD_USER="Aarya"
export FOCUSGUARD_EMAIL="user@focusguard.ai"

python focusguard_desktop.py
```

Press **Q** to quit.

## Notes

- This client is **optional** — the web app already contains a full in-browser
  MediaPipe implementation under `/live`.
- Token: open browser dev-tools → Application → Cookies → copy the `access_token` value.
  Or expose a small `/api/auth/token` endpoint that returns the JWT.
