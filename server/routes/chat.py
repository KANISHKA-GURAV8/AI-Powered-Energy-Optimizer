import os
from flask import Blueprint, request, jsonify, current_app, g
from groq import Groq
from bson import ObjectId
from datetime import date, datetime
from routes.middleware import protect

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("", methods=["POST"])
@chat_bp.route("/", methods=["POST"])
@protect
def handle_chat():
    data = request.get_json()
    message = data.get("message")
    history = data.get("history", [])

    if not message:
        return jsonify({"message": "Message is required"}), 400

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return jsonify({"message": "Groq API key not configured"}), 500

    client = Groq(api_key=api_key)

    try:
        db = current_app.config["DB"]
        uid = ObjectId(g.user_id)
        user = db.users.find_one({"_id": uid})

        # Gather ALL appliances and logs
        appliances = list(db.appliances.find({"userId": uid}))
        active_appliances = [app for app in appliances if app.get("status", False)]
        logs = list(db.energylogs.find({"userId": uid}).sort("date", -1).limit(7))

        # ── Build system prompt ──────────────────────────────────────────────
        system_prompt = (
            "You are EnergyBot, an AI assistant for an AI-Powered Energy Optimizer app.\n"
            "You are helpful, concise, and friendly. Answer in 2-3 sentences max. Use ₹ for costs.\n"
            "CRITICAL RULE: You can ONLY answer questions related to energy consumption, electricity bills, "
            "appliances, saving energy, or the user's dashboard data provided below.\n"
            "If the user asks anything unrelated to energy (e.g. colors, coding, general trivia), "
            "you MUST refuse and say: \"I can only help with energy usage, appliances, and electricity bills.\"\n\n"
            f"USER PROFILE:\n"
            f"- Name: {user.get('name', 'User')}\n"
            f"- City: {user.get('city', 'Unknown')}\n"
            f"- Sanctioned Load: {user.get('sanctionedLoad', 4000)}W\n"
            f"- Tariff Rate: ₹{user.get('tariffRate', 5.80)}/unit\n\n"
            "ALL REGISTERED APPLIANCES IN THIS SYSTEM:\n"
        )

        if appliances:
            for app in appliances:
                status = "ON (running now)" if app.get("status", False) else "OFF"
                system_prompt += f"- {app['name']}: {app.get('power', 0)}W | {status} | Priority: {app.get('priority', 'Medium')}\n"
        else:
            system_prompt += "- No appliances registered yet\n"

        system_prompt += "\nCURRENTLY ACTIVE: "
        if active_appliances:
            system_prompt += ", ".join([f"{a['name']} ({a.get('power', 0)}W)" for a in active_appliances]) + "\n"
        else:
            system_prompt += "None\n"

        system_prompt += "\nLAST 7 DAYS ENERGY LOG:\n"
        if logs:
            for log in logs:
                cost = log.get("costPerUnit", 5.80) * log["unitsConsumed"]
                system_prompt += f"- {log['date']}: {log['unitsConsumed']:.2f} kWh (₹{cost:.2f})\n"
        else:
            system_prompt += "- No logs available\n"

        # ── Build messages list ──────────────────────────────────────────────
        messages = [{"role": "system", "content": system_prompt}]

        for msg in history:
            role = "assistant" if msg["role"] == "bot" else "user"
            messages.append({"role": role, "content": msg["content"]})

        messages.append({"role": "user", "content": message})

        # ── Call Groq API ────────────────────────────────────────────────────
        response = client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=messages,
            max_tokens=300,
            temperature=0.7,
        )

        reply = response.choices[0].message.content
        return jsonify({"reply": reply}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()

        err_str = str(e).lower()
        if "rate" in err_str or "429" in err_str:
            return jsonify({"reply": "I'm receiving too many requests. Please wait a moment and try again!"}), 200

        print(f"Chatbot error: {e}")
        return jsonify({"message": "Failed to process chat"}), 500
