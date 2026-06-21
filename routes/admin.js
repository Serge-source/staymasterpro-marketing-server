"use strict";

const express = require("express");
const { requireJWT, requireRole } = require("../middleware/auth");
const db = require("../db/pool");

const router = express.Router();
const superOnly  = [requireJWT, requireRole("super_admin")];
const adminPlus  = [requireJWT, requireRole("super_admin", "administrator")];
const salesPlus  = [requireJWT, requireRole("super_admin", "administrator", "sales_manager", "support_agent")];

// ---- GET /api/secure/dashboard ----
router.get("/dashboard", ...adminPlus, async (req, res) => {
  try {
    const [customers, trials, demos, contacts, mrrRow] = await Promise.all([
      db.query("SELECT COUNT(*) FROM customers WHERE status='active'"),
      db.query("SELECT COUNT(*) FROM customers WHERE status='trial'"),
      db.query("SELECT COUNT(*) FROM demo_requests  WHERE status='pending'"),
      db.query("SELECT COUNT(*) FROM contact_requests WHERE status='new'"),
      db.query("SELECT COALESCE(SUM(plan_price),0) as mrr FROM customers WHERE status='active'"),
    ]);
    res.json({
      success: true,
      stats: {
        activeCustomers:  parseInt(customers.rows[0].count),
        trialUsers:       parseInt(trials.rows[0].count),
        pendingDemos:     parseInt(demos.rows[0].count),
        newContacts:      parseInt(contacts.rows[0].count),
        mrr:              parseFloat(mrrRow.rows[0].mrr),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load dashboard." });
  }
});

// ---- GET /api/secure/customers ----
router.get("/customers", ...salesPlus, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM customers ORDER BY created_at DESC LIMIT 200");
    res.json({ success: true, customers: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch customers." });
  }
});

// ---- PATCH /api/secure/customers/:id ----
router.patch("/customers/:id", ...adminPlus, async (req, res) => {
  const { status, plan, notes } = req.body;
  try {
    await db.query(
      "UPDATE customers SET status=$1, plan=$2, notes=$3, updated_at=NOW() WHERE id=$4",
      [status, plan, notes, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
});

// ---- GET /api/secure/audit-logs ----
router.get("/audit-logs", ...adminPlus, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT al.*, au.name as user_name FROM audit_logs al
       LEFT JOIN admin_users au ON al.user_id = au.id
       ORDER BY al.created_at DESC LIMIT 500`
    );
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch audit logs." });
  }
});

// ---- GET /api/secure/admin-users ----
router.get("/admin-users", ...superOnly, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, is_active, twofa_enabled, last_login FROM admin_users ORDER BY created_at"
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch users." });
  }
});

// ---- POST /api/secure/admin-users ----
router.post("/admin-users", ...superOnly, async (req, res) => {
  const bcrypt = require("bcrypt");
  const { v4: uuidv4 } = require("uuid");
  const { name, email, role, password } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ success: false, message: "All fields required." });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      "INSERT INTO admin_users (id,name,email,role,password_hash,is_active,created_at) VALUES ($1,$2,$3,$4,$5,true,NOW()) RETURNING id,name,email,role",
      [uuidv4(), name, email.toLowerCase(), role, hash]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ success: false, message: "Email already exists." });
    res.status(500).json({ success: false, message: "Could not create user." });
  }
});

// ---- PATCH /api/secure/admin-users/:id/disable ----
router.patch("/admin-users/:id/disable", ...superOnly, async (req, res) => {
  await db.query("UPDATE admin_users SET is_active=false WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

// ---- GET /api/secure/chatbot-config ----
router.get("/chatbot-config", ...adminPlus, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM website_settings WHERE setting_key LIKE 'chatbot_%'");
    const config = {};
    result.rows.forEach(r => { config[r.setting_key] = r.setting_value; });
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load chatbot config." });
  }
});

module.exports = router;
