"""
Auth Routes — Flask Blueprint
  POST  /api/auth/register   → Register new user
  POST  /api/auth/login      → Login & get JWT
  PUT   /api/auth/profile    → Update profile (protected)
"""

import bcrypt
from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import create_access_token
from bson import ObjectId
from datetime import timedelta
from routes.middleware import protect

auth_bp = Blueprint("auth", __name__)


def _user_response(user, token):
    """Helper: build the standard user JSON response."""
    return {
        "_id":            str(user["_id"]),
        "name":           user["name"],
        "email":          user["email"],
        "city":           user.get("city", "Bangalore"),
        "sanctionedLoad": user.get("sanctionedLoad", 4000),
        "tariffRate":     user.get("tariffRate", 5.80),
        "historicalAvg":  user.get("historicalAvg", 113.53),
        "token":          token,
    }


# ── POST /api/auth/register ────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    city     = (data.get("city") or "Bangalore").strip()

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password are required"}), 400

    db = current_app.config["DB"]

    # Check if email already exists
    if db.users.find_one({"email": email}):
        return jsonify({"message": "Email already registered"}), 400

    # Hash password with bcrypt and store as string (Node.js compatible)
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    result = db.users.insert_one({
        "name":           name,
        "email":          email,
        "password":       hashed,
        "city":           city,
        "sanctionedLoad": 4000,
        "tariffRate":     5.80,
        "historicalAvg":  113.53
    })

    user = db.users.find_one({"_id": result.inserted_id})
    token = create_access_token(identity=str(user["_id"]),
                                expires_delta=timedelta(days=7))
    return jsonify(_user_response(user, token)), 201


# ── POST /api/auth/login ───────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    db = current_app.config["DB"]
    user = db.users.find_one({"email": email})

    if not user:
        return jsonify({"message": "Invalid email or password"}), 401

    stored_password = user.get("password", "")
    if isinstance(stored_password, str):
        stored_password = stored_password.encode("utf-8")

    if not bcrypt.checkpw(password.encode("utf-8"), stored_password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user["_id"]),
                                expires_delta=timedelta(days=7))
    return jsonify(_user_response(user, token)), 200


# ── PUT /api/auth/profile ──────────────────────────────────────────────────────
@auth_bp.route("/profile", methods=["PUT"])
@protect
def update_profile():
    data  = request.get_json()
    db    = current_app.config["DB"]
    uid   = ObjectId(g.user_id)

    update_fields = {}
    if data.get("name"):  update_fields["name"]  = data["name"].strip()
    if data.get("email"): update_fields["email"] = data["email"].strip().lower()
    if data.get("city"):  update_fields["city"]  = data["city"].strip()
    if "sanctionedLoad" in data: update_fields["sanctionedLoad"] = float(data["sanctionedLoad"])
    if "tariffRate" in data:     update_fields["tariffRate"]     = float(data["tariffRate"])
    if "historicalAvg" in data:  update_fields["historicalAvg"]  = float(data["historicalAvg"])

    if data.get("password"):
        update_fields["password"] = bcrypt.hashpw(
            data["password"].encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    db.users.update_one({"_id": uid}, {"$set": update_fields})
    user  = db.users.find_one({"_id": uid})
    token = create_access_token(identity=str(user["_id"]),
                                expires_delta=timedelta(days=7))
    return jsonify(_user_response(user, token)), 200
