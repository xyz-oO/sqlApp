def push_notice(message_id: int, load_notices, save_notices, utc_now_iso):
    """
    Push-only logic (no CRUD / no Flask routes).

    Arguments are injected by app.py to avoid circular imports:
    - load_notices(): -> list[dict]
    - save_notices(list[dict]): -> None
    - utc_now_iso(): -> str
    """
    notices = load_notices()
    notice = next((m for m in notices if m.get("id") == message_id), None)
    if not notice:
        return None, "notice not found"
    # If `pushed` is missing from store, infer pushed from pushedAt.
    already_pushed = bool(notice.get("pushed")) or bool(notice.get("pushedAt"))
    if not already_pushed:
        notice["pushed"] = True
        notice["pushedAt"] = utc_now_iso()
        save_notices(notices)
    return notice, None

