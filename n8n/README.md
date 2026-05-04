# n8n Setup Guide for FocusGuard AI

## What this workflow does

When the FocusGuard backend POSTs a session payload to the webhook, this workflow:

1. Receives the payload at the **Webhook** node
2. Branches via **IF** node on `body.alert == true`
3. **Alert branch**: sends Telegram message → appends to Google Sheet → sends Gmail report
4. **Healthy branch**: appends to Google Sheet → sends Gmail report

## Payload schema

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

## Quick install (Docker)

```bash
docker run -d --name n8n -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=changeme \
  docker.n8n.io/n8nio/n8n
```

Open http://localhost:5678

## Importing the workflow

1. Go to **Workflows → Import from File**
2. Choose `focusguard_workflow.json`
3. Connect credentials:
   - **Telegram**: create a bot via @BotFather, paste the token
   - **Google Sheets OAuth2**: connect your Google account
   - **Gmail OAuth2**: connect your Gmail account
4. Update the `chatId` in the Telegram node with your Telegram chat ID
5. Update the `documentId` in both Google Sheets nodes with your spreadsheet ID
6. **Activate** the workflow

## Get your webhook URL

Once activated, click the Webhook node → copy the **Production URL**:

```
https://your-n8n-host/webhook/d6d71ed0-9a99-46e7-bbd6-456945ae71ca
```

## Configure FocusGuard

1. Login to FocusGuard AI → **Settings**
2. Paste your webhook URL into "n8n Webhook URL"
3. Click "Test webhook" — you should see a `TEST` row land in your sheet
4. Save settings

Done! Every session you complete will now flow through the n8n workflow.

## Telegram chat ID lookup

Send a message to your bot, then visit:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```
Look for `chat.id` in the response.

## Troubleshooting

- **No webhook delivery**: ensure the workflow is **Active** (toggle top-right)
- **Telegram silent**: re-issue `/start` to your bot from the target chat
- **Sheets row missing**: confirm the OAuth2 credential has Drive & Sheets scopes
- **Gmail blocked**: re-authenticate the OAuth2 credential
