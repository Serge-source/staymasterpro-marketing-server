"use strict";

const express = require("express");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db      = require("../db/pool");
const logger  = require("../middleware/logger");
const { requireJWT } = require("../middleware/auth");

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const MAX_FAILS  = 5;
const LOCK_MINS  = 15;

// ---- POST /api/admin/login ----
router.post("/login", async (req, res) => {
  const { username, password, twofaCode, remember } = req.body;
  const ip = req.ip;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  try {
    // Fetch user (by email or username)
    const result = await db.query(
      "SELECT * FROM admin_users WHERE (email = $1 OR username = $1) AND is_active = true LIMIT 1",
      [username.toLowerCase().trim()]
    );

    const user = result.rows[0];

    // Check lockout
    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAudit(user.id, ip, "LOGIN_LOCKED", "login");
      return res.status(403).json({ success: false, message: `Account locked. Try again after ${LOCK_MINS} minutes.` });
    }

    // Validate password
    const valid = user && await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      if (user) {
        const fails = (user.failed_attempts || 0) + 1;
        const lock  = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINS * 60000) : null;
        await db.query(
          "UPDATE admin_users SET failed_attempts=$1, locked_until=$2 WHERE id=$3",
          [fails, lock, user.id]
        );
        await logAudit(user.id, ip, "LOGIN_FAIL", "login");
      }
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Reset failed attempts
    await db.query(
      "UPDATE admin_users SET failed_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=$1",
      [user.id]
    );

    // 2FA check
    if (user.twofa_enabled) {
      if (!twofaCode) {
        return res.status(200).json({ success: true, requires2FA: true });
      }
      // In production: verify TOTP with a library like 'speakeasy'
      if (twofaCode !== user.twofa_secret) { // placeholder — replace with TOTP verify
        return res.status(401).json({ success: false, message: "Invalid 2FA code." });
      }
    }

    // Issue JWT
    const expiresIn = remember ? "30d" : "8h";
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn }
    );

    // Set session
    req.session.adminId   = user.id;
    req.session.adminRole = user.role;

    await logAudit(user.id, ip, "LOGIN_SUCCESS", "login");

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    logger.error("Login error", { err: err.message });
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ---- POST /api/admin/logout ----
router.post("/logout", requireJWT, async (req, res) => {
  await logAudit(req.admin.id, req.ip, "LOGOUT", "session");
  req.session.destroy();
  res.json({ success: true });
});

// ---- GET /api/admin/me ----
router.get("/me", requireJWT, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, twofa_enabled, last_login FROM admin_users WHERE id=$1",
      [req.admin.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch user." });
  }
});

// ---- POST /api/admin/reset-password ----
router.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email required." });

  // In production: generate a time-limited reset token, email it via SMTP
  logger.info(`Password reset requested for: ${email}`, { ip: req.ip });
  res.json({ success: true, message: "If this email is registered, reset instructions have been sent." });
});

// ---- Helper: write audit log ----
async function logAudit(userId, ip, action, target) {
  try {
    await db.query(
      "INSERT INTO audit_logs (id, user_id, ip_address, action, target, created_at) VALUES ($1,$2,$3,$4,$5,NOW())",
      [uuidv4(), userId || null, ip, action, target]
    );
  } catch (_) { /* non-fatal */ }
}

module.exports = router;
