-- ============================================================
-- StayMaster Pro — PostgreSQL Database Schema
-- Run once to initialize the database.
-- psql -U <user> -d <database> -f schema.sql
-- ============================================================

-- ---- Extensions ----
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ADMIN USERS & ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) UNIQUE NOT NULL,  -- super_admin, administrator, marketing_manager, sales_manager, support_agent, viewer
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO admin_roles (name, description) VALUES
  ('super_admin',        'Full system control'),
  ('administrator',      'Website and customer management'),
  ('marketing_manager',  'Content management'),
  ('sales_manager',      'Lead and billing management'),
  ('support_agent',      'Lead and customer support'),
  ('viewer',             'Read-only access')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(120) NOT NULL,
  username        VARCHAR(80) UNIQUE,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(50) REFERENCES admin_roles(name),
  is_active       BOOLEAN DEFAULT TRUE,
  twofa_enabled   BOOLEAN DEFAULT FALSE,
  twofa_secret    VARCHAR(100),
  failed_attempts INT DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- Default super admin (password: ChangeMe123! — CHANGE IMMEDIATELY)
-- Password hash generated with bcrypt rounds=12
INSERT INTO admin_users (name, username, email, password_hash, role, is_active)
VALUES (
  'Super Admin',
  'superadmin',
  'admin@yourcompany.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj0L.QnHLQ8m', -- placeholder hash
  'super_admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- WEBSITE CMS
-- ============================================================

CREATE TABLE IF NOT EXISTS website_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key   VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO website_settings (setting_key, setting_value) VALUES
  ('company_name',      'StayMaster Pro'),
  ('hero_headline',     'Manage Your Vacation Rentals Smarter, Faster, and More Profitably'),
  ('hero_subheadline',  'All-in-one property management software for reservations, guest communication, cleaning, maintenance, owner reporting, upsells, payments, and multi-platform rental operations.'),
  ('color_primary',     '#0B1F3A'),
  ('color_secondary',   '#00A6A6'),
  ('color_accent',      '#F4C95D'),
  ('trial_url',         'https://app.yourdomain.com/register'),
  ('login_url',         'https://app.yourdomain.com/login'),
  ('demo_url',          'https://calendly.com/yourcompany/demo'),
  ('chatbot_url',       'https://chat.yourdomain.com'),
  ('contact_email',     'sales@yourcompany.com'),
  ('chatbot_name',      'StayMaster AI'),
  ('chatbot_welcome',   'Hi! I''m your StayMaster AI Assistant. How can I help you today?'),
  ('chatbot_languages', 'English, Spanish, Dutch, Portuguese')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- PRICING PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(80) NOT NULL,
  price        VARCHAR(30) NOT NULL,
  description  TEXT,
  properties   VARCHAR(50),
  features     JSONB DEFAULT '[]',
  is_popular   BOOLEAN DEFAULT FALSE,
  is_active    BOOLEAN DEFAULT TRUE,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

INSERT INTO pricing_plans (name, price, description, properties, is_popular, sort_order) VALUES
  ('Starter',      '$49/mo',   'Best for individual hosts with 1–2 units.',              '2',         false, 1),
  ('Growth',       '$149/mo',  'Best for growing hosts and small property managers.',     'Up to 10',  true,  2),
  ('Professional', '$299/mo',  'Best for professional property managers.',               'Up to 30',  false, 3),
  ('Enterprise',   'Custom',   'For large operators, boutique hotels, villa companies.', 'Unlimited', false, 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FEATURES, FAQ, TESTIMONIALS
-- ============================================================

CREATE TABLE IF NOT EXISTS features (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(120) NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS testimonials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(120) NOT NULL,
  role        VARCHAR(120),
  text        TEXT NOT NULL,
  stars       SMALLINT DEFAULT 5,
  photo_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEO SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_settings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page             VARCHAR(60) UNIQUE DEFAULT 'home',
  meta_title       TEXT,
  meta_description TEXT,
  keywords         TEXT,
  og_image         TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEDIA LIBRARY
-- ============================================================

CREATE TABLE IF NOT EXISTS media_library (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name    VARCHAR(255) NOT NULL,
  file_path    TEXT NOT NULL,
  file_type    VARCHAR(30),
  file_size    INT,
  uploaded_by  UUID REFERENCES admin_users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SAAS CUSTOMERS & SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  company       VARCHAR(120),
  phone         VARCHAR(40),
  plan          VARCHAR(50),
  plan_price    NUMERIC(10,2),
  status        VARCHAR(30) DEFAULT 'trial',  -- trial, active, expired, cancelled
  trial_ends    TIMESTAMPTZ,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  num_properties INT DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  amount      NUMERIC(10,2) NOT NULL,
  currency    VARCHAR(3) DEFAULT 'USD',
  status      VARCHAR(20) DEFAULT 'pending',  -- pending, paid, overdue, cancelled
  due_date    DATE,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEADS
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name        VARCHAR(120),
  company_name     VARCHAR(120),
  email            VARCHAR(255),
  phone            VARCHAR(40),
  num_properties   VARCHAR(30),
  interested_plan  VARCHAR(60),
  message          TEXT,
  source           VARCHAR(40) DEFAULT 'contact_form',
  status           VARCHAR(30) DEFAULT 'new',  -- new, open, pending, resolved
  notes            TEXT,
  assigned_to      UUID REFERENCES admin_users(id),
  ip_address       INET,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS demo_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name      VARCHAR(120),
  email          VARCHAR(255),
  phone          VARCHAR(40),
  num_properties VARCHAR(30),
  status         VARCHAR(30) DEFAULT 'pending',
  scheduled_at   TIMESTAMPTZ,
  ip_address     INET,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(120) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(40),
  company         VARCHAR(120),
  num_properties  VARCHAR(30),
  booked_date     DATE NOT NULL,
  booked_slot     VARCHAR(10) NOT NULL,  -- e.g. "10:00"
  timezone        VARCHAR(60) DEFAULT 'America/New_York',
  status          VARCHAR(30) DEFAULT 'confirmed',  -- confirmed, cancelled, completed, no_show
  notes           TEXT,
  confirmation_no VARCHAR(20) UNIQUE,
  ip_address      INET,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_demo_bookings_date   ON demo_bookings(booked_date);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_email  ON demo_bookings(email);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);

CREATE TABLE IF NOT EXISTS trial_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(120),
  email       VARCHAR(255),
  plan        VARCHAR(60),
  status      VARCHAR(30) DEFAULT 'pending',  -- pending, activated, converted, expired
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  ip_address  INET,
  action      VARCHAR(80) NOT NULL,  -- LOGIN, LOGOUT, LOGIN_FAIL, CREATE, UPDATE, DELETE
  target      VARCHAR(120),
  detail      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_created   ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_status        ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_status           ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_customers_status      ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email       ON customers(email);
CREATE INDEX IF NOT EXISTS idx_invoices_customer     ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);

-- ============================================================
-- DONE
-- ============================================================
-- psql will output: "CREATE TABLE", "INSERT 0 N", etc. for each statement.
-- Next step: update the default super admin password hash in admin_users.
