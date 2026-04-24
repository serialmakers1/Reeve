-- Dedup application_residents: keep the oldest row per (application_id, full_name, age, relationship)
-- DOWN: not reversible (data cleanup)
DELETE FROM application_residents
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY application_id, full_name, age, relationship
        ORDER BY id
      ) AS rn
    FROM application_residents
  ) t
  WHERE t.rn > 1
);
