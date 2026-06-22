"use strict";

const { Pool } = require("pg");

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host:     process.env.DB_HOST || "127.0.0.1",
      port:     parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...connectionConfig,
  max:                    10,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

module.exports = pool;
