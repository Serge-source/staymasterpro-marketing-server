"use strict";

const express = require("express");
const xss     = require("xss");
const { v4: uuidv4 } = require("uuid");
const db      = require("../db/pool");
const logger  = require("../middleware/logger");
const { requireJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

// Sanitize a plain object's string values against XSS
function sanitize(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" ? xss(v.trim()) : v;
  }
  return out;
}

// ---- POST /api/leads/contact ----
router.post("/contact", async (req, res) => {
  const data = sanitize(req.body);
  const { fullName, companyName, email, phone, numProperties, interestedPlan, message } = data;

  if (!fullName || !email) {
    return res.status(400).json({ success: false, message: "Name and email are required." });
  }

  try {
    await db.query(
      `INSERT INTO contact_requests (id, full_name, company_name, email, phone, num_properties, interested_plan, message, source, ip_address, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'contact_form',$9,NOW())`,
      [uuidv4(), fullName, companyName, email, phone, numProperties, interestedPlan, message, req.ip]
    );
    logger.info(`New contact request from ${email}`);
    res.json({ success: true, message: "Thank you! Our team will reply within 24 hours." });
  } catch (err) {
    logger.error("Contact form error", { err: err.message });
    res.status(500).json({ success: false, message: "Could not submit. Please try again." });
  }
});

// ---- POST /api/leads/demo ----
router.post("/demo", async (req, res) => {
  const data = sanitize(req.body);
  const { fullName, email, phone, numProperties } = data;

  if (!fullName || !email) {
    return res.status(400).json({ success: false, message: "Name and email are required." });
  }

  try {
    await db.query(
      `INSERT INTO demo_requests (id, full_name, email, phone, num_properties, ip_address, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [uuidv4(), fullName, email, phone, numProperties, req.ip]
    );
    logger.info(`New demo request from ${email}`);
    res.json({ success: true, message: "Demo request received! We'll contact you to confirm your session." });
  } catch (err) {
    logger.error("Demo request error", { err: err.message });
    res.status(500).json({ success: false, message: "Could not submit. Please try again." });
  }
});

// ---- POST /api/leads/trial ----
router.post("/trial", async (req, res) => {
  const data = sanitize(req.body);
  const { name, email, plan } = data;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: "Name and email are required." });
  }

  try {
    await db.query(
      `INSERT INTO trial_requests (id, name, email, plan, ip_address, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [uuidv4(), name, email, plan || "unknown", req.ip]
    );
    logger.info(`New trial request from ${email} — plan: ${plan}`);
    res.json({ success: true, message: "Your 14-day free trial is ready! Check your email." });
  } catch (err) {
    logger.error("Trial request error", { err: err.message });
    res.status(500).json({ success: false, message: "Could not start trial. Please try again." });
  }
});

// ---- GET /api/leads (admin — list all leads) ----
router.get("/", requireJWT, requireRole("super_admin", "administrator", "sales_manager"), async (req, res) => {
  try {
    const contacts = await db.query("SELECT * FROM contact_requests ORDER BY created_at DESC LIMIT 100");
    const demos    = await db.query("SELECT * FROM demo_requests    ORDER BY created_at DESC LIMIT 100");
    const trials   = await db.query("SELECT * FROM trial_requests   ORDER BY created_at DESC LIMIT 100");
    res.json({ success: true, contacts: contacts.rows, demos: demos.rows, trials: trials.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch leads." });
  }
});

// ---- PATCH /api/leads/:id/status ----
router.patch("/:id/status", requireJWT, requireRole("super_admin", "administrator", "sales_manager"), async (req, res) => {
  const { status, notes } = req.body;
  try {
    await db.query(
      "UPDATE contact_requests SET status=$1, notes=$2, updated_at=NOW() WHERE id=$3",
      [xss(status), xss(notes || ""), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
});

module.exports = router;
