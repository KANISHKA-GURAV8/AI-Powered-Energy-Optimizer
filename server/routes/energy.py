"""
Energy Routes — Flask Blueprint
  GET   /api/energy/weather          → Real-time weather from OpenWeatherMap
  GET   /api/energy/logs             → Last 7 days energy logs
  POST  /api/energy/logs             → Add/update today's log
  GET   /api/energy/dashboard        → Aggregated dashboard stats
  POST  /api/energy/recommendations  → Run ML predictions (native Python)
"""

import os
import sys
import joblib
import pandas as pd
import requests as http_requests
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, current_app, g
from bson import ObjectId
from routes.middleware import protect

energy_bp = Blueprint("energy", __name__)

# ── Load ML models once at startup ─────────────────────────────────────────────
_script_dir  = os.path.dirname(os.path.abspath(__file__))
_models_dir  = os.path.join(_script_dir, "..", "ml", "models")

try:
    _rf_model       = joblib.load(os.path.join(_models_dir, "random_forest_model.pkl"))
    _feature_cols   = joblib.load(os.path.join(_models_dir, "model_feature_columns.pkl"))
    print("[OK] ML models loaded successfully")
except Exception as e:
    _rf_model = None
    _feature_cols = None
    print(f"[WARN] ML models could not be loaded: {e}")

# ── Name mapping: frontend names → dataset names ───────────────────────────────
_NAME_MAP = {
    "wifi router":    "WiFi",
    "wifi":           "WiFi",
    "iron box":       "Iron Box",
    "washing machine":"Washing Machine",
    "water purifier": "Water Purifier",
    "room heater":    "Room Heater",
    "ac":             "AC",
    "fridge":         "Fridge",
    "geyser":         "Geyser",
    "cooler":         "Cooler",
    "mixer":          "Mixer",
    "lights":         "Lights",
    "tv":             "TV",
    "fans":           "Fans",
    "oven":           "Oven",
}


def _serialize(doc):
    doc["_id"] = str(doc["_id"])
    if "userId" in doc:
        doc["userId"] = str(doc["userId"])
    return doc


# ── GET /api/energy/weather ────────────────────────────────────────────────────
@energy_bp.route("/weather", methods=["GET"])
@protect
def get_weather():
    city    = g.user.get("city", "Bangalore")
    api_key = os.getenv("OPENWEATHER_API_KEY", "")

    try:
        resp = http_requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "appid": api_key, "units": "metric"},
            timeout=8
        )
        resp.raise_for_status()
        d = resp.json()
        return jsonify({
            "city":        d["name"],
            "country":     d["sys"]["country"],
            "temp":        round(d["main"]["temp"]),
            "feelsLike":   round(d["main"]["feels_like"]),
            "humidity":    d["main"]["humidity"],
            "wind":        round(d["wind"]["speed"] * 3.6, 1),
            "description": d["weather"][0]["description"],
            "icon":        d["weather"][0]["icon"],
            "main":        d["weather"][0]["main"],
        }), 200
    except Exception as e:
        return jsonify({"message": "Failed to fetch weather", "error": str(e)}), 500


# ── GET /api/energy/logs ───────────────────────────────────────────────────────
@energy_bp.route("/logs", methods=["GET"])
@protect
def get_logs():
    db   = current_app.config["DB"]
    logs = list(db.energylogs.find({"userId": ObjectId(g.user_id)})
                              .sort("date", -1).limit(7))
    logs.reverse()   # chronological order for charts
    return jsonify([_serialize(l) for l in logs]), 200


# ── POST /api/energy/logs ──────────────────────────────────────────────────────
@energy_bp.route("/logs", methods=["POST"])
@protect
def add_log():
    data          = request.get_json()
    units         = float(data.get("unitsConsumed", 0))
    cost_per_unit = float(data.get("costPerUnit", 5))
    today         = str(date.today())    # "YYYY-MM-DD"

    db = current_app.config["DB"]
    db.energylogs.update_one(
        {"userId": ObjectId(g.user_id), "date": today},
        {"$set": {"unitsConsumed": units, "costPerUnit": cost_per_unit, "date": today,
                  "userId": ObjectId(g.user_id)}},
        upsert=True
    )
    log = db.energylogs.find_one({"userId": ObjectId(g.user_id), "date": today})
    return jsonify(_serialize(log)), 200


# ── GET /api/energy/dashboard ──────────────────────────────────────────────────
@energy_bp.route("/dashboard", methods=["GET"])
@protect
def get_dashboard():
    db   = current_app.config["DB"]
    logs = list(db.energylogs.find({"userId": ObjectId(g.user_id)})
                              .sort("date", -1).limit(30))

    user = db.users.find_one({"_id": ObjectId(g.user_id)}) or {}

    # Extract user system settings (DB > query params > defaults)
    sanctioned_load_watts = float(user.get("sanctionedLoad") or request.args.get("sanctionedLoad") or 4000)
    tariff_rate = float(user.get("tariffRate") or request.args.get("tariffRate") or 5.80)
    historical_avg_units = float(user.get("historicalAvg") or request.args.get("historicalAvg") or 113.53)

    sanctioned_load_kw = sanctioned_load_watts / 1000.0
    FIXED_CHARGE_PER_KW = 150
    GRUHA_JYOTHI_MAX_LIMIT = 200.0

    # Calculate dynamic Gruha Jyothi Entitlement: average + 10% buffer, capped at 200 units maximum
    entitlement_units = min(GRUHA_JYOTHI_MAX_LIMIT, round(historical_avg_units * 1.10, 2))

    today_log       = logs[0] if logs else None
    today_units     = today_log["unitsConsumed"] if today_log else 0
    today_cost      = round(today_units * tariff_rate, 2)

    total_units     = sum(l["unitsConsumed"] for l in logs)
    avg_daily       = (total_units / len(logs)) if logs else today_units
    total_units_this_month = avg_daily * 30

    # 3-Tier Gruha Jyothi calculation:
    # Tier 1: Below entitlement (<= entitlement_units): 100% free (Net Bill = ₹0.00, Fixed Charge & Energy Charge waived)
    # Tier 2: Entitlement < units <= 200: Pay excess above entitlement + Fixed Charge
    # Tier 3: Units > 200: Entire subsidy forfeited, 100% units billable + Fixed Charge
    if total_units_this_month <= GRUHA_JYOTHI_MAX_LIMIT:
        free_units = min(total_units_this_month, entitlement_units)
        billable_units = max(0.0, total_units_this_month - entitlement_units)
        subsidy_forfeited = False

        if billable_units == 0.0:
            # Under official Gruha Jyothi scheme, if usage is within entitlement, Govt of Karnataka
            # waives both Energy Charge and Fixed Charge -> Total Bill = ₹0.00
            energy_charge = 0.0
            fixed_charge = 0.0
            predicted_bill = 0.0
        else:
            energy_charge = billable_units * tariff_rate
            fixed_charge = sanctioned_load_kw * FIXED_CHARGE_PER_KW
            predicted_bill = round(energy_charge + fixed_charge, 2)
    else:
        free_units = 0.0
        billable_units = total_units_this_month
        subsidy_forfeited = True
        energy_charge = billable_units * tariff_rate
        fixed_charge = sanctioned_load_kw * FIXED_CHARGE_PER_KW
        predicted_bill = round(energy_charge + fixed_charge, 2)

    yesterday_units = logs[1]["unitsConsumed"] if len(logs) > 1 else 0
    saved_today     = round(yesterday_units - today_units, 2)

    return jsonify({
        "todayUnits":          today_units,
        "todayCost":           str(today_cost),
        "predictedMonthlyBill":str(predicted_bill),
        "savedToday":          str(max(saved_today, 0)),
        "logsCount":           len(logs),
        "totalUnitsMonth":     round(total_units_this_month, 2),
        "historicalAvg":       historical_avg_units,
        "entitlementUnits":    entitlement_units,
        "maxLimit":            GRUHA_JYOTHI_MAX_LIMIT,
        "freeUnits":           round(free_units, 2),
        "billableUnits":       round(billable_units, 2),
        "subsidyForfeited":    subsidy_forfeited,
        "tariffRate":          tariff_rate,
        "sanctionedLoadKw":    sanctioned_load_kw,
        "energyCharge":        round(energy_charge, 2),
        "fixedCharge":         round(fixed_charge, 2)
    }), 200


# ── POST /api/energy/recommendations ──────────────────────────────────────────
@energy_bp.route("/recommendations", methods=["POST"])
@protect
def get_recommendations():
    if _rf_model is None or _feature_cols is None:
        return jsonify({"message": "ML models not loaded. Run predict.py first."}), 500

    data                = request.get_json() or {}
    sanctioned_load_w   = float(data.get("sanctionedLoadWatts", 4000))
    db                  = current_app.config["DB"]

    # ── Fetch live weather ──────────────────────────────────────────────────
    city    = g.user.get("city", "Bangalore")
    api_key = os.getenv("OPENWEATHER_API_KEY", "")
    temp, humidity = 25.0, 60
    try:
        wr = http_requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "appid": api_key, "units": "metric"},
            timeout=8
        )
        if wr.ok:
            wd       = wr.json()
            temp     = round(wd["main"]["temp"])
            humidity = wd["main"]["humidity"]
    except Exception:
        pass

    # ── Determine season & time slot ───────────────────────────────────────
    month = datetime.now().month
    if month in (12, 1, 2):
        season = "Winter"
    elif month in (7, 8, 9, 10, 11):
        season = "Rainy"
    else:
        season = "Summer"

    hour = datetime.now().hour
    if 6 <= hour < 12:
        time_slot = "Morning"
    elif 12 <= hour < 17:
        time_slot = "Afternoon"
    elif 17 <= hour < 21:
        time_slot = "Evening"
    else:
        time_slot = "Night"

    # ── Fetch appliances from DB ───────────────────────────────────────────
    appliances_input = data.get("appliances")
    if not appliances_input:
        raw = list(db.appliances.find({"userId": ObjectId(g.user_id)}))
        appliances_input = [
            {
                "id":          str(a["_id"]),
                "name":        a["name"],
                "priority":    a.get("priority", "Medium"),
                "power":       a["power"],
                "quantity":    a.get("quantity", 1),
                "active":      a.get("active", 0),
                "status":      a.get("status", False),
                "usage_hours": 1.0 if a.get("status") else 0.0,
            }
            for a in raw
        ]

    # ── Compute simultaneous load ──────────────────────────────────────────
    simultaneous_kw = sum(
        a["power"] * a.get("active", 0)
        for a in appliances_input
        if a.get("status") and a.get("active", 0) > 0
    ) / 1000.0
    simultaneous_kw = max(simultaneous_kw, 0.1)
    load_ratio      = (simultaneous_kw * 1000) / sanctioned_load_w

    # ── Run ML inference for each appliance ────────────────────────────────
    recommendations = []
    for app in appliances_input:
        app_name    = app["name"]
        mapped_name = _NAME_MAP.get(app_name.lower(), app_name)
        priority    = app.get("priority", "Medium")
        usage_hrs   = float(app.get("usage_hours", 1.0 if app.get("status") else 0.0))

        row = {
            "temperature_c":       float(temp),
            "humidity_pct":        float(humidity),
            "simultaneous_load_kw":simultaneous_kw,
            "sanctioned_load_watts":sanctioned_load_w,
            "load_ratio":          load_ratio,
            "usage_hours":         usage_hrs,
        }
        # Set all feature columns to 0
        for col in _feature_cols:
            if col not in row:
                row[col] = 0

        # One-hot encode
        for col, val in [
            (f"appliance_name_{mapped_name}", 1),
            (f"priority_{priority}", 1),
            (f"time_slot_{time_slot}", 1),
            (f"season_{season}", 1),
        ]:
            if col in row:
                row[col] = val

        df_input   = pd.DataFrame([row])[_feature_cols]
        prediction = _rf_model.predict(df_input)[0]

        # ── Demo Flow Override ──
        if mapped_name == "AC" and temp < 24:
            prediction = "Suggest_OFF"

        # Custom human-readable reason
        if prediction == "Suggest_OFF":
            if mapped_name == "AC" and temp < 24:
                reason = f"Ambient temperature is cool ({temp}°C). AC is unnecessary."
            elif priority == "Non-essential":
                reason = "Non-essential appliance — consider turning off during peak load."
            else:
                reason = "Turning off this appliance will reduce power consumption."
        elif prediction == "Delay_Load":
            if load_ratio > 0.8:
                reason = (f"System load is at {(load_ratio*100):.1f}% of sanctioned limit "
                          f"({sanctioned_load_w:.0f} W). Avoid heavy appliances now.")
            else:
                reason = "Postpone this high-wattage appliance during peak tariff hours."
        else:
            reason = "Running efficiently under current conditions."

        recommendations.append({
            "id":     app.get("id") or app.get("_id"),
            "name":   app_name,
            "action": prediction,
            "reason": reason,
        })

    return jsonify({
        "season":              season,
        "timeSlot":            time_slot,
        "sanctionedLoadWatts": sanctioned_load_w,
        "simultaneousLoadKw":  simultaneous_kw,
        "temp":                temp,
        "humidity":            humidity,
        "recommendations":     recommendations,
    }), 200


# ── GET /api/energy/notifications ──────────────────────────────────────────────
@energy_bp.route("/notifications", methods=["GET"])
@protect
def get_notifications():
    db = current_app.config["DB"]
    notifications = list(db.notifications.find({"userId": ObjectId(g.user_id), "read": False}).sort("createdAt", -1))
    
    for n in notifications:
        n["_id"] = str(n["_id"])
        n["userId"] = str(n["userId"])
        
    return jsonify(notifications), 200


# ── POST /api/energy/notifications/dismiss ──────────────────────────────────────
@energy_bp.route("/notifications/dismiss", methods=["POST"])
@protect
def dismiss_notification():
    data = request.get_json() or {}
    nid = data.get("notificationId")
    db = current_app.config["DB"]
    
    if nid:
        db.notifications.update_one(
            {"_id": ObjectId(nid), "userId": ObjectId(g.user_id)},
            {"$set": {"read": True}}
        )
    else:
        # Dismiss all
        db.notifications.update_many(
            {"userId": ObjectId(g.user_id)},
            {"$set": {"read": True}}
        )
        
    return jsonify({"message": "Notifications dismissed"}), 200


# ── Simulation Engine Background Thread ─────────────────────────────────────────
import threading
import time

def init_simulation(app):
    def run_simulation():
        with app.app_context():
            db = app.config["DB"]
            SIMULATION_MULTIPLIER = 300  # 1 real sec = 300 sim secs = 5 mins. 12 real secs = 1 sim hour.
            TARIFF_RATE_RS = 5.80
            
            while True:
                time.sleep(5)
                try:
                    # Find all active appliances
                    active_apps = list(db.appliances.find({"status": True}))
                    if not active_apps:
                        continue
                        
                    now = datetime.now()
                    
                    for app_doc in active_apps:
                        user_id = app_doc["userId"]
                        app_id = app_doc["_id"]
                        power = app_doc["power"]
                        quantity = app_doc.get("quantity", 1)
                        active_count = app_doc.get("active", 1)
                        priority = app_doc.get("priority", "Medium")
                        
                        last_active_str = app_doc.get("lastActiveAt")
                        turned_on_str = app_doc.get("turnedOnAt")
                        
                        if not last_active_str:
                            continue
                            
                        # Calculate elapsed time in seconds
                        last_active = datetime.fromisoformat(last_active_str)
                        elapsed_seconds = (now - last_active).total_seconds()
                        
                        if elapsed_seconds <= 0:
                            continue
                            
                        # Convert to simulated hours
                        simulated_seconds = elapsed_seconds * SIMULATION_MULTIPLIER
                        simulated_hours = simulated_seconds / 3600.0
                        
                        # Calculate kWh consumed
                        delta_kwh = (power * active_count * simulated_hours) / 1000.0
                        
                        # 1. Update appliance accumulated units and lastActiveAt
                        db.appliances.update_one(
                            {"_id": app_id},
                            {
                                "$inc": {"accumulatedKwhToday": delta_kwh},
                                "$set": {"lastActiveAt": now.isoformat()}
                            }
                        )
                        
                        # 2. Update today's energy log
                        today_str = str(date.today())
                        db.energylogs.update_one(
                            {"userId": user_id, "date": today_str},
                            {
                                "$inc": {"unitsConsumed": delta_kwh},
                                "$set": {"costPerUnit": TARIFF_RATE_RS},
                                "$setOnInsert": {"userId": user_id, "date": today_str}
                            },
                            upsert=True
                        )
                        
                        # 3. Check Safety / Auto-off conditions
                        # Condition A: Run limit (4 simulated hours = 48 real seconds)
                        if turned_on_str:
                            turned_on = datetime.fromisoformat(turned_on_str)
                            total_elapsed_sim_hours = ((now - turned_on).total_seconds() * SIMULATION_MULTIPLIER) / 3600.0
                            
                            if total_elapsed_sim_hours > 4.0:
                                # Auto turn OFF
                                db.appliances.update_one(
                                    {"_id": app_id},
                                    {
                                        "$set": {
                                            "status": False,
                                            "active": 0,
                                            "turnedOnAt": None,
                                            "lastActiveAt": None,
                                            "accumulatedKwhToday": 0.0
                                        }
                                    }
                                )
                                # Create a notification
                                hours_label = round(total_elapsed_sim_hours, 1)
                                saved_kwh = round((power * active_count * 2) / 1000.0, 2)
                                saved_cost = round(saved_kwh * TARIFF_RATE_RS, 2)
                                
                                db.notifications.insert_one({
                                    "userId": user_id,
                                    "title": f"⚠️ Auto-Off Safety Guard: {app_doc['name']}",
                                    "message": f"Your {app_doc['name']} was automatically shut off after running for {hours_label} simulated hours. You saved approx ₹{saved_cost} (or {saved_kwh} kWh).",
                                    "type": "safety",
                                    "read": False,
                                    "createdAt": now.isoformat()
                                })
                                continue
                                
                    # Condition B: Overload check (> 90% of load)
                    # Group active appliances by user
                    user_loads = {}
                    for app_doc in active_apps:
                        uid = app_doc["userId"]
                        if uid not in user_loads:
                            user_loads[uid] = []
                        user_loads[uid].append(app_doc)
                        
                    for uid, apps in user_loads.items():
                        sanctioned_load_w = 4000.0 # Default sanctioned limit
                        
                        simultaneous_w = sum(a["power"] * a.get("active", 1) for a in apps)
                        load_ratio = simultaneous_w / sanctioned_load_w
                        
                        if load_ratio > 0.90:
                            # Turn off the flex/non-essential appliance
                            non_essential_apps = [a for a in apps if a.get("priority") == "Non-essential"]
                            if non_essential_apps:
                                target_app = non_essential_apps[0]
                                db.appliances.update_one(
                                    {"_id": target_app["_id"]},
                                    {
                                        "$set": {
                                            "status": False,
                                            "active": 0,
                                            "turnedOnAt": None,
                                            "lastActiveAt": None,
                                            "accumulatedKwhToday": 0.0
                                        }
                                    }
                                )
                                # Create notification
                                db.notifications.insert_one({
                                    "userId": uid,
                                    "title": "🚨 System Overloaded — Auto-Off Activated",
                                    "message": f"Your connection load reached {round(load_ratio * 100)}% of your limit. Non-essential appliance '{target_app['name']}' was shut off automatically to protect your connection.",
                                    "type": "overload",
                                    "read": False,
                                    "createdAt": now.isoformat()
                                })
                except Exception as e:
                    print(f"[WARN] Simulation error: {e}")
                    
    # Start thread
    t = threading.Thread(target=run_simulation, daemon=True)
    t.start()
