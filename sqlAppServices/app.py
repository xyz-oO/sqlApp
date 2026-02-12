import os
import uuid
from datetime import datetime, timedelta
import urllib.parse 
import hashlib
import json
import jwt
import threading
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

_NOTICE_LOCK = threading.Lock()
_NOTICE_READ_LOCK = threading.Lock()
NOTICES_STORE_PATH = os.path.join(os.path.dirname(__file__), "notices.json")
LEGACY_NOTICES_STORE_PATHS = [
    os.path.join(os.path.dirname(__file__), "messages.store.json"),
    os.path.join(os.path.dirname(__file__), "messages", "messages.store.json"),
]

NOTICE_READ_FILENAME = "notices_read.json"

def _active_notices_store_path():
    return NOTICES_STORE_PATH


def _now():
    return datetime.utcnow()


def _utc_now_iso():
    return datetime.utcnow().isoformat() + "Z"


def _expire_at():
    return _now() + timedelta(minutes=SESSION_TTL_MINUTES)

def _format_session_id():
    raw = uuid.uuid4().hex
    return "{}-{}-{}-{}".format(raw[:4], raw[4:10], raw[10:15], raw[15:20])


def _encode_session(payload):
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_session(token):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def _role_from_cookie():
    token = request.cookies.get("sessionId")
    if not token:
        return None
    try:
        data = _decode_session(token)
        return data.get("role")
    except jwt.PyJWTError:
        return None


def _require_super_role():
    if _role_from_cookie() != "SUPER":
        return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
    return None


def _ensure_notices_store_exists():
    active_path = _active_notices_store_path()
    if os.path.exists(active_path):
        return

    for legacy_path in LEGACY_NOTICES_STORE_PATHS:
        if os.path.exists(legacy_path):
            with open(legacy_path, "r", encoding="utf-8") as f:
                existing = json.load(f) or {}
            with open(active_path, "w", encoding="utf-8") as f:
                json.dump(existing, f, indent=2)
            return

    # No legacy + no defaults: initialize empty store
    with open(active_path, "w", encoding="utf-8") as f:
        json.dump({"messages": []}, f, indent=2)


def _load_notices():
    _ensure_notices_store_exists()
    with open(_active_notices_store_path(), "r", encoding="utf-8") as f:
        data = json.load(f) or {}
    messages = data.get("messages") or []
    normalized = []
    for item in messages:
        if not isinstance(item, dict):
            continue
        pushed_at = item.get("pushedAt")
        pushed_value = item.get("pushed")
        # If `pushed` was removed from JSON, infer from presence of pushedAt
        pushed = bool(pushed_value) if pushed_value is not None else bool(pushed_at)
        normalized.append(
            {
                "id": item.get("id"),
                "title": item.get("title") or "",
                "body": item.get("body") or "",
                "footer": item.get("footer") or "",
                "pushed": pushed,
                "pushedAt": pushed_at,
            }
        )
    return normalized


def _save_notices(notices):
    payload = {"messages": notices}
    active_path = _active_notices_store_path()
    with open(active_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def _next_notice_id(notices):
    ids = [n.get("id") for n in notices if isinstance(n.get("id"), int)]
    return (max(ids) + 1) if ids else 1


def _notice_read_path(username: str) -> str:
    return os.path.join(USERS_DIR, username, NOTICE_READ_FILENAME)


def _load_notice_reads(username: str) -> dict:
    """
    Returns map: { "<noticeId>": "<readAt iso>" }
    """
    try:
        path = _notice_read_path(username)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f) or {}
        read_map = data.get("read") or {}
        return read_map if isinstance(read_map, dict) else {}
    except FileNotFoundError:
        return {}


def _save_notice_reads(username: str, read_map: dict) -> None:
    os.makedirs(os.path.join(USERS_DIR, username), exist_ok=True)
    path = _notice_read_path(username)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"read": read_map}, f, indent=2)


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


# -------------------------
# Notice management (CRUD)
# -------------------------

@app.get("/api/notices")
def get_notices():
    username = _get_username_from_request()
    with _NOTICE_LOCK:
        notices = _load_notices()
    if not username:
        return jsonify({"messages": notices})

    with _NOTICE_READ_LOCK:
        read_map = _load_notice_reads(username)
    enriched = []
    for item in notices:
        notice_id = item.get("id")
        key = str(notice_id) if notice_id is not None else ""
        read_at = read_map.get(key)
        enriched.append(
            {
                **item,
                "read": bool(read_at),
                "readAt": read_at,
            }
        )
    return jsonify({"messages": enriched})


@app.get("/api/messages")
def get_messages_alias():
    # Backward-compatible alias
    return get_notices()


@app.post("/api/notices")
def create_notice():
    auth = _require_super_role()
    if auth:
        return auth
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    body = payload.get("body") or ""
    footer = payload.get("footer") or ""
    if not title:
        return jsonify({"error": "title required"}), 400
    with _NOTICE_LOCK:
        notices = _load_notices()
        new_notice = {
            "id": _next_notice_id(notices),
            "title": title,
            "body": body,
            "footer": footer,
            "pushedAt": _utc_now_iso(),
        }
        notices.append(new_notice)
        _save_notices(notices)
    return jsonify({"ok": True, "message": new_notice})


@app.post("/api/notices/<int:notice_id>/read")
def mark_notice_read(notice_id: int):
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401

    with _NOTICE_LOCK:
        notices = _load_notices()
    if not any(n.get("id") == notice_id for n in notices):
        return jsonify({"error": "notice not found"}), 404

    read_at = _utc_now_iso()
    with _NOTICE_READ_LOCK:
        read_map = _load_notice_reads(username)
        read_map[str(notice_id)] = read_at
        _save_notice_reads(username, read_map)

    return jsonify({"ok": True, "noticeId": notice_id, "readAt": read_at})


@app.delete("/api/notices/<int:notice_id>")
def delete_notice(notice_id: int):
    auth = _require_super_role()
    if auth:
        return auth
    with _NOTICE_LOCK:
        notices = _load_notices()
        remaining = [n for n in notices if n.get("id") != notice_id]
        if len(remaining) == len(notices):
            return jsonify({"error": "notice not found"}), 404
        _save_notices(remaining)
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
        encoded_password = urllib.parse.quote_plus(config["password"])

        engine = create_engine(
            f"mysql+pymysql://{config['user']}:{encoded_password}"
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
    import uuid
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    config_id = payload.get("id") or str(uuid.uuid4())
    new_config = {
        "id": config_id,
        "host": payload.get("host") or "",
        "port": payload.get("port"),
        "database": payload.get("database") or "",
        "user": payload.get("user") or "",
        "password": payload.get("password") or "",
    }
    
    existing_configs = _load_db_config(username)
    
    # Check if a config with the same id already exists
    config_index = next(
        (i for i, config in enumerate(existing_configs) 
         if config.get("id") == config_id),
        None
    )
    
    if config_index is not None:
        # Update existing config
        original_config = existing_configs[config_index]
        original_db_name = original_config.get("database")
        new_db_name = new_config.get("database")
        
        # Check if database name changed
        if new_db_name != original_db_name:
            # Check if a config with the new database name already exists
            if new_db_name:
                existing_db_config = next(
                    (config for config in existing_configs 
                     if config.get("database") == new_db_name and config.get("id") != config_id),
                    None
                )
                if existing_db_config:
                    return jsonify({"error": "数据库名已存在，请使用不同的数据库名"}), 409
        
        existing_configs[config_index] = new_config
    else:
        # Check if a config with the same database name already exists
        db_name = new_config.get("database")
        if db_name:
            existing_db_config = next(
                (config for config in existing_configs 
                 if config.get("database") == db_name),
                None
            )
            if existing_db_config:
                return jsonify({"error": "数据库名已存在，请使用不同的数据库名"}), 409
        # Add new config
        existing_configs.append(new_config)
    
    _save_db_config(username, existing_configs)
    return jsonify({"ok": True, "id": config_id})


@app.delete("/api/db/config")
def delete_db_config():
    username = _get_username_from_request()
    if not username:
        return jsonify({"error": "unauthorized"}), 401
    payload = request.get_json(silent=True) or {}
    config_id = payload.get("id")
    
    if not config_id:
        return jsonify({"error": "config id required"}), 400
    
    existing_configs = _load_db_config(username)
    filtered_configs = [
        config for config in existing_configs 
        if config.get("id") != config_id
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
        
        encoded_password = urllib.parse.quote_plus(db_config["password"])

        # Connect to database using SQLAlchemy
        engine = create_engine(
            f"mysql+pymysql://{db_config['user']}:{encoded_password}"
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

