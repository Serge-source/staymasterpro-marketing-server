"use strict";

const db     = require("./pool");
const logger = require("../middleware/logger");

const migrations = [
  {
    name: "create_demo_bookings",
    sql: `
      CREATE TABLE IF NOT EXISTS demo_bookings (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name       VARCHAR(120) NOT NULL,
        email           VARCHAR(255) NOT NULL,
        phone           VARCHAR(40),
        company         VARCHAR(120),
        num_properties  VARCHAR(30),
        booked_date     DATE NOT NULL,
        booked_slot     VARCHAR(10) NOT NULL,
        timezone        VARCHAR(60) DEFAULT 'America/New_York',
        status          VARCHAR(30) DEFAULT 'confirmed',
        notes           TEXT,
        confirmation_no VARCHAR(20) UNIQUE,
        ip_address      INET,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_demo_bookings_date   ON demo_bookings(booked_date);
      CREATE INDEX IF NOT EXISTS idx_demo_bookings_email  ON demo_bookings(email);
      CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON demo_bookings(status);
    `,
  },
];

async function runMigrations() {
  // Create migrations tracking table if it doesn't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const existing = await db.query(
      "SELECT name FROM _migrations WHERE name = $1",
      [migration.name]
    );
    if (existing.rowCount > 0) continue; // already applied

    await db.query(migration.sql);
    await db.query("INSERT INTO _migrations (name) VALUES ($1)", [migration.name]);
    logger.info(`Migration applied: ${migration.name}`);
  }
}

module.exports = runMigrations;
