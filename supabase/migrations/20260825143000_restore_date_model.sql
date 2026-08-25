-- Remove the old data so we can alter the column safely
TRUNCATE TABLE prayer_times;

-- Alter the date column back to DATE, but allow NULLs
ALTER TABLE prayer_times ALTER COLUMN date DROP NOT NULL;
ALTER TABLE prayer_times ALTER COLUMN date TYPE DATE USING (date::DATE);

-- Add a column to preserve the original source date label for invalid dates
ALTER TABLE prayer_times ADD COLUMN source_date_label TEXT;

-- Drop the old UNIQUE constraint and create a new one that prevents duplicates 
-- but accounts for NULL dates by enforcing uniqueness on location_id + source_date_label for anomalies
ALTER TABLE prayer_times DROP CONSTRAINT IF EXISTS prayer_times_location_id_date_key;
ALTER TABLE prayer_times ADD CONSTRAINT prayer_times_location_id_date_key UNIQUE NULLS NOT DISTINCT (location_id, date, source_date_label);
