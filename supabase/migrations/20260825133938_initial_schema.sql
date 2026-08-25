-- Create Locations Table
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  districts TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Monthly Sources Table
CREATE TABLE monthly_sources (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  pdf_url TEXT,
  jpg_url TEXT,
  file_name TEXT,
  source_page TEXT DEFAULT 'https://www.acju.lk/prayer-times/',
  file_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, year, month)
);

-- Create Prayer Times Table
CREATE TABLE prayer_times (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  fajr TIME NOT NULL,
  sunrise TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  source_id INTEGER REFERENCES monthly_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, date)
);

-- Create Indexes for performance
CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_monthly_sources_loc_year_month ON monthly_sources(location_id, year, month);
CREATE INDEX idx_prayer_times_loc_date ON prayer_times(location_id, date);
CREATE INDEX idx_prayer_times_date ON prayer_times(date);
