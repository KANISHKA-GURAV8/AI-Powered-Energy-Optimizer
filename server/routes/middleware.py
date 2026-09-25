"""
JWT protect decorator — equivalent to Node's authMiddleware.js protect()
Usage:
    from routes.middleware import protect

    @app.route('/protected')
    @protect
    def protected_route():
        user_id = g.user_id
        ...
"""

from functools import wraps
from flask import request, jsonify, g, current_app
from flask_jwt_extended import decode_token
from bson import ObjectId
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError


def protect(f):
    """Decorator that requires a valid Bearer JWT token in Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "No token, authorization denied"}), 401

        try:
            decoded = decode_token(token)
            user_id = decoded.get("sub")

            db = current_app.config["DB"]
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"message": "User not found"}), 401

            # Attach user info to flask's g context for use in route handlers
            g.user_id = str(user["_id"])
            g.user = user

        except (ExpiredSignatureError, InvalidTokenError, Exception) as e:
            return jsonify({"message": f"Token invalid: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated
