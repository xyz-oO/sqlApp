import json
import os
import threading
from datetime import datetime

import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS

from message_push import push_notice


app = Flask(__name__)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:8000")
CORS(app, supports_credentials=True, origins=[FRONTEND_ORIGIN])

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"

_LOCK = threading.Lock()
NOTICES_PATH = os.path.join(os.path.dirname(__file__), "notices.json")
USERS_DIR = os.path.join(os.path.dirname(__file__), "users")
NOTICE_READ_FILENAME = "notices_read.json"


def _utc_now_iso():
  return datetime.utcnow().isoformat() + "Z"


def _require_super_role():
  token = request.cookies.get("sessionId")
  if not token:
    return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
  try:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    if payload.get("role") != "SUPER":
      return jsonify({"error": "unauthorized, only SUPER role can access"}), 403
    return None
  except jwt.PyJWTError:
    return jsonify({"error": "unauthorized, only SUPER role can access"}), 403


def _ensure_notices_exists():
  if os.path.exists(NOTICES_PATH):
    return
  with open(NOTICES_PATH, "w", encoding="utf-8") as f:
    json.dump({"messages": []}, f, indent=2)


def _load_notices():
  _ensure_notices_exists()
  with open(NOTICES_PATH, "r", encoding="utf-8") as f:
    data = json.load(f) or {}
  items = data.get("messages") or []
  return items if isinstance(items, list) else []


def _save_notices(notices):
  with open(NOTICES_PATH, "w", encoding="utf-8") as f:
    json.dump({"messages": notices}, f, indent=2)

def _next_notice_id(notices):
  ids = [n.get("id") for n in notices if isinstance(n, dict) and isinstance(n.get("id"), int)]
  return (max(ids) + 1) if ids else 1


def _notice_read_path(username: str) -> str:
  return os.path.join(USERS_DIR, username, NOTICE_READ_FILENAME)


def _load_notice_reads(username: str) -> dict:
  try:
    with open(_notice_read_path(username), "r", encoding="utf-8") as f:
      data = json.load(f) or {}
    read_map = data.get("read") or {}
    return read_map if isinstance(read_map, dict) else {}
  except FileNotFoundError:
    return {}


def _save_notice_reads(username: str, read_map: dict) -> None:
  os.makedirs(os.path.join(USERS_DIR, username), exist_ok=True)
  with open(_notice_read_path(username), "w", encoding="utf-8") as f:
    json.dump({"read": read_map}, f, indent=2)


@app.get("/api/health")
def health():
  return jsonify({"ok": True})


@app.post("/api/notices/send")
def send_notice_to_all_users():
  """
  Create a notice and ensure it is UNREAD for all users by removing it from each user's read-map.
  """
  auth = _require_super_role()
  if auth:
    return auth

  payload = request.get_json(silent=True) or {}
  title = (payload.get("title") or "").strip()
  body = payload.get("body") or ""
  footer = payload.get("footer") or ""
  if not title:
    return jsonify({"error": "title required"}), 400

  with _LOCK:
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

    key = str(new_notice["id"])
    try:
      usernames = [name for name in os.listdir(USERS_DIR) if os.path.isdir(os.path.join(USERS_DIR, name))]
    except FileNotFoundError:
      usernames = []

    for username in usernames:
      read_map = _load_notice_reads(username)
      if key in read_map:
        read_map.pop(key, None)
        _save_notice_reads(username, read_map)

  return jsonify({"ok": True, "message": new_notice})


@app.post("/api/notices/<int:notice_id>/push")
def push_notice_route(notice_id: int):
  auth = _require_super_role()
  if auth:
    return auth
  with _LOCK:
    updated, err = push_notice(
      notice_id,
      load_notices=_load_notices,
      save_notices=_save_notices,
      utc_now_iso=_utc_now_iso,
    )
    if err:
      return jsonify({"error": err}), 404
  return jsonify({"ok": True, "message": updated})


@app.post("/api/messages/<int:notice_id>/push")
def push_message_alias(notice_id: int):
  # Backward-compatible alias
  return push_notice_route(notice_id)


if __name__ == "__main__":
  port = int(os.getenv("NOTICE_PUSH_PORT", "5002"))
  app.run(host="0.0.0.0", port=port, debug=True)

