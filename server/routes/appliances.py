"""
Appliances Routes — Flask Blueprint
  GET    /api/appliances          → Get all appliances for user
  POST   /api/appliances          → Add new appliance
  PUT    /api/appliances/<id>     → Update appliance
  DELETE /api/appliances/<id>     → Delete appliance
"""

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, g
from bson import ObjectId
from routes.middleware import protect

appliances_bp = Blueprint("appliances", __name__)


def _serialize(doc):
    """Convert a MongoDB document to a JSON-serializable dict."""
    doc["_id"] = str(doc["_id"])
    if "userId" in doc:
        doc["userId"] = str(doc["userId"])
    return doc


# ── GET /api/appliances ────────────────────────────────────────────────────────
@appliances_bp.route("", methods=["GET"], strict_slashes=False)
@protect
def get_appliances():
    db = current_app.config["DB"]
    appliances = list(db.appliances.find({"userId": ObjectId(g.user_id)}))
    return jsonify([_serialize(a) for a in appliances]), 200


# ── POST /api/appliances ───────────────────────────────────────────────────────
@appliances_bp.route("", methods=["POST"], strict_slashes=False)
@protect
def add_appliance():
    data = request.get_json()
    name     = (data.get("name") or "").strip()
    power    = data.get("power")
    quantity = data.get("quantity", 1)
    priority = data.get("priority", "Medium")
    active   = data.get("active", 0)
    status   = data.get("status", False)

    if not name or not power:
        return jsonify({"message": "Name and power are required"}), 400

    now_iso = datetime.now().isoformat() if status else None

    db = current_app.config["DB"]
    result = db.appliances.insert_one({
        "userId":   ObjectId(g.user_id),
        "name":     name,
        "power":    int(power),
        "quantity": int(quantity),
        "priority": priority,
        "active":   int(active),
        "status":   bool(status),
        "turnedOnAt": now_iso,
        "lastActiveAt": now_iso,
    })

    new_doc = db.appliances.find_one({"_id": result.inserted_id})
    return jsonify(_serialize(new_doc)), 201


# ── PUT /api/appliances/<id> ───────────────────────────────────────────────────
@appliances_bp.route("/<app_id>", methods=["PUT"])
@protect
def update_appliance(app_id):
    data = request.get_json()
    db   = current_app.config["DB"]

    # Fetch existing to check old status
    existing = db.appliances.find_one({"_id": ObjectId(app_id), "userId": ObjectId(g.user_id)})
    if not existing:
        return jsonify({"message": "Appliance not found or unauthorized"}), 404

    update_fields = {}
    if "name"     in data: update_fields["name"]     = data["name"].strip()
    if "power"    in data: update_fields["power"]    = int(data["power"])
    if "quantity" in data: update_fields["quantity"] = int(data["quantity"])
    if "priority" in data: update_fields["priority"] = data["priority"]
    if "active"   in data: update_fields["active"]   = int(data["active"])
    
    if "status" in data:
        new_status = bool(data["status"])
        old_status = existing.get("status", False)
        update_fields["status"] = new_status
        if new_status and not old_status:
            now_iso = datetime.now().isoformat()
            update_fields["turnedOnAt"] = now_iso
            update_fields["lastActiveAt"] = now_iso
        elif not new_status:
            update_fields["turnedOnAt"] = None
            update_fields["lastActiveAt"] = None

    result = db.appliances.update_one(
        {"_id": ObjectId(app_id), "userId": ObjectId(g.user_id)},
        {"$set": update_fields}
    )

    updated = db.appliances.find_one({"_id": ObjectId(app_id)})
    return jsonify(_serialize(updated)), 200


# ── DELETE /api/appliances/<id> ────────────────────────────────────────────────
@appliances_bp.route("/<app_id>", methods=["DELETE"])
@protect
def delete_appliance(app_id):
    db     = current_app.config["DB"]
    result = db.appliances.delete_one(
        {"_id": ObjectId(app_id), "userId": ObjectId(g.user_id)}
    )

    if result.deleted_count == 0:
        return jsonify({"message": "Appliance not found or unauthorized"}), 404

    return jsonify({"message": "Appliance deleted successfully"}), 200
