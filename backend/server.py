from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import logging
import bcrypt
import jwt as pyjwt
import httpx
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, status
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ----- Config -----
JWT_SECRET = os.environ.get('JWT_SECRET', 'focusguard-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24
REFRESH_TOKEN_DAYS = 7
N8N_WEBHOOK_URL = os.environ.get(
    'N8N_WEBHOOK_URL',
    'https://aarya123.app.n8n.cloud/webhook/d6d71ed0-9a99-46e7-bbd6-456945ae71ca'
)

DATA_DIR = ROOT_DIR / 'data'
DATA_DIR.mkdir(exist_ok=True)
USERS_FILE = DATA_DIR / 'users.json'
SESSIONS_FILE = DATA_DIR / 'sessions.json'
SETTINGS_FILE = DATA_DIR / 'settings.json'

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="FocusGuard AI API")
api_router = APIRouter(prefix="/api")


# ----- JSON Storage -----
def read_json(path: Path) -> list:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return []

def write_json(path: Path, data: list):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

def find_one(path: Path, **kwargs) -> Optional[Dict]:
    for item in read_json(path):
        if all(item.get(k) == v for k, v in kwargs.items()):
            return item
    return None

def insert_one(path: Path, doc: Dict):
    data = read_json(path)
    data.append(doc)
    write_json(path, data)

def update_one(path: Path, match: Dict, update: Dict):
    data = read_json(path)
    for i, item in enumerate(data):
        if all(item.get(k) == v for k, v in match.items()):
            data[i].update(update)
            write_json(path, data)
            return True
    return False

def upsert_one(path: Path, match: Dict, update: Dict):
    if not update_one(path, match, update):
        insert_one(path, {**match, **update})

def find_all(path: Path, **kwargs) -> List[Dict]:
    return [item for item in read_json(path) if all(item.get(k) == v for k, v in kwargs.items())]

def count_docs(path: Path, **kwargs) -> int:
    return len(find_all(path, **kwargs))


# ----- Models -----
class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class SessionIn(BaseModel):
    blink_count: int
    blinks_per_min: float
    fatigue_status: str
    session_duration_sec: int
    alert: bool
    avg_ear: Optional[float] = None
    productivity_score: Optional[float] = None

class SessionOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    timestamp: str
    blink_count: int
    blinks_per_min: float
    fatigue_status: str
    session_duration_sec: int
    alert: bool
    avg_ear: Optional[float] = None
    productivity_score: Optional[float] = None
    n8n_forwarded: bool = False

class SettingsIn(BaseModel):
    n8n_webhook_url: Optional[str] = ""
    telegram_bot_token: Optional[str] = ""
    telegram_chat_id: Optional[str] = ""
    blink_threshold_low: Optional[int] = 12
    blink_threshold_strain: Optional[int] = 8
    break_reminder_minutes: Optional[int] = 20
    sound_alerts: Optional[bool] = True
    desktop_notifications: Optional[bool] = True
    dark_mode: Optional[bool] = True

class SettingsOut(SettingsIn):
    user_id: str

class AIRecsIn(BaseModel):
    recent_status: Optional[str] = "HEALTHY"
    avg_blinks_per_min: Optional[float] = 15
    total_session_minutes: Optional[float] = 30


# ----- Auth Helpers -----
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    return pyjwt.encode({"sub": user_id, "email": email, "role": role, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)},
        JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return pyjwt.encode({"sub": user_id, "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)},
        JWT_SECRET, algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False,
        samesite="lax", max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False,
        samesite="lax", max_age=REFRESH_TOKEN_DAYS * 24 * 3600, path="/")

def user_to_public(user: Dict) -> UserPublic:
    return UserPublic(id=user["id"], email=user["email"], name=user["name"],
        role=user.get("role", "user"),
        created_at=user.get("created_at", datetime.now(timezone.utc).isoformat()))

async def get_current_user(request: Request) -> Dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = find_one(USERS_FILE, id=payload["sub"])
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {k: v for k, v in user.items() if k != "password_hash"}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: Dict = Depends(get_current_user)) -> Dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ----- Startup -----
@app.on_event("startup")
async def startup():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@focusguard.ai")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@FocusGuard123")
    if not find_one(USERS_FILE, email=admin_email):
        insert_one(USERS_FILE, {
            "id": str(uuid.uuid4()), "email": admin_email, "name": "Admin",
            "password_hash": hash_password(admin_password), "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin: %s", admin_email)


# ----- Auth -----
@api_router.post("/auth/register", response_model=UserPublic)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    if find_one(USERS_FILE, email=email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {"id": user_id, "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password), "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()}
    insert_one(USERS_FILE, doc)
    insert_one(SETTINGS_FILE, {"user_id": user_id, "n8n_webhook_url": N8N_WEBHOOK_URL,
        "telegram_bot_token": "", "telegram_chat_id": "", "blink_threshold_low": 12,
        "blink_threshold_strain": 8, "break_reminder_minutes": 20,
        "sound_alerts": True, "desktop_notifications": True, "dark_mode": True})
    set_auth_cookies(response, create_access_token(user_id, email, "user"), create_refresh_token(user_id))
    return user_to_public(doc)

@api_router.post("/auth/login", response_model=UserPublic)
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = find_one(USERS_FILE, email=email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not find_one(SETTINGS_FILE, user_id=user["id"]):
        insert_one(SETTINGS_FILE, {"user_id": user["id"], "n8n_webhook_url": N8N_WEBHOOK_URL,
            "telegram_bot_token": "", "telegram_chat_id": "", "blink_threshold_low": 12,
            "blink_threshold_strain": 8, "break_reminder_minutes": 20,
            "sound_alerts": True, "desktop_notifications": True, "dark_mode": True})
    set_auth_cookies(response, create_access_token(user["id"], user["email"], user.get("role", "user")),
        create_refresh_token(user["id"]))
    return user_to_public(user)

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: Dict = Depends(get_current_user)):
    return user_to_public(user)

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = find_one(USERS_FILE, id=payload["sub"])
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"], user.get("role", "user"))
        response.set_cookie("access_token", access, httponly=True, secure=False,
            samesite="lax", max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
        return {"ok": True}
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----- n8n -----
async def forward_to_n8n(doc: Dict, webhook_url: str = None) -> bool:
    url = webhook_url or N8N_WEBHOOK_URL
    if not url:
        return False
    payload = {k: doc[k] for k in ["user_name","user_email","timestamp","blink_count",
        "blinks_per_min","fatigue_status","session_duration_sec","alert"]}
    try:
        async with httpx.AsyncClient(timeout=10.0) as hc:
            r = await hc.post(url, json=payload)
            logger.info("n8n: %s", r.status_code)
            return 200 <= r.status_code < 300
    except Exception as e:
        logger.warning("n8n failed: %s", e)
        return False


# ----- Sessions -----
@api_router.post("/sessions", response_model=SessionOut)
async def create_session(body: SessionIn, user: Dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"],
        "user_email": user["email"], "timestamp": datetime.now(timezone.utc).isoformat(),
        "blink_count": body.blink_count, "blinks_per_min": body.blinks_per_min,
        "fatigue_status": body.fatigue_status, "session_duration_sec": body.session_duration_sec,
        "alert": body.alert, "avg_ear": body.avg_ear, "productivity_score": body.productivity_score}
    insert_one(SESSIONS_FILE, doc.copy())
    doc["n8n_forwarded"] = await forward_to_n8n(doc)
    return SessionOut(**doc)

@api_router.get("/sessions", response_model=List[SessionOut])
async def list_sessions(limit: int = 100, user: Dict = Depends(get_current_user)):
    items = sorted(find_all(SESSIONS_FILE, user_id=user["id"]),
        key=lambda x: x.get("timestamp", ""), reverse=True)[:limit]
    for it in items:
        it.setdefault("n8n_forwarded", False)
    return [SessionOut(**it) for it in items]

@api_router.get("/sessions/stats")
async def sessions_stats(user: Dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    sessions = find_all(SESSIONS_FILE, user_id=user["id"])
    parsed = []
    for s in sessions:
        try:
            parsed.append((datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00")), s))
        except:
            continue
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = [s for t, s in parsed if t >= today_start]
    today_blinks = sum(s["blink_count"] for s in today_sessions)
    today_minutes = sum(s["session_duration_sec"] for s in today_sessions) / 60.0
    today_avg_bpm = (sum(s["blinks_per_min"] for s in today_sessions) / len(today_sessions)) if today_sessions else 0
    daily = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = day + timedelta(days=1)
        day_items = [s for t, s in parsed if day <= t < next_day]
        daily.append({"date": day.strftime("%a"), "full_date": day.strftime("%Y-%m-%d"),
            "blinks": sum(s["blink_count"] for s in day_items),
            "minutes": round(sum(s["session_duration_sec"] for s in day_items) / 60.0, 1),
            "avg_bpm": round((sum(s["blinks_per_min"] for s in day_items) / len(day_items)) if day_items else 0, 1),
            "alerts": sum(1 for s in day_items if s.get("alert"))})
    last_30 = now - timedelta(days=30)
    recent = [s for t, s in parsed if t >= last_30]
    status_count = {"HEALTHY": 0, "LOW BLINK RATE": 0, "STRAIN DETECTED": 0}
    for s in recent:
        st = s.get("fatigue_status", "HEALTHY")
        if st in status_count:
            status_count[st] += 1
    healthy_pct = (status_count["HEALTHY"] / len(recent)) if recent else 1.0
    return {
        "today": {"total_blinks": today_blinks, "total_minutes": round(today_minutes, 1),
            "avg_blinks_per_min": round(today_avg_bpm, 1), "sessions": len(today_sessions),
            "alerts": sum(1 for s in today_sessions if s.get("alert"))},
        "daily": daily,
        "status_distribution": [{"name": k, "value": v} for k, v in status_count.items()],
        "productivity_score": round(healthy_pct * 100, 0),
        "eye_health_score": round(min(100, max(0, today_avg_bpm * 5)), 0) if today_avg_bpm else 75,
        "total_sessions": len(parsed),
    }


# ----- Settings -----
@api_router.get("/settings", response_model=SettingsOut)
async def get_settings(user: Dict = Depends(get_current_user)):
    s = find_one(SETTINGS_FILE, user_id=user["id"])
    if not s:
        s = {"user_id": user["id"], "n8n_webhook_url": N8N_WEBHOOK_URL,
            "telegram_bot_token": "", "telegram_chat_id": "", "blink_threshold_low": 12,
            "blink_threshold_strain": 8, "break_reminder_minutes": 20,
            "sound_alerts": True, "desktop_notifications": True, "dark_mode": True}
        insert_one(SETTINGS_FILE, s.copy())
    return SettingsOut(**s)

@api_router.put("/settings", response_model=SettingsOut)
async def update_settings(body: SettingsIn, user: Dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    upsert_one(SETTINGS_FILE, {"user_id": user["id"]}, update)
    return SettingsOut(**find_one(SETTINGS_FILE, user_id=user["id"]))

@api_router.post("/settings/test-webhook")
async def test_webhook(user: Dict = Depends(get_current_user)):
    test_doc = {"user_name": user["name"], "user_email": user["email"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "blink_count": 42, "blinks_per_min": 14.0,
        "fatigue_status": "TEST", "session_duration_sec": 60, "alert": False}
    ok = await forward_to_n8n(test_doc, N8N_WEBHOOK_URL)
    return {"success": ok, "webhook_url": N8N_WEBHOOK_URL}


# ----- AI Recommendations -----
@api_router.post("/ai/recommendations")
async def ai_recommendations(body: AIRecsIn, user: Dict = Depends(get_current_user)):
    bpm = body.avg_blinks_per_min or 15
    st = body.recent_status or "HEALTHY"
    if st == "STRAIN DETECTED" or bpm < 8:
        recs = [
            "🚨 Take an immediate 10-minute break — your eyes need rest right now!",
            "Apply the 20-20-20 rule: look 20 feet away for 20 seconds every 20 minutes.",
            "Splash cold water on your face and do gentle eye-rolling exercises.",
            "Consider using artificial tears to lubricate and reduce dryness.",
        ]
    elif st == "LOW BLINK RATE" or bpm < 12:
        recs = [
            "⚠️ Blinking less than normal — consciously blink 10 times slowly right now.",
            "Reduce screen brightness and enable night mode to ease strain.",
            "Position screen at arm's length and slightly below eye level.",
            "Set a reminder for a 5-minute break every 45 minutes.",
        ]
    else:
        recs = [
            "✅ Great blink rate! Keep up the good work.",
            "Stay hydrated — drink water every hour to keep eyes moist.",
            "Match workspace lighting to screen brightness to reduce glare.",
            "Use the 20-20-20 rule proactively to maintain excellent eye health.",
        ]
    return {"recommendations": recs, "ai": True}


# ----- Admin -----
@api_router.get("/admin/users")
async def admin_users(_: Dict = Depends(require_admin)):
    users = read_json(USERS_FILE)
    result = []
    for u in users:
        u_clean = {k: v for k, v in u.items() if k != "password_hash"}
        u_clean["session_count"] = count_docs(SESSIONS_FILE, user_id=u["id"])
        result.append(u_clean)
    return result

@api_router.get("/admin/sessions")
async def admin_sessions(_: Dict = Depends(require_admin)):
    items = sorted(read_json(SESSIONS_FILE), key=lambda x: x.get("timestamp", ""), reverse=True)[:200]
    for it in items:
        it.setdefault("n8n_forwarded", False)
    return items

@api_router.get("/admin/health")
async def admin_health(_: Dict = Depends(require_admin)):
    return {"api": "healthy", "storage": "json-files", "n8n_webhook": N8N_WEBHOOK_URL,
        "users_total": len(read_json(USERS_FILE)),
        "sessions_total": len(read_json(SESSIONS_FILE)),
        "uptime": datetime.now(timezone.utc).isoformat()}

@api_router.get("/admin/n8n-status")
async def admin_n8n_status(_: Dict = Depends(require_admin)):
    return {"webhook_url": N8N_WEBHOOK_URL, "webhook_configured": bool(N8N_WEBHOOK_URL),
        "total_users": len(read_json(USERS_FILE)), "coverage_pct": 100.0}

@api_router.get("/")
async def root():
    return {"service": "FocusGuard AI", "status": "ok"}


app.include_router(api_router)
frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
app.add_middleware(CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])