SELECT
  id,
  title,
  occasion,
  reveal_date,
  status,
  prompt,
  created_by_name,
  created_at
FROM app_time_capsule__capsules
WHERE status IN ('open', 'closed')
ORDER BY reveal_date ASC, created_at ASC
