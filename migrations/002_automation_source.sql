-- Automations open a capsule when another app records a date worth writing
-- toward (manifest.automation_actions.create_capsule).
--
-- `source_event_id` records which app event produced the capsule. The
-- dispatcher's dedupe guard reads it before running the action (SELECT 1 ...
-- WHERE source_event_id = ? LIMIT 1), so one event never opens two capsules —
-- not on a retry, and not from two rules watching the same trigger.
--
-- Only the container is created; the letters are still written by people. The
-- capsule lands in 'open' status, which is exactly the state that accepts
-- entries.
--
-- Nullable on purpose: capsules an adult opens in the app leave it NULL.
ALTER TABLE app_time_capsule__capsules ADD COLUMN source_event_id TEXT;

CREATE INDEX IF NOT EXISTS app_time_capsule__capsules_source_event_idx
  ON app_time_capsule__capsules (source_event_id);
