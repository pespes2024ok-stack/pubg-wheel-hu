"""HEEBA backend API tests - covers admin CRUD, user endpoints, wheel, store, referrals, notifications."""
import pytest


# ------------------ Public/health ------------------
class TestPublic:
    def test_settings_public(self, http, api_url):
        r = http.get(f"{api_url}/settings")
        assert r.status_code == 200
        d = r.json()
        assert "app_name" in d and "signup_bonus" in d and "spin_cooldown_hours" in d


# ------------------ Auth guards ------------------
class TestAuthGuards:
    @pytest.mark.parametrize("path", [
        "/auth/me", "/wheel/prizes", "/wheel/status", "/store/products",
        "/rewards", "/transactions", "/notifications", "/creators",
    ])
    def test_user_endpoints_require_auth(self, http, api_url, path):
        r = http.get(f"{api_url}{path}")
        assert r.status_code == 401

    def test_wheel_spin_requires_auth(self, http, api_url):
        r = http.post(f"{api_url}/wheel/spin")
        assert r.status_code == 401

    def test_admin_endpoints_require_auth(self, http, api_url):
        r = http.get(f"{api_url}/admin/stats")
        assert r.status_code == 401


# ------------------ Admin login + stats ------------------
class TestAdminAuth:
    def test_admin_login_wrong(self, http, api_url):
        r = http.post(f"{api_url}/admin/login", json={"email": "heeba@heeba.com", "password": "wrong"})
        assert r.status_code == 401

    def test_admin_login_ok(self, http, api_url):
        r = http.post(f"{api_url}/admin/login", json={"email": "heeba@heeba.com", "password": "heeba"})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["email"] == "heeba@heeba.com"

    def test_admin_me(self, http, api_url, admin_headers):
        r = http.get(f"{api_url}/admin/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == "heeba@heeba.com"

    def test_admin_stats(self, http, api_url, admin_headers):
        r = http.get(f"{api_url}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["users", "prizes", "products", "rewards", "pending_rewards"]:
            assert k in d and isinstance(d[k], int)


# ------------------ Admin CRUD: prizes ------------------
class TestAdminPrizes:
    created_id = None

    def test_list_prizes(self, http, api_url, admin_headers):
        r = http.get(f"{api_url}/admin/prizes", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_prize_crud_flow(self, http, api_url, admin_headers):
        payload = {"name": "TEST_Prize", "kind": "points", "points_reward": 25, "rarity": "rare",
                   "win_chance": 5, "quantity": 10, "value": "25"}
        r = http.post(f"{api_url}/admin/prizes", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        prize = r.json()
        assert prize["name"] == "TEST_Prize" and prize["remaining"] == 10
        pid = prize["id"]

        # GET verify
        r = http.get(f"{api_url}/admin/prizes", headers=admin_headers)
        assert any(p["id"] == pid for p in r.json())

        # PUT update
        payload["name"] = "TEST_Prize_Updated"
        payload["quantity"] = 20
        r = http.put(f"{api_url}/admin/prizes/{pid}", headers=admin_headers, json=payload)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Prize_Updated"
        assert r.json()["remaining"] == 20

        # DELETE (soft)
        r = http.delete(f"{api_url}/admin/prizes/{pid}", headers=admin_headers)
        assert r.status_code == 200
        r = http.get(f"{api_url}/admin/prizes", headers=admin_headers)
        assert not any(p["id"] == pid for p in r.json())


# ------------------ Admin CRUD: products ------------------
class TestAdminProducts:
    def test_product_crud_flow(self, http, api_url, admin_headers):
        payload = {"name": "TEST_Product", "category": "UC", "rarity": "common",
                   "price_points": 300, "quantity": 5, "value": "TEST"}
        r = http.post(f"{api_url}/admin/products", headers=admin_headers, json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["remaining"] == 5

        payload["name"] = "TEST_Product_Updated"
        r = http.put(f"{api_url}/admin/products/{pid}", headers=admin_headers, json=payload)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Product_Updated"

        r = http.delete(f"{api_url}/admin/products/{pid}", headers=admin_headers)
        assert r.status_code == 200


# ------------------ Admin CRUD: creators ------------------
class TestAdminCreators:
    def test_creator_crud_flow(self, http, api_url, admin_headers):
        payload = {"name": "TEST_Creator", "platform": "YouTube", "url": "https://youtube.com",
                   "subtitle": "test"}
        r = http.post(f"{api_url}/admin/creators", headers=admin_headers, json=payload)
        assert r.status_code == 200
        cid = r.json()["id"]

        payload["name"] = "TEST_Creator_Updated"
        r = http.put(f"{api_url}/admin/creators/{cid}", headers=admin_headers, json=payload)
        assert r.status_code == 200

        r = http.delete(f"{api_url}/admin/creators/{cid}", headers=admin_headers)
        assert r.status_code == 200


# ------------------ Admin settings ------------------
class TestAdminSettings:
    def test_get_update_settings(self, http, api_url, admin_headers):
        r = http.get(f"{api_url}/admin/settings", headers=admin_headers)
        assert r.status_code == 200
        original_bonus = r.json().get("signup_bonus", 100)

        r = http.put(f"{api_url}/admin/settings", headers=admin_headers,
                     json={"signup_bonus": original_bonus + 1})
        assert r.status_code == 200
        assert r.json()["signup_bonus"] == original_bonus + 1

        # restore
        r = http.put(f"{api_url}/admin/settings", headers=admin_headers,
                     json={"signup_bonus": original_bonus})
        assert r.status_code == 200


# ------------------ Admin notifications ------------------
class TestAdminNotifications:
    def test_create_list_delete_notification(self, http, api_url, admin_headers):
        r = http.post(f"{api_url}/admin/notifications", headers=admin_headers,
                      json={"title": "TEST_Note", "message": "hello"})
        assert r.status_code == 200
        nid = r.json()["id"]

        r = http.get(f"{api_url}/admin/notifications", headers=admin_headers)
        assert r.status_code == 200
        assert any(n["id"] == nid for n in r.json())

        r = http.delete(f"{api_url}/admin/notifications/{nid}", headers=admin_headers)
        assert r.status_code == 200


# ------------------ Admin users + points ------------------
class TestAdminUsers:
    def test_list_users(self, http, api_url, admin_headers, seeded_user):
        r = http.get(f"{api_url}/admin/users", headers=admin_headers)
        assert r.status_code == 200
        assert any(u["user_id"] == seeded_user["user_id"] for u in r.json())

    def test_adjust_points(self, http, api_url, admin_headers, seeded_user, user_headers):
        # Get current points
        me = http.get(f"{api_url}/auth/me", headers=user_headers).json()
        before = me["points"]

        r = http.post(f"{api_url}/admin/users/{seeded_user['user_id']}/points",
                      headers=admin_headers, json={"amount": 77, "reason": "TEST"})
        assert r.status_code == 200

        me = http.get(f"{api_url}/auth/me", headers=user_headers).json()
        assert me["points"] == before + 77


# ------------------ Admin rewards + status ------------------
class TestAdminRewards:
    def test_list_and_update_reward_status(self, http, api_url, admin_headers, user_headers, seeded_user):
        # First: user buys a product to create a reward
        # Ensure a product exists
        prods = http.get(f"{api_url}/store/products", headers=user_headers).json()
        assert len(prods) > 0
        # Give user enough points
        http.post(f"{api_url}/admin/users/{seeded_user['user_id']}/points",
                  headers=admin_headers, json={"amount": 10000, "reason": "TEST"})
        pid = prods[0]["id"]
        r = http.post(f"{api_url}/store/buy/{pid}", headers=user_headers)
        assert r.status_code == 200, r.text
        reward = r.json()["reward"]
        rid = reward["id"]

        r = http.get(f"{api_url}/admin/rewards", headers=admin_headers)
        assert r.status_code == 200
        assert any(x["id"] == rid for x in r.json())

        r = http.put(f"{api_url}/admin/rewards/{rid}/status", headers=admin_headers,
                     json={"status": "delivered"})
        assert r.status_code == 200

        r = http.get(f"{api_url}/admin/rewards", headers=admin_headers)
        assert any(x["id"] == rid and x["status"] == "delivered" for x in r.json())


# ------------------ User endpoints ------------------
class TestUserEndpoints:
    def test_auth_me(self, http, api_url, user_headers):
        r = http.get(f"{api_url}/auth/me", headers=user_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == "test@heeba.com" and d["referral_code"] == "TEST1234"

    def test_wheel_prizes(self, http, api_url, user_headers):
        r = http.get(f"{api_url}/wheel/prizes", headers=user_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) > 0

    def test_wheel_status_initial(self, http, api_url, user_headers, mongo, seeded_user):
        # reset last_spin_at
        mongo.users.update_one({"user_id": seeded_user["user_id"]}, {"$set": {"last_spin_at": None}})
        r = http.get(f"{api_url}/wheel/status", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["can_spin"] is True

    def test_wheel_spin_and_cooldown(self, http, api_url, user_headers, mongo, seeded_user):
        mongo.users.update_one({"user_id": seeded_user["user_id"]}, {"$set": {"last_spin_at": None}})
        r = http.post(f"{api_url}/wheel/spin", headers=user_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["prize_index", "prize", "won", "points"]:
            assert k in d

        # Second spin should hit cooldown
        r = http.post(f"{api_url}/wheel/spin", headers=user_headers)
        assert r.status_code == 400
        detail = r.json()["detail"]
        assert isinstance(detail, dict) and detail.get("code") == "cooldown"

    def test_store_buy_insufficient(self, http, api_url, user_headers, mongo, seeded_user, admin_headers):
        # Set user points to 0
        mongo.users.update_one({"user_id": seeded_user["user_id"]}, {"$set": {"points": 0}})
        prods = http.get(f"{api_url}/store/products", headers=user_headers).json()
        pid = prods[0]["id"]
        r = http.post(f"{api_url}/store/buy/{pid}", headers=user_headers)
        assert r.status_code == 400

    def test_rewards_and_transactions(self, http, api_url, user_headers):
        r = http.get(f"{api_url}/rewards", headers=user_headers)
        assert r.status_code == 200 and isinstance(r.json(), list)
        r = http.get(f"{api_url}/transactions", headers=user_headers)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_notifications_and_read(self, http, api_url, user_headers):
        r = http.get(f"{api_url}/notifications", headers=user_headers)
        assert r.status_code == 200
        notes = r.json()
        if notes:
            nid = notes[0]["id"]
            r = http.post(f"{api_url}/notifications/{nid}/read", headers=user_headers)
            assert r.status_code == 200
            notes2 = http.get(f"{api_url}/notifications", headers=user_headers).json()
            assert any(n["id"] == nid and n["read"] for n in notes2)

    def test_creators_list(self, http, api_url, user_headers):
        r = http.get(f"{api_url}/creators", headers=user_headers)
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_avatar_update(self, http, api_url, user_headers):
        r = http.post(f"{api_url}/me/avatar", headers=user_headers,
                      json={"avatar": "https://example.com/a.png"})
        assert r.status_code == 200

    def test_referral_self_and_bad(self, http, api_url, user_headers):
        # self
        r = http.post(f"{api_url}/referrals/apply", headers=user_headers, json={"code": "TEST1234"})
        assert r.status_code == 400
        # bad code
        r = http.post(f"{api_url}/referrals/apply", headers=user_headers, json={"code": "NOPE9999"})
        assert r.status_code == 404

    def test_referral_apply_and_duplicate(self, http, api_url, user_headers, mongo, seeded_user):
        # Create a temp referrer
        from datetime import datetime, timezone
        mongo.users.update_one(
            {"user_id": "user_refsrc"},
            {"$set": {
                "user_id": "user_refsrc", "email": "ref@heeba.com", "name": "Ref",
                "points": 0, "referral_code": "REFSRC01", "referred_by": None,
                "referrals_count": 0, "created_at": datetime.now(timezone.utc), "deleted_at": None,
            }},
            upsert=True,
        )
        # Reset referred_by on tester
        mongo.users.update_one({"user_id": seeded_user["user_id"]}, {"$set": {"referred_by": None}})
        try:
            r = http.post(f"{api_url}/referrals/apply", headers=user_headers, json={"code": "REFSRC01"})
            assert r.status_code == 200, r.text
            # duplicate
            r = http.post(f"{api_url}/referrals/apply", headers=user_headers, json={"code": "REFSRC01"})
            assert r.status_code == 400
        finally:
            mongo.users.delete_one({"user_id": "user_refsrc"})
            mongo.transactions.delete_many({"user_id": "user_refsrc"})
