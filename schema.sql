-- Elite Resort Care – Incident Tracking
-- Cloudflare D1 Schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS developments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  development_id INTEGER NOT NULL REFERENCES developments(id),
  unit TEXT,
  reporter_name TEXT NOT NULL,
  reporter_contact TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','acknowledged','in_progress','completed','closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  projected_finish TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT,
  note TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_incidents_reference ON incidents(reference);
CREATE INDEX IF NOT EXISTS idx_incidents_development ON incidents(development_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_updates_incident ON updates(incident_id, created_at);

-- Three starter sites (add more anytime via SQL or admin later)
INSERT OR IGNORE INTO developments (name, code, address) VALUES
  ('Oceanfront Residences', 'OFR', 'Surfers Paradise Blvd, Surfers Paradise QLD 4217'),
  ('Broadbeach Waters Estate', 'BWE', 'Old Burleigh Rd, Broadbeach Waters QLD 4218'),
  ('Hinterland Sanctuary', 'HLS', 'Tallebudgera Creek Rd, Tallebudgera QLD 4228');

INSERT OR IGNORE INTO staff (username, password_hash, display_name) VALUES
  ('admin', 'goldcoast2026', 'Elite Resort Care');
