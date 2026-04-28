PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Actif',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  price INTEGER NOT NULL,
  surface_m2 INTEGER,
  rooms INTEGER,
  status TEXT NOT NULL DEFAULT 'Disponible',
  description TEXT,
  energy_class TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  agency_id INTEGER,
  FOREIGN KEY (agency_id) REFERENCES agencies(id)
);

CREATE TABLE IF NOT EXISTS property_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_media_unique
  ON property_media(property_id, url);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_media_primary
  ON property_media(property_id)
  WHERE is_primary = 1;

CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  property_id INTEGER,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Nouveau',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, property_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_metrics (
  property_id INTEGER PRIMARY KEY,
  monthly_views INTEGER NOT NULL DEFAULT 0,
  buyer_interest_score REAL NOT NULL DEFAULT 0,
  estimated_days_on_market INTEGER NOT NULL DEFAULT 0,
  estimated_rent_yield REAL NOT NULL DEFAULT 0,
  district_score REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_type TEXT NOT NULL,
  city TEXT NOT NULL,
  sale_price INTEGER NOT NULL,
  surface_m2 INTEGER NOT NULL,
  sold_at TEXT NOT NULL,
  agency_id INTEGER,
  FOREIGN KEY (agency_id) REFERENCES agencies(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_history_unique
  ON sales_history(city, property_type, sold_at, sale_price);

CREATE TABLE IF NOT EXISTS network_sites (
  agency_id INTEGER PRIMARY KEY,
  site_type TEXT NOT NULL CHECK(site_type IN ('Siege', 'Agence')),
  workstations_count INTEGER NOT NULL,
  printers_count INTEGER NOT NULL DEFAULT 1,
  vpn_enabled INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Nouveau',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id)
);
