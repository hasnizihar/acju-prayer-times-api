-- Drop the previous generic unique constraint that treated NULLs as indistinct (in some configurations) or distinct.
ALTER TABLE prayer_times DROP CONSTRAINT IF EXISTS prayer_times_location_id_date_key;

-- Create partial unique index for valid calendar records (where date is not null)
CREATE UNIQUE INDEX idx_prayer_times_valid_date 
ON prayer_times(location_id, date) 
WHERE date IS NOT NULL;

-- Create partial unique index for anomalous source-only records (where date is null)
CREATE UNIQUE INDEX idx_prayer_times_anomaly 
ON prayer_times(location_id, source_date_label) 
WHERE date IS NULL;
