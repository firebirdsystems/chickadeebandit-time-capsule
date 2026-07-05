CREATE TABLE IF NOT EXISTS app_time_capsule__capsules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  occasion TEXT DEFAULT '',
  reveal_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'revealed', 'archived')),
  prompt TEXT DEFAULT '',
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  closed_at TEXT DEFAULT '',
  revealed_at TEXT DEFAULT '',
  archived_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_time_capsule__entries (
  id TEXT PRIMARY KEY,
  capsule_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'letter' CHECK (entry_type IN ('letter', 'prediction', 'memory', 'photo_note')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (capsule_id) REFERENCES app_time_capsule__capsules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_time_capsule__attachments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  capsule_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_ref TEXT NOT NULL,
  content_type TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES app_time_capsule__entries(id) ON DELETE CASCADE,
  FOREIGN KEY (capsule_id) REFERENCES app_time_capsule__capsules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS app_time_capsule__capsules_status_reveal_idx
  ON app_time_capsule__capsules(status, reveal_date);

CREATE INDEX IF NOT EXISTS app_time_capsule__entries_capsule_idx
  ON app_time_capsule__entries(capsule_id, created_at);

CREATE INDEX IF NOT EXISTS app_time_capsule__entries_member_idx
  ON app_time_capsule__entries(member_id, created_at);

CREATE INDEX IF NOT EXISTS app_time_capsule__attachments_entry_idx
  ON app_time_capsule__attachments(entry_id, created_at);
