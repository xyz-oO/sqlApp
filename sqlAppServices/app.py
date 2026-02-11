import os
import uuid
from datetime import datetime, timedelta

import hashlib
import json
import jwt
from sqlalchemy import create_engine, text
from flask import Flask, jsonify, request
from flask_cors import CORS
import base64

app = Flask(__name__)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:8000")
CORS(app, supports_credentials=True, origins=[FRONTEND_ORIGIN])

SESSION_TTL_MINUTES = int(os.getenv("SESSION_TTL_MINUTES", "60"))
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")
USER_SECRET = "youcanfindit" 
USERS_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "user.config.json")
USERS_DIR = os.path.join(os.path.dirname(__file__), "users")
SESSIONS = {}


def _now():
    return datetime.utcnow()


def _expire_at():
    return _now() + timedelta(minutes=SESSION_TTL_MINUTES)

def _format_session_id():
    raw = uuid.uuid4().hex
    return "{}-{}-{}-{}".format(raw[:4], raw[4:10], raw[10:15], raw[15:20])


def _encode_session(payload):
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_session(token):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def _load_users():
    try:
        with open(USERS_CONFIG_PATH, "r", encoding="utf-8") as file:
            data = json.load(file)
            return data.get("users", [])
    except FileNotFoundError:
        return []


def _save_users(users):
    with open(USERS_CONFIG_PATH, "w", encoding="utf-8") as file:
        json.dump({"users": users}, file, indent=2)


def _md5(value: str) -> str:
    return hashlib.md5(value.encode("utf-8")).hexdigest()


def _get_encryption_key():
    key_bytes = USER_SECRET.encode("utf-8")
    key_bytes = key_bytes.ljust(32, b'\0')[:32]
    return key_bytes


def _encrypt_password(password: str) -> str:
    if not password:
        return ""
    key = _get_encryption_key()
    password_bytes = password.encode("utf-8")
    # XOR encryption
    encrypted_bytes = bytearray()
    for i in range(len(password_bytes)):
        encrypted_bytes.append(password_bytes[i] ^ key[i % len(key)])
    return base64.b64encode(encrypted_bytes).decode("utf-8")


def _decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password:
        return ""
    try:
        key = _get_encryption_key()
        encrypted_bytes = base64.b64decode(encrypted_password.encode("utf-8"))
        # XOR decryption
        decrypted_bytes = bytearray()
        for i in range(len(encrypted_bytes)):
            decrypted_bytes.append(encrypted_bytes[i] ^ key[i % len(key)])
        return decrypted_bytes.decode("utf-8")
    except Exception:
        # If decryption fails (e.g., old unencrypted password), return as-is
        return encrypted_password


def _load_db_config(username):
    try:
        path = os.path.join(USERS_DIR, username, "dbconfig.json")
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
            # If data is a dict (old format), convert to list
            if isinstance(data, dict):
                configs = [data] if data else []
            else:
                configs = data
            # Decrypt passwords
            decrypted_configs = []
            for config in configs:
                decrypted_config = config.copy()
                if "password" in decrypted_config:
                    decrypted_config["password"] = _decrypt_password(decrypted_config["password"])
                decrypted_configs.append(decrypted_config)
            return decrypted_configs
    except FileNotFoundError:
        return []


def _save_db_config(username, configs):
    os.makedirs(os.path.join(USERS_DIR, username), exist_ok=True)
    path = os.path.join(USERS_DIR, username, "dbconfig.json")
    encrypted_configs = []
    for config in configs:
        encrypted_config = config.copy()
        if "password" in encrypted_config:
            encrypted_config["password"] = _encrypt_password(encrypted_config["password"])
        encrypted_configs.append(encrypted_config)
    with open(path, "w", encoding="utf-8") as file:
        json.dump(encrypted_configs, file, indent=2)


def _load_sql_config(username):
    try:
        path = os.path.join(USERS_DIR, username, "sqlconfig.json")
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        return []


def _save_sql_config(username, config):
    os.makedirs(os.path.join(USERS_DIR, username), exist_ok=True)
    path = os.path.join(USERS_DIR, username, "sqlconfig.json")
    with open(path, "w", encoding="utf-8") as file:
        json.dump(config, file, indent=2)


def _get_username_from_request():
    username = request.headers.get("X-Username")
    if username:
        return username
    session_id = request.headers.get("X-Session-Id")
    token = request.cookies.get("sessionId")
    if not session_id and not token:
        return None
    if not session_id and token:
        try:
            data = _decode_session(token)
            return data.get("username")
        except jwt.PyJWTError:
            return None
    session = SESSIONS.get(session_id)
    if session:
        return session.get("username")
    return None


def _check_super_role():
    username = _get_username_from_request()
    if not username:
        return False
    users = _load_users()
    user = next((item for item in users if item.get("username") == username), None)
    return user and user.get("role") == "SUPER"


@app.post("/api/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    users = _load_users()
    user = next((item for item in users if item.get("username") == username), None)
    if not user:
        return jsonify({"error": "invalid credentials"}), 401
    if user.get("status") == 1:
        return jsonify({"error": "account disabled"}), 403
    expected_md5 = _md5(f"{password}{USER_SECRET}")
    if expected_md5 != user.get("md5"):
        return jsonify({"error": "invalid credentials"}), 401

    session_id = _format_session_id()
    SESSIONS[session_id] = {
        "username": username,
        "expiresAt": _expire_at().isoformat() + "Z",
    }
    role = user.get("role") if user else "USER"
    
    token = _encode_session(
        {
            "sessionId": session_id,
            "username": username,
            "role": role,
            "exp": _now() + timedelta(seconds=COOKIE_MAX_AGE_SECONDS),
        }
    )
    response = jsonify({"sessionId": session_id, "role": role})
    response.set_cookie(
        "sessionId",
        token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
        max_age=COOKIE_MAX_AGE_SECONDS,
    )
    return response


@app.post("/api/logout")
def logout():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("sessionId") or request.headers.get("X-Session-Id")
    if session_id:
        SESSIONS.pop(session_id, None)
    response = jsonify({"ok": True})
    response.delete_cookie("sessionId", path="/")
    return response


@app.get("/api/session")
def get_session():
    session_id = request.headers.get("X-Session-Id")
    token = request.cookies.get("sessionId")
    if not session_id and not token:
        response = jsonify({"ok": False})
        response.delete_cookie("sessionId")
        return response
    if not session_id and token:
        try:
            data = _decode_session(token)
            session_id = data.get("sessionId")
        except jwt.PyJWTError:
            response = jsonify({"ok": False})
            response.delete_cookie("sessionId")
            return response
    session = SESSIONS.get(session_id)
    if not session:
        response = jsonify({"ok": False})
        response.delete_cookie("sessionId")
        return response
    if _now().isoformat() + "Z" > session["expiresAt"]:
        SESSIONS.pop(session_id, None)
        response = jsonify({"ok": False})
        response.delete_cookie("sessionId")
        return response
    
    # Get user role
    username = session["username"]
    users = _load_users()
    user = next((item for item in users if item.get("username") == username), None)
    role = user.get("role") if user else "USER"
    
    return jsonify({"ok": True, "sessionId": session_id, "username": username, "role": role})


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/users")
def get_users():
    if not _check_super_role():
        return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
    users = _load_users()
    return jsonify({"users": users})


@app.post("/api/users/<username>/password")
def update_user_password(username):
    if not _check_super_role():
        return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
    payload = request.get_json(silent=True) or {}
    new_password = payload.get("password") or ""
    if not new_password:
        return jsonify({"error": "password required"}), 400

    users = _load_users()
    user = next((item for item in users if item.get("username") == username), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    user["md5"] = _md5(f"{new_password}{USER_SECRET}")
    _save_users(users)
    return jsonify({"ok": True})


@app.post("/api/users")
def create_user():
    if not _check_super_role():
        return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    users = _load_users()
    if any(item.get("username") == username for item in users):
        return jsonify({"error": "user already exists"}), 409

    role = payload.get("role") or "USER"
    # Validate role
    if role not in ["USER", "SUPER"]:
        role = "USER"
    
    new_user = {
        "username": username,
        "md5": _md5(f"{password}{USER_SECRET}"),
        "status": 0,
        "role": role,
    }
    users.append(new_user)
    _save_users(users)
    os.makedirs(os.path.join(USERS_DIR, username), exist_ok=True)
    return jsonify({"ok": True})


@app.post("/api/users/<username>/status")
def update_user_status(username):
    if not _check_super_role():
        return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if status not in (0, 1):
        return jsonify({"error": "status must be 0 or 1"}), 400

    users = _load_users()
    user = next((item for item in users if item.get("username") == username), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    user["status"] = status
    _save_users(users)
    return jsonify({"ok": True})


@app.post("/api/users/<username>/role")
def update_user_role(username):
    if not _check_super_role():
        return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
    payload = request.get_json(silent=True) or {}
    role = payload.get("role") or "USER"
    # Validate role
    if role not in ["USER", "SUPER"]:
        role = "USER"

    users = _load_users()
    user = next((item for item in users if item.get("username") == username), None)
    if not user:
        return jsonify({"error": "user not found"}), 404

    user["role"] = role
    _save_users(users)
    return jsonify({"ok": True})


@app.post("/api/db/health")
def db_health():
    payload = request.get_json(silent=True) or {}
    config = payload
    missing = [
        key
        for key in ("host", "database", "port", "user", "password")
        if not config.get(key)
    ]
    if missing:
        return jsonify({"ok": False, "error": f"missing fields: {', '.join(missing)}"}), 400

    try:
        engine = create_engine(
            f"mysql+pymysql://{config['user']}:{config['password']}"
            f"@{config['host']}:{config['port']}/{config['database']}"
        )
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return jsonify({"ok": True, "message": "connection ok"})
    except Exception as error:
        return jsonify({"ok": False, "error": str(error)}), 400


@app.get("/api/db/config")
def get_db_config():
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    users = _load_users()
    user = next((item for item in users if item.get("username") == username), None)
    if not user:
        return jsonify({"error": "user not found"}), 404
    configs = _load_db_config(username)
    return jsonify({"configs": configs, "missing": not bool(configs)})


@app.post("/api/db/config")
def update_db_config():
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    new_config = {
        "host": payload.get("host") or "",
        "port": payload.get("port"),
        "database": payload.get("database") or "",
        "user": payload.get("user") or "",
        "password": payload.get("password") or "",
    }
    
    existing_configs = _load_db_config(username)
    
    # Check if a config with the same database name already exists
    config_index = next(
        (i for i, config in enumerate(existing_configs) 
         if config.get("database") == new_config.get("database")),
        None
    )
    
    if config_index is not None:
        # Return error if database already exists
        return jsonify({"error": "数据库名已存在，请使用不同的数据库名"}), 409
    else:
        # Add new config
        existing_configs.append(new_config)
    
    _save_db_config(username, existing_configs)
    return jsonify({"ok": True})


@app.delete("/api/db/config")
def delete_db_config():
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    database_name = payload.get("database")
    
    if not database_name:
        return jsonify({"error": "database name required"}), 400
    
    existing_configs = _load_db_config(username)
    filtered_configs = [
        config for config in existing_configs 
        if config.get("database") != database_name
    ]
    
    _save_db_config(username, filtered_configs)
    return jsonify({"ok": True})


@app.post("/api/execute-sql")
def execute_sql():
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    
    try:
        payload = request.get_json(silent=True) or {}
        db_config = payload.get("dbConfig")
        sql = payload.get("sql")
        params = payload.get("params")

        if not db_config or not sql:
            return jsonify({"error": "Missing dbConfig or sql"}), 400

        # Connect to database using SQLAlchemy
        engine = create_engine(
            f"mysql+pymysql://{db_config['user']}:{db_config['password']}"
            f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
        )

        with engine.connect() as connection:
            if params:
                result = connection.execute(text(sql), params)
            else:
                result = connection.execute(text(sql))
            # Commit the transaction for UPDATE/INSERT/DELETE statements
            connection.commit()
            # Convert result to list of dictionaries only if it returns rows
            results = []
            if result.returns_rows:
                for row in result.mappings():
                    results.append(dict(row))
            return jsonify({"results": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/sql/config")
def save_sql_config():
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    menu_name = payload.get("menu_name") or ""
    sql = payload.get("sql") or ""
    dbname = payload.get("dbname") or ""
    if not menu_name or not sql:
        return jsonify({"error": "menu_name and sql are required"}), 400
    
    existing_configs = _load_sql_config(username)
    
    if any(config.get("menu_name") == menu_name for config in existing_configs):
        return jsonify({"error": "目录名已存在"}), 409
    
    # if any(config.get("dbname") == dbname for config in existing_configs):
    #     return jsonify({"error": "database already exists"}), 409
    
    new_config = {
        "id": str(uuid.uuid4()),
        "menu_name": menu_name,
        "sql": sql,
        "dbname": dbname,
        "created_at": _now().isoformat() + "Z"
    }
    existing_configs.append(new_config)
    _save_sql_config(username, existing_configs)
    return jsonify({"ok": True})


@app.get("/api/sql/config")
def get_sql_config():
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    configs = _load_sql_config(username)
    return jsonify({"configs": configs})


@app.get("/api/sql/config/<config_id>")
def get_sql_config_by_id(config_id):
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    configs = _load_sql_config(username)
    config = next((c for c in configs if c.get("id") == config_id), None)
    if not config:
        return jsonify({"error": "config not found"}), 404
    return jsonify({"config": config})


@app.delete("/api/sql/config/<config_id>")
def delete_sql_config(config_id):
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    configs = _load_sql_config(username)
    filtered_configs = [c for c in configs if c.get("id") != config_id]
    if len(filtered_configs) == len(configs):
        return jsonify({"error": "config not found"}), 404
    _save_sql_config(username, filtered_configs)
    return jsonify({"ok": True})


@app.put("/api/sql/config/<config_id>")
def update_sql_config(config_id):
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    menu_name = payload.get("menu_name") or ""
    sql = payload.get("sql") or ""
    dbname = payload.get("dbname") or ""
    if not menu_name or not sql:
        return jsonify({"error": "menu_name and sql are required"}), 400
    
    configs = _load_sql_config(username)
    config_index = next((i for i, c in enumerate(configs) if c.get("id") == config_id), None)
    if config_index is None:
        return jsonify({"error": "config not found"}), 404
    
    configs[config_index]["menu_name"] = menu_name
    configs[config_index]["sql"] = sql
    configs[config_index]["dbname"] = dbname
    _save_sql_config(username, configs)
    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)

