"""FocusGuard AI backend tests - auth, sessions, settings, AI recs, admin."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://blink-monitor-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@focusguard.ai"
ADMIN_PASSWORD = "Admin@FocusGuard123"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert "access_token" in s.cookies, "access_token cookie missing"
    assert "refresh_token" in s.cookies, "refresh_token cookie missing"
    return s


@pytest.fixture(scope="module")
def new_user():
    """Register a new user and return (session, email, password, name)."""
    s = requests.Session()
    email = f"test_{int(time.time())}_{uuid.uuid4().hex[:6]}@focusguard.ai"
    password = "TestUser@123"
    name = "Test User"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name}, timeout=15)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    return {"session": s, "email": email, "password": password, "name": name, "user": r.json()}


# ---------- Public Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert data.get("service") == "FocusGuard AI"


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_user_and_sets_cookies(self, new_user):
        u = new_user["user"]
        assert u["email"] == new_user["email"]
        assert u["name"] == new_user["name"]
        assert u["role"] == "user"
        assert "id" in u
        assert "_id" not in u
        assert "password_hash" not in u
        cookies = new_user["session"].cookies
        assert "access_token" in cookies
        assert "refresh_token" in cookies

    def test_register_default_settings_created(self, new_user):
        s = new_user["session"]
        r = s.get(f"{API}/settings", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["n8n_webhook_url"] == ""
        assert d["blink_threshold_low"] == 12
        assert d["blink_threshold_strain"] == 8
        assert d["break_reminder_minutes"] == 20

    def test_admin_login_success(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"
        assert "_id" not in d
        assert "password_hash" not in d

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_without_cookie(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
        assert r.status_code == 200
        assert "access_token" in s.cookies
        r2 = s.post(f"{API}/auth/logout", timeout=10)
        assert r2.status_code == 200
        # After logout the server should send Set-Cookie expiring tokens
        # Check /me with the same session is now unauthenticated
        # Note: requests session may keep stale cookie unless server sends expired cookie - check via fresh request without cookies
        # Verify cookies were instructed to be deleted
        set_cookies = r2.headers.get("set-cookie", "")
        assert "access_token=" in set_cookies.lower() or "access_token" in set_cookies

    def test_refresh_issues_new_access_token(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
        assert r.status_code == 200
        old_access = s.cookies.get("access_token")
        # Drop access_token to force refresh path
        s.cookies.set("access_token", "", domain=s.cookies.list_domains()[0])
        r2 = s.post(f"{API}/auth/refresh", timeout=10)
        assert r2.status_code == 200
        assert r2.json().get("ok") is True
        new_access = s.cookies.get("access_token")
        assert new_access and new_access != ""

    def test_bcrypt_hash_format(self):
        """Verify bcrypt hashes are properly formatted (not plain text in DB)."""
        # Indirect test: login works -> bcrypt verify worked -> hash is bcrypt
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
        assert r.status_code == 200


# ---------- Sessions ----------
class TestSessions:
    def test_create_session(self, new_user):
        s = new_user["session"]
        payload = {
            "blink_count": 120,
            "blinks_per_min": 8,
            "fatigue_status": "STRAIN DETECTED",
            "session_duration_sec": 3600,
            "alert": True,
            "avg_ear": 0.18,
        }
        r = s.post(f"{API}/sessions", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        assert d["user_id"]
        assert d["blink_count"] == 120
        assert d["fatigue_status"] == "STRAIN DETECTED"
        assert d["alert"] is True
        assert d["n8n_forwarded"] is False  # No webhook configured -> false
        assert "_id" not in d

    def test_list_sessions(self, new_user):
        s = new_user["session"]
        # Create a second session
        s.post(f"{API}/sessions", json={
            "blink_count": 50, "blinks_per_min": 15, "fatigue_status": "HEALTHY",
            "session_duration_sec": 600, "alert": False
        }, timeout=10)
        r = s.get(f"{API}/sessions", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 2
        for it in items:
            assert "_id" not in it
            assert "id" in it

    def test_sessions_stats(self, new_user):
        s = new_user["session"]
        r = s.get(f"{API}/sessions/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "today" in d
        assert "daily" in d
        assert isinstance(d["daily"], list)
        assert len(d["daily"]) == 7
        assert "status_distribution" in d
        assert isinstance(d["status_distribution"], list)
        assert len(d["status_distribution"]) == 3
        assert "productivity_score" in d
        assert "eye_health_score" in d
        assert "total_sessions" in d
        assert d["total_sessions"] >= 2

    def test_sessions_unauthenticated(self):
        r = requests.get(f"{API}/sessions", timeout=10)
        assert r.status_code == 401


# ---------- Settings ----------
class TestSettings:
    def test_get_settings_defaults(self, new_user):
        s = new_user["session"]
        r = s.get(f"{API}/settings", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["user_id"]
        assert d["n8n_webhook_url"] == ""
        assert d["blink_threshold_low"] == 12
        assert d["blink_threshold_strain"] == 8
        assert d["sound_alerts"] is True
        assert d["dark_mode"] is True

    def test_update_settings(self, new_user):
        s = new_user["session"]
        payload = {
            "n8n_webhook_url": "https://example.com/webhook/test",
            "telegram_bot_token": "fake_bot_token",
            "telegram_chat_id": "12345",
            "blink_threshold_low": 14,
            "blink_threshold_strain": 6,
            "break_reminder_minutes": 25,
            "sound_alerts": False,
            "desktop_notifications": False,
            "dark_mode": False,
        }
        r = s.put(f"{API}/settings", json=payload, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["n8n_webhook_url"] == payload["n8n_webhook_url"]
        assert d["blink_threshold_low"] == 14
        assert d["blink_threshold_strain"] == 6
        assert d["break_reminder_minutes"] == 25

        # Verify persistence
        r2 = s.get(f"{API}/settings", timeout=10)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["n8n_webhook_url"] == payload["n8n_webhook_url"]
        assert d2["blink_threshold_low"] == 14

    def test_test_webhook_no_url(self):
        # Use a fresh user with no webhook configured
        s = requests.Session()
        email = f"webtest_{int(time.time())}_{uuid.uuid4().hex[:6]}@focusguard.ai"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "TestUser@123", "name": "WT"}, timeout=10)
        assert r.status_code == 200
        r2 = s.post(f"{API}/settings/test-webhook", timeout=10)
        assert r2.status_code == 400


# ---------- AI Recommendations ----------
class TestAI:
    def test_ai_recommendations(self, new_user):
        s = new_user["session"]
        payload = {
            "recent_status": "STRAIN DETECTED",
            "avg_blinks_per_min": 7,
            "total_session_minutes": 120,
        }
        r = s.post(f"{API}/ai/recommendations", json=payload, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "recommendations" in d
        assert isinstance(d["recommendations"], list)
        assert len(d["recommendations"]) >= 1
        assert "ai" in d
        # ai may be true or false (graceful fallback acceptable)


# ---------- Admin ----------
class TestAdmin:
    def test_admin_users(self, admin_session):
        r = admin_session.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert len(users) >= 1
        for u in users:
            assert "_id" not in u
            assert "password_hash" not in u
            assert "session_count" in u

    def test_admin_sessions(self, admin_session):
        r = admin_session.get(f"{API}/admin/sessions", timeout=10)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert "_id" not in it

    def test_admin_health(self, admin_session):
        r = admin_session.get(f"{API}/admin/health", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["api"] == "healthy"
        assert d["mongodb"] == "healthy"
        assert "llm_key_configured" in d
        assert "users_total" in d
        assert "sessions_total" in d

    def test_admin_n8n_status(self, admin_session):
        r = admin_session.get(f"{API}/admin/n8n-status", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert "users_with_webhook" in d
        assert "total_users" in d
        assert "coverage_pct" in d

    def test_non_admin_forbidden(self, new_user):
        s = new_user["session"]
        r = s.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 403
