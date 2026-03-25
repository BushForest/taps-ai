-- Fast NFC tap resolution: tag_code is the primary lookup key on every tap
CREATE INDEX IF NOT EXISTS nfc_tags_tag_code_idx
  ON nfc_tags (tag_code);

-- POS check lookup by external check ID (used in writeback + reconciliation)
CREATE INDEX IF NOT EXISTS check_snapshots_pos_check_id_idx
  ON check_snapshots (pos_check_id);

-- Session expiry worker: only open-expiry window sessions need scanning
CREATE INDEX IF NOT EXISTS dining_sessions_public_expires_at_idx
  ON dining_sessions (public_expires_at)
  WHERE public_expires_at IS NOT NULL;

-- Audit log queries scoped to a session (admin view, support tooling)
CREATE INDEX IF NOT EXISTS audit_events_session_idx
  ON audit_events (session_id)
  WHERE session_id IS NOT NULL;

-- Exception queue: open exceptions per session (admin dashboard + auto-resolve)
CREATE INDEX IF NOT EXISTS reconciliation_exceptions_session_status_idx
  ON reconciliation_exceptions (session_id, status);
