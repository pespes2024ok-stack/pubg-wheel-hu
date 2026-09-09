import os
import uuid
import logging
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import httpx
import requests
import jwt
import bcrypt
from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, UploadFile, File, Query
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("heeba")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

ADMIN_JWT_SECRET = os.environ.get("ADMIN_JWT_SECRET", "heeba_admin_secret")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# Object storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "heeba"
_storage_key = None

# Push
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
_push_client = httpx.AsyncClient(base_url=PUSH_BASE_URL, headers={"X-Push-Key": PUSH_KEY}, timeout=10.0)

app = FastAPI()
api = APIRouter(prefix="/api")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}"


def clean(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------
def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    global _storage_key
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Push helper
# ---------------------------------------------------------------------------
async def send_push(recipients: List[str], data: dict):
    if not recipients:
        return
    payload = {"recipients": recipients[:100], "data": data}
    try:
        resp = await _push_client.post("/api/v1/push/trigger", json=payload)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Push failed (non-blocking): {e}")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class SessionBody(BaseModel):
    session_id: str


class AdminLogin(BaseModel):
    email: str
    password: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class ReferralApply(BaseModel):
    code: str


class RegisterPushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str


class PrizeBody(BaseModel):
    name: str
    image: str = ""
    description: str = ""
    value: str = ""
    rarity: str = "common"  # common|rare|epic|legendary
    kind: str = "points"  # points|item|nothing
    points_reward: int = 0  # if kind==points
    win_chance: float = 10.0
    quantity: int = -1  # -1 = unlimited
    remaining: int = -1
    active: bool = True
    order: int = 0


class ProductBody(BaseModel):
    name: str
    image: str = ""
    description: str = ""
    category: str = "UC"
    rarity: str = "common"
    price_points: int = 100
    quantity: int = -1
    remaining: int = -1
    active: bool = True
    order: int = 0


class CreatorBody(BaseModel):
    name: str
    image: str = ""
    platform: str = "YouTube"
    url: str = ""
    subtitle: str = ""
    active: bool = True
    order: int = 0


class BackgroundBody(BaseModel):
    title: str = ""
    image: str = ""
    target: str = "home"  # login|home|profile|wheel|store|general
    active: bool = True
    order: int = 0


class NotificationBody(BaseModel):
    title: str
    message: str


class SettingsBody(BaseModel):
    app_name: Optional[str] = None
    app_subtitle: Optional[str] = None
    tab_home: Optional[str] = None
    tab_store: Optional[str] = None
    tab_rewards: Optional[str] = None
    tab_profile: Optional[str] = None
    store_title: Optional[str] = None
    home_background: Optional[str] = None
    profile_background: Optional[str] = None
    signup_bonus: Optional[int] = None
    referral_bonus: Optional[int] = None
    spin_cooldown_hours: Optional[int] = None


class PointsAdjust(BaseModel):
    amount: int
    reason: str = "تعديل الأدمن"


class RewardStatus(BaseModel):
    status: str  # pending|delivered|cancelled


class AvatarBody(BaseModel):
    avatar: str


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    admin = await db.admins.find_one({"admin_id": payload.get("admin_id")}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin


# ---------------------------------------------------------------------------
# Google Auth
# ---------------------------------------------------------------------------
async def public_user(user: dict) -> dict:
    rewards_count = await db.rewards.count_documents({"user_id": user["user_id"], "deleted_at": None})
    return {
        "user_id": user["user_id"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("avatar") or user.get("picture"),
        "points": user.get("points", 0),
        "referral_code": user.get("referral_code"),
        "referrals_count": user.get("referrals_count", 0),
        "rewards_count": rewards_count,
        "referral_applied": bool(user.get("referred_by")),
    }


@api.post("/auth/session")
async def auth_session(body: SessionBody):
    async with httpx.AsyncClient(timeout=20.0) as hc:
        resp = await hc.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": body.session_id})
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = data.get("email")
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name"), "picture": data.get("picture")}})
        user = await db.users.find_one({"user_id": user_id})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        settings = await get_settings_doc()
        bonus = settings.get("signup_bonus", 100)
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "avatar": data.get("picture"),
            "points": bonus,
            "referral_code": uuid.uuid4().hex[:8].upper(),
            "referred_by": None,
            "referrals_count": 0,
            "last_spin_at": None,
            "created_at": now_utc(),
            "deleted_at": None,
        }
        await db.users.insert_one(user)
        if bonus > 0:
            await add_transaction(user_id, bonus, "bonus", "مكافأة التسجيل")

    session_token = data.get("session_token") or uuid.uuid4().hex
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": now_utc(),
        "expires_at": now_utc() + timedelta(days=7),
    })
    return {"session_token": session_token, "user": await public_user(user)}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return await public_user(user)


@api.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Transactions helper
# ---------------------------------------------------------------------------
async def add_transaction(user_id: str, amount: int, ttype: str, description: str):
    await db.transactions.insert_one({
        "id": new_id("tx_"),
        "user_id": user_id,
        "amount": amount,
        "type": ttype,
        "description": description,
        "created_at": now_utc(),
    })


async def add_reward(user_id: str, name: str, image: str, rarity: str, source: str):
    count = await db.rewards.count_documents({})
    order_number = f"HB{100000 + count}"
    reward = {
        "id": new_id("rw_"),
        "user_id": user_id,
        "name": name,
        "image": image,
        "rarity": rarity,
        "source": source,  # wheel|store
        "status": "pending",
        "order_number": order_number,
        "created_at": now_utc(),
        "deleted_at": None,
    }
    await db.rewards.insert_one(reward)
    return reward


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
DEFAULT_SETTINGS = {
    "app_name": "HEEBA",
    "app_subtitle": "PUBG Rewards & Lucky Wheel",
    "tab_home": "اللوبي",
    "tab_store": "المتجر",
    "tab_rewards": "جوائزي",
    "tab_profile": "الملف",
    "store_title": "HEEBA PUBG REWARDS STORE",
    "home_background": "https://images.unsplash.com/photo-1710438399422-2fca27686bcd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "profile_background": "https://images.unsplash.com/photo-1612306299440-15460d4009e4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "signup_bonus": 100,
    "referral_bonus": 50,
    "spin_cooldown_hours": 24,
}


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"_id": "singleton"})
    if not doc:
        doc = {"_id": "singleton", **DEFAULT_SETTINGS}
        await db.settings.insert_one(doc)
    merged = {**DEFAULT_SETTINGS, **doc}
    merged.pop("_id", None)
    return merged


@api.get("/settings")
async def get_settings():
    return await get_settings_doc()


# ---------------------------------------------------------------------------
# Wheel
# ---------------------------------------------------------------------------
@api.get("/wheel/prizes")
async def wheel_prizes():
    prizes = await db.prizes.find({"active": True, "deleted_at": None}, {"_id": 0}).sort([("order", 1), ("id", 1)]).to_list(100)
    return prizes


@api.get("/wheel/status")
async def wheel_status(user: dict = Depends(get_current_user)):
    settings = await get_settings_doc()
    cooldown = settings.get("spin_cooldown_hours", 24)
    last = user.get("last_spin_at")
    if last is None:
        return {"can_spin": True, "next_spin_at": None}
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    next_at = last + timedelta(hours=cooldown)
    can = now_utc() >= next_at
    return {"can_spin": can, "next_spin_at": next_at.isoformat() if not can else None}


@api.post("/wheel/spin")
async def wheel_spin(user: dict = Depends(get_current_user)):
    settings = await get_settings_doc()
    cooldown = settings.get("spin_cooldown_hours", 24)
    last = user.get("last_spin_at")
    if last is not None:
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if now_utc() < last + timedelta(hours=cooldown):
            next_at = last + timedelta(hours=cooldown)
            raise HTTPException(status_code=400, detail={"code": "cooldown", "next_spin_at": next_at.isoformat()})

    prizes = await db.prizes.find({"active": True, "deleted_at": None}, {"_id": 0}).sort([("order", 1), ("id", 1)]).to_list(100)
    if not prizes:
        raise HTTPException(status_code=400, detail="لا توجد جوائز متاحة")

    # weighted pick by win_chance among prizes with stock and chance > 0
    pool = []
    for i, p in enumerate(prizes):
        stock_ok = p.get("remaining", -1) != 0
        chance = float(p.get("win_chance", 0))
        if chance > 0 and stock_ok:
            pool.append((i, p, chance))

    if pool:
        total = sum(c for _, _, c in pool)
        r = random.uniform(0, total)
        upto = 0
        chosen_index, chosen = pool[0][0], pool[0][1]
        for i, p, c in pool:
            upto += c
            if r <= upto:
                chosen_index, chosen = i, p
                break
    else:
        # nobody wins -> pick a "nothing" prize if available else first
        chosen_index, chosen = 0, prizes[0]
        for i, p in enumerate(prizes):
            if p.get("kind") == "nothing":
                chosen_index, chosen = i, p
                break

    # record spin
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"last_spin_at": now_utc()}})

    reward_obj = None
    kind = chosen.get("kind", "points")
    if kind != "nothing" and chosen.get("remaining", -1) > 0:
        await db.prizes.update_one({"id": chosen["id"]}, {"$inc": {"remaining": -1}})

    if kind == "points":
        pts = int(chosen.get("points_reward", 0))
        if pts > 0:
            await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": pts}})
            await add_transaction(user["user_id"], pts, "spin", f"عجلة الحظ: {chosen['name']}")
    elif kind == "item":
        reward_obj = await add_reward(user["user_id"], chosen["name"], chosen.get("image", ""), chosen.get("rarity", "common"), "wheel")

    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "prize_index": chosen_index,
        "prize": chosen,
        "won": kind != "nothing",
        "points": fresh.get("points", 0),
        "reward": clean(reward_obj) if reward_obj else None,
    }


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------
@api.get("/store/products")
async def store_products():
    products = await db.products.find({"active": True, "deleted_at": None}, {"_id": 0}).sort("order", 1).to_list(200)
    return products


@api.post("/store/buy/{product_id}")
async def store_buy(product_id: str, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id, "active": True, "deleted_at": None})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير متوفر")
    if product.get("remaining", -1) == 0:
        raise HTTPException(status_code=400, detail="نفدت الكمية")
    price = int(product.get("price_points", 0))
    if user.get("points", 0) < price:
        raise HTTPException(status_code=400, detail="نقاطك غير كافية")

    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"points": -price}})
    if product.get("remaining", -1) > 0:
        await db.products.update_one({"id": product_id}, {"$inc": {"remaining": -1}})
    await add_transaction(user["user_id"], -price, "purchase", f"شراء: {product['name']}")
    reward = await add_reward(user["user_id"], product["name"], product.get("image", ""), product.get("rarity", "common"), "store")
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"ok": True, "points": fresh.get("points", 0), "reward": clean(reward)}


# ---------------------------------------------------------------------------
# Rewards / Transactions
# ---------------------------------------------------------------------------
@api.get("/rewards")
async def my_rewards(user: dict = Depends(get_current_user)):
    rewards = await db.rewards.find({"user_id": user["user_id"], "deleted_at": None}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rewards


@api.get("/transactions")
async def my_transactions(user: dict = Depends(get_current_user)):
    txs = await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return txs


# ---------------------------------------------------------------------------
# Referrals
# ---------------------------------------------------------------------------
@api.post("/referrals/apply")
async def apply_referral(body: ReferralApply, user: dict = Depends(get_current_user)):
    if user.get("referred_by"):
        raise HTTPException(status_code=400, detail="لقد استخدمت رمز إحالة مسبقاً")
    code = body.code.strip().upper()
    if code == user.get("referral_code"):
        raise HTTPException(status_code=400, detail="لا يمكنك استخدام رمزك الخاص")
    referrer = await db.users.find_one({"referral_code": code})
    if not referrer:
        raise HTTPException(status_code=404, detail="رمز الإحالة غير صحيح")
    settings = await get_settings_doc()
    bonus = settings.get("referral_bonus", 50)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"referred_by": referrer["user_id"]}, "$inc": {"points": bonus}})
    await db.users.update_one({"user_id": referrer["user_id"]}, {"$inc": {"points": bonus, "referrals_count": 1}})
    await add_transaction(user["user_id"], bonus, "referral", "مكافأة استخدام رمز الإحالة")
    await add_transaction(referrer["user_id"], bonus, "referral", "مكافأة دعوة صديق")
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"ok": True, "points": fresh.get("points", 0)}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@api.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    reads = await db.notification_reads.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    read_ids = {r["notification_id"] for r in reads}
    notes = await db.notifications.find({"deleted_at": None}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for n in notes:
        n["read"] = n["id"] in read_ids
    return notes


@api.post("/notifications/{note_id}/read")
async def read_notification(note_id: str, user: dict = Depends(get_current_user)):
    await db.notification_reads.update_one(
        {"user_id": user["user_id"], "notification_id": note_id},
        {"$set": {"user_id": user["user_id"], "notification_id": note_id, "read_at": now_utc()}},
        upsert=True,
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Content creators
# ---------------------------------------------------------------------------
@api.get("/creators")
async def get_creators():
    creators = await db.creators.find({"active": True, "deleted_at": None}, {"_id": 0}).sort("order", 1).to_list(100)
    return creators


# ---------------------------------------------------------------------------
# Backgrounds (public read)
# ---------------------------------------------------------------------------
@api.get("/backgrounds")
async def get_backgrounds():
    return await db.backgrounds.find({"active": True, "deleted_at": None}, {"_id": 0}).sort([("order", 1), ("id", 1)]).to_list(100)


# ---------------------------------------------------------------------------
# Avatar
# ---------------------------------------------------------------------------
@api.post("/me/avatar")
async def set_avatar(body: AvatarBody, user: dict = Depends(get_current_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"avatar": body.avatar}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Push registration
# ---------------------------------------------------------------------------
@api.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    try:
        resp = await _push_client.post("/api/v1/push/users/register", json=body.model_dump())
        if resp.status_code == 401:
            raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
        resp.raise_for_status()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"register-push failed: {e}")
        return {"status": "skipped"}
    return {"status": "registered"}


# ---------------------------------------------------------------------------
# Object storage upload/download
# ---------------------------------------------------------------------------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    content = await file.read()
    ext = (file.filename or "img.jpg").split(".")[-1].lower()
    path = f"{APP_NAME}/uploads/{admin['admin_id']}/{uuid.uuid4().hex}.{ext}"
    result = await run_in_threadpool(put_object, path, content, file.content_type or "image/jpeg")
    return {"path": result["path"]}


@api.get("/files/{path:path}")
async def download_file(path: str, token: Optional[str] = Query(None)):
    try:
        content, ctype = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


# ---------------------------------------------------------------------------
# ADMIN
# ---------------------------------------------------------------------------
@api.post("/admin/login")
async def admin_login(body: AdminLogin):
    admin = await db.admins.find_one({"email": body.email.strip().lower()})
    if not admin or not bcrypt.checkpw(body.password.encode(), admin["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    token = jwt.encode({"admin_id": admin["admin_id"], "iat": now_utc()}, ADMIN_JWT_SECRET, algorithm="HS256")
    return {"token": token, "email": admin["email"]}


@api.get("/admin/me")
async def admin_me(admin: dict = Depends(get_current_admin)):
    return {"admin_id": admin["admin_id"], "email": admin["email"]}


@api.post("/admin/change-password")
async def admin_change_password(body: ChangePassword, admin: dict = Depends(get_current_admin)):
    if not bcrypt.checkpw(body.current_password.encode(), admin["password_hash"].encode()):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="كلمة المرور قصيرة جداً")
    new_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    await db.admins.update_one({"admin_id": admin["admin_id"]}, {"$set": {"password_hash": new_hash}})
    return {"ok": True}


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_current_admin)):
    users = await db.users.count_documents({"deleted_at": None})
    prizes = await db.prizes.count_documents({"deleted_at": None})
    products = await db.products.count_documents({"deleted_at": None})
    rewards = await db.rewards.count_documents({"deleted_at": None})
    pending = await db.rewards.count_documents({"deleted_at": None, "status": "pending"})
    return {"users": users, "prizes": prizes, "products": products, "rewards": rewards, "pending_rewards": pending}


# ----- Admin: Prizes -----
@api.get("/admin/prizes")
async def admin_list_prizes(admin: dict = Depends(get_current_admin)):
    return await db.prizes.find({"deleted_at": None}, {"_id": 0}).sort("order", 1).to_list(200)


@api.post("/admin/prizes")
async def admin_create_prize(body: PrizeBody, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = new_id("pz_")
    if doc["quantity"] >= 0:
        doc["remaining"] = doc["quantity"]
    else:
        doc["remaining"] = -1
    doc["deleted_at"] = None
    doc["created_at"] = now_utc()
    await db.prizes.insert_one(doc)
    return clean(doc)


@api.put("/admin/prizes/{prize_id}")
async def admin_update_prize(prize_id: str, body: PrizeBody, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    existing = await db.prizes.find_one({"id": prize_id})
    if not existing:
        raise HTTPException(status_code=404, detail="غير موجود")
    if doc["quantity"] != existing.get("quantity"):
        doc["remaining"] = doc["quantity"] if doc["quantity"] >= 0 else -1
    await db.prizes.update_one({"id": prize_id}, {"$set": doc})
    updated = await db.prizes.find_one({"id": prize_id}, {"_id": 0})
    return updated


@api.delete("/admin/prizes/{prize_id}")
async def admin_delete_prize(prize_id: str, admin: dict = Depends(get_current_admin)):
    await db.prizes.update_one({"id": prize_id}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ----- Admin: Products -----
@api.get("/admin/products")
async def admin_list_products(admin: dict = Depends(get_current_admin)):
    return await db.products.find({"deleted_at": None}, {"_id": 0}).sort("order", 1).to_list(200)


@api.post("/admin/products")
async def admin_create_product(body: ProductBody, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = new_id("pr_")
    doc["remaining"] = doc["quantity"] if doc["quantity"] >= 0 else -1
    doc["deleted_at"] = None
    doc["created_at"] = now_utc()
    await db.products.insert_one(doc)
    return clean(doc)


@api.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, body: ProductBody, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="غير موجود")
    if doc["quantity"] != existing.get("quantity"):
        doc["remaining"] = doc["quantity"] if doc["quantity"] >= 0 else -1
    await db.products.update_one({"id": product_id}, {"$set": doc})
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: dict = Depends(get_current_admin)):
    await db.products.update_one({"id": product_id}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ----- Admin: Creators -----
@api.get("/admin/creators")
async def admin_list_creators(admin: dict = Depends(get_current_admin)):
    return await db.creators.find({"deleted_at": None}, {"_id": 0}).sort("order", 1).to_list(100)


@api.post("/admin/creators")
async def admin_create_creator(body: CreatorBody, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = new_id("cr_")
    doc["deleted_at"] = None
    await db.creators.insert_one(doc)
    return clean(doc)


@api.put("/admin/creators/{creator_id}")
async def admin_update_creator(creator_id: str, body: CreatorBody, admin: dict = Depends(get_current_admin)):
    await db.creators.update_one({"id": creator_id}, {"$set": body.model_dump()})
    return await db.creators.find_one({"id": creator_id}, {"_id": 0})


@api.delete("/admin/creators/{creator_id}")
async def admin_delete_creator(creator_id: str, admin: dict = Depends(get_current_admin)):
    await db.creators.update_one({"id": creator_id}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ----- Admin: Backgrounds -----
@api.get("/admin/backgrounds")
async def admin_list_backgrounds(admin: dict = Depends(get_current_admin)):
    return await db.backgrounds.find({"deleted_at": None}, {"_id": 0}).sort([("order", 1), ("id", 1)]).to_list(200)


@api.post("/admin/backgrounds")
async def admin_create_background(body: BackgroundBody, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = new_id("bg_")
    doc["deleted_at"] = None
    doc["created_at"] = now_utc()
    await db.backgrounds.insert_one(doc)
    return clean(doc)


@api.put("/admin/backgrounds/{bg_id}")
async def admin_update_background(bg_id: str, body: BackgroundBody, admin: dict = Depends(get_current_admin)):
    await db.backgrounds.update_one({"id": bg_id}, {"$set": body.model_dump()})
    return await db.backgrounds.find_one({"id": bg_id}, {"_id": 0})


@api.delete("/admin/backgrounds/{bg_id}")
async def admin_delete_background(bg_id: str, admin: dict = Depends(get_current_admin)):
    await db.backgrounds.update_one({"id": bg_id}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ----- Admin: Settings -----
@api.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(get_current_admin)):
    return await get_settings_doc()


@api.put("/admin/settings")
async def admin_update_settings(body: SettingsBody, admin: dict = Depends(get_current_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.settings.update_one({"_id": "singleton"}, {"$set": updates}, upsert=True)
    return await get_settings_doc()


# ----- Admin: Notifications -----
@api.get("/admin/notifications")
async def admin_list_notifications(admin: dict = Depends(get_current_admin)):
    return await db.notifications.find({"deleted_at": None}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/admin/notifications")
async def admin_send_notification(body: NotificationBody, admin: dict = Depends(get_current_admin)):
    doc = {
        "id": new_id("nt_"),
        "title": body.title,
        "message": body.message,
        "created_at": now_utc(),
        "deleted_at": None,
    }
    await db.notifications.insert_one(doc)
    user_ids = [u["user_id"] async for u in db.users.find({"deleted_at": None}, {"user_id": 1})]
    for i in range(0, len(user_ids), 100):
        await send_push(user_ids[i:i + 100], {"title": body.title, "message": body.message, "action_url": "/notifications"})
    return clean(doc)


@api.delete("/admin/notifications/{note_id}")
async def admin_delete_notification(note_id: str, admin: dict = Depends(get_current_admin)):
    await db.notifications.update_one({"id": note_id}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ----- Admin: Users & Rewards -----
@api.get("/admin/users")
async def admin_list_users(admin: dict = Depends(get_current_admin)):
    users = await db.users.find({"deleted_at": None}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return users


@api.post("/admin/users/{user_id}/points")
async def admin_adjust_points(user_id: str, body: PointsAdjust, admin: dict = Depends(get_current_admin)):
    u = await db.users.find_one({"user_id": user_id})
    if not u:
        raise HTTPException(status_code=404, detail="غير موجود")
    await db.users.update_one({"user_id": user_id}, {"$inc": {"points": body.amount}})
    await add_transaction(user_id, body.amount, "admin", body.reason)
    return {"ok": True}


@api.get("/admin/rewards")
async def admin_list_rewards(admin: dict = Depends(get_current_admin)):
    return await db.rewards.find({"deleted_at": None}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.put("/admin/rewards/{reward_id}/status")
async def admin_update_reward_status(reward_id: str, body: RewardStatus, admin: dict = Depends(get_current_admin)):
    await db.rewards.update_one({"id": reward_id}, {"$set": {"status": body.status}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
async def seed():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("referral_code")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)

    # Settings
    await get_settings_doc()

    # Admin
    if not await db.admins.find_one({"email": "heeba@heeba.com"}):
        pw = bcrypt.hashpw("heeba".encode(), bcrypt.gensalt()).decode()
        await db.admins.insert_one({
            "admin_id": new_id("adm_"),
            "email": "heeba@heeba.com",
            "password_hash": pw,
            "created_at": now_utc(),
        })
        logger.info("Seeded admin heeba@heeba.com")

    # Prizes
    if await db.prizes.count_documents({}) == 0:
        prizes = [
            {"name": "10 نقاط", "kind": "points", "points_reward": 10, "rarity": "common", "win_chance": 30, "value": "10", "order": 0},
            {"name": "50 نقطة", "kind": "points", "points_reward": 50, "rarity": "common", "win_chance": 22, "value": "50", "order": 1},
            {"name": "100 نقطة", "kind": "points", "points_reward": 100, "rarity": "rare", "win_chance": 15, "value": "100", "order": 2},
            {"name": "حظ أوفر", "kind": "nothing", "points_reward": 0, "rarity": "common", "win_chance": 20, "value": "-", "order": 3},
            {"name": "500 نقطة", "kind": "points", "points_reward": 500, "rarity": "epic", "win_chance": 8, "value": "500", "order": 4},
            {"name": "60 UC", "kind": "item", "rarity": "rare", "win_chance": 3, "value": "60 UC", "order": 5,
             "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
            {"name": "صندوق أسطوري", "kind": "item", "rarity": "legendary", "win_chance": 1, "value": "Legendary", "order": 6,
             "image": "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
            {"name": "سكن نادر", "kind": "item", "rarity": "epic", "win_chance": 1, "value": "Skin", "order": 7,
             "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"},
        ]
        for p in prizes:
            p.setdefault("image", "")
            p.setdefault("description", "")
            p["id"] = new_id("pz_")
            p["quantity"] = -1
            p["remaining"] = -1
            p["active"] = True
            p["deleted_at"] = None
            p["created_at"] = now_utc()
        await db.prizes.insert_many(prizes)
        logger.info("Seeded prizes")

    # Products
    if await db.products.count_documents({}) == 0:
        products = [
            {"name": "60 UC", "category": "UC", "rarity": "common", "price_points": 500, "value": "60 UC", "order": 0,
             "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
            {"name": "325 UC", "category": "UC", "rarity": "rare", "price_points": 2000, "value": "325 UC", "order": 1,
             "image": "https://images.unsplash.com/photo-1624365168012-7ed139887755?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
            {"name": "سكن سلاح ملحمي", "category": "سكنات", "rarity": "epic", "price_points": 3000, "value": "Epic Skin", "order": 2,
             "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
            {"name": "صندوق أسطوري", "category": "صناديق", "rarity": "legendary", "price_points": 5000, "value": "Legendary Crate", "order": 3,
             "image": "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"},
        ]
        for p in products:
            p.setdefault("description", "")
            p["id"] = new_id("pr_")
            p["quantity"] = -1
            p["remaining"] = -1
            p["active"] = True
            p["deleted_at"] = None
            p["created_at"] = now_utc()
        await db.products.insert_many(products)
        logger.info("Seeded products")

    # Creators
    if await db.creators.count_documents({}) == 0:
        await db.creators.insert_many([
            {"id": new_id("cr_"), "name": "HEEBA Official", "platform": "YouTube", "url": "https://youtube.com",
             "subtitle": "أخبار وعروض هيبة", "image": "", "active": True, "order": 0, "deleted_at": None},
            {"id": new_id("cr_"), "name": "Battle Royale Pro", "platform": "TikTok", "url": "https://tiktok.com",
             "subtitle": "أفضل اللقطات", "image": "", "active": True, "order": 1, "deleted_at": None},
        ])

    # Backgrounds
    if await db.backgrounds.count_documents({}) == 0:
        await db.backgrounds.insert_many([
            {"id": new_id("bg_"), "title": "خلفية شاشة الدخول", "target": "login", "order": 0, "active": True, "deleted_at": None,
             "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
            {"id": new_id("bg_"), "title": "خلفية الرئيسية", "target": "home", "order": 1, "active": True, "deleted_at": None,
             "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
            {"id": new_id("bg_"), "title": "خلفية الملف", "target": "profile", "order": 2, "active": True, "deleted_at": None,
             "image": "https://images.unsplash.com/photo-1612306299440-15460d4009e4?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
        ])
        logger.info("Seeded backgrounds")

    # Welcome notification
    if await db.notifications.count_documents({}) == 0:
        await db.notifications.insert_one({
            "id": new_id("nt_"), "title": "مرحباً في هيبة 🎮",
            "message": "أدر عجلة الحظ يومياً واربح جوائز PUBG!", "created_at": now_utc(), "deleted_at": None,
        })


@app.on_event("startup")
async def startup():
    await seed()
    try:
        await run_in_threadpool(init_storage)
    except Exception as e:
        logger.warning(f"Storage init failed (non-blocking): {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api.get("/")
async def root():
    return {"message": "HEEBA API"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
