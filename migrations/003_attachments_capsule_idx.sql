-- Attachments are no longer preloaded whole; the detail view fetches one
-- capsule's rows on open. The existing index leads with entry_id, so it cannot
-- serve a capsule_id lookup.
CREATE INDEX IF NOT EXISTS app_time_capsule__attachments_capsule_idx
  ON app_time_capsule__attachments (capsule_id, created_at);
