import os
import pytest
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

# Load backend env for MONGO_URL/DB_NAME
load_dotenv("/app/backend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else None
if not BASE_URL:
    # Fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    yield db
    client.close()


@pytest.fixture(scope="session")
def admin_token(http):
    r = http.post(f"{API}/admin/login", json={"email": "heeba@heeba.com", "password": "heeba"})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def seeded_user(mongo):
    """Seed a test user + session directly in Mongo (per agent-to-agent context)."""
    now = datetime.now(timezone.utc)
    user = {
        "user_id": "user_test123",
        "email": "test@heeba.com",
        "name": "Tester",
        "picture": None,
        "avatar": None,
        "points": 10000,
        "referral_code": "TEST1234",
        "referred_by": None,
        "referrals_count": 0,
        "last_spin_at": None,
        "created_at": now,
        "deleted_at": None,
    }
    mongo.users.update_one({"user_id": "user_test123"}, {"$set": user}, upsert=True)
    mongo.user_sessions.update_one(
        {"session_token": "testtoken123"},
        {"$set": {
            "session_token": "testtoken123",
            "user_id": "user_test123",
            "created_at": now,
            "expires_at": now + timedelta(days=7),
        }},
        upsert=True,
    )
    yield {"token": "testtoken123", "user_id": "user_test123"}
    # Cleanup skipped intentionally: xdist workers share Mongo; other workers
    # may still need the session. Records are prefixed and safe to leave.


@pytest.fixture(scope="session")
def user_headers(seeded_user):
    return {"Authorization": f"Bearer {seeded_user['token']}", "Content-Type": "application/json"}
