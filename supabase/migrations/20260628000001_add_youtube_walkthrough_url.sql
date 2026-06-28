ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS youtube_walkthrough_url text DEFAULT NULL;
