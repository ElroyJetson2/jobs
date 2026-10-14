-- Gold Coast Property Incident Tracking System
-- Cloudflare D1 Schema

PRAGMA foreign_keys = ON;

-- Developments (properties/complexes)
CREATE TABLE IF NOT EXISTS developments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,          -- short code used in references e.g. SPR
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Incidents / Jobs
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,     -- e.g. GC-241014-A7K9
  development_id INTEGER NOT NULL REFERENCES developments(id),
  unit TEXT,                         -- unit / apartment / lot number
  reporter_name TEXT NOT NULL,
  reporter_contact TEXT NOT NULL,     -- phone or email
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','acknowledged','in_progress','completed','closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  projected_finish TEXT,             -- ISO 8601 datetime string
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Timeline of status changes and notes
CREATE TABLE IF NOT EXISTS updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT,                       -- optional status at this update
  note TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Simple staff credentials (replace with Cloudflare Access in production)
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,       -- store a simple hash or plain for demo
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_incidents_reference ON incidents(reference);
CREATE INDEX IF NOT EXISTS idx_incidents_development ON incidents(development_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_updates_incident ON updates(incident_id, created_at);

-- Seed some Gold Coast style developments
INSERT OR IGNORE INTO developments (name, code, address) VALUES
  ('Surfers Paradise Residences', 'SPR', 'Surfers Paradise Blvd, Surfers Paradise QLD 4217'),
  ('Broadbeach Waters', 'BRW', 'Old Burleigh Rd, Broadbeach QLD 4218'),
  ('Main Beach Tower', 'MBT', 'Main Beach Parade, Main Beach QLD 4217'),
  ('Southport Central', 'SPC', 'Scarborough St, Southport QLD 4215'),
  ('Burleigh Heads Apartments', 'BHA', 'James St, Burleigh Heads QLD 4220'),
  ('Robina Lakes', 'RBL', 'Lakeview Dr, Robina QLD 4226');

-- Default staff account (username: admin / password: goldcoast2026)
-- In production hash this properly or use Cloudflare Access
INSERT OR IGNORE INTO staff (username, password_hash, display_name) VALUES
  ('admin', 'goldcoast2026', 'Site Admin');
