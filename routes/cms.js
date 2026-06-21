"use strict";

const express = require("express");
const xss     = require("xss");
const { v4: uuidv4 } = require("uuid");
const db      = require("../db/pool");
const { requireJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

// All CMS routes require at minimum administrator role
const adminAuth = [requireJWT, requireRole("super_admin", "administrator", "marketing_manager")];

// ---- GET /api/cms/settings ----
router.get("/settings", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM website_settings ORDER BY setting_key");
    const settings = {};
    result.rows.forEach(row => { settings[row.setting_key] = row.setting_value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load settings." });
  }
});

// ---- PUT /api/cms/settings ----
router.put("/settings", ...adminAuth, async (req, res) => {
  const updates = req.body; // { key: value, ... }
  try {
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        `INSERT INTO website_settings (id, setting_key, setting_value, updated_at)
         VALUES ($1,$2,$3,NOW())
         ON CONFLICT (setting_key) DO UPDATE SET setting_value=$3, updated_at=NOW()`,
        [uuidv4(), xss(key), xss(String(value))]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not save settings." });
  }
});

// ---- GET /api/cms/pricing ----
router.get("/pricing", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM pricing_plans ORDER BY sort_order");
    res.json({ success: true, plans: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load pricing." });
  }
});

// ---- POST /api/cms/pricing ----
router.post("/pricing", ...adminAuth, async (req, res) => {
  const { name, price, description, properties, features, isPopular } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO pricing_plans (id, name, price, description, properties, features, is_popular, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW()) RETURNING *`,
      [uuidv4(), xss(name), xss(price), xss(description), xss(properties), JSON.stringify(features || []), !!isPopular]
    );
    res.json({ success: true, plan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not create plan." });
  }
});

// ---- PUT /api/cms/pricing/:id ----
router.put("/pricing/:id", ...adminAuth, async (req, res) => {
  const { name, price, description, properties, features, isPopular, isActive } = req.body;
  try {
    await db.query(
      `UPDATE pricing_plans SET name=$1, price=$2, description=$3, properties=$4,
       features=$5, is_popular=$6, is_active=$7, updated_at=NOW() WHERE id=$8`,
      [xss(name), xss(price), xss(description), xss(properties), JSON.stringify(features), !!isPopular, !!isActive, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not update plan." });
  }
});

// ---- DELETE /api/cms/pricing/:id ----
router.delete("/pricing/:id", requireJWT, requireRole("super_admin", "administrator"), async (req, res) => {
  try {
    await db.query("UPDATE pricing_plans SET is_active=false WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not delete plan." });
  }
});

// ---- GET/POST/PUT/DELETE /api/cms/faq ----
router.get("/faq", async (req, res) => {
  const result = await db.query("SELECT * FROM faq WHERE is_active=true ORDER BY sort_order").catch(() => ({ rows: [] }));
  res.json({ success: true, faq: result.rows });
});

router.post("/faq", ...adminAuth, async (req, res) => {
  const { question, answer } = req.body;
  const result = await db.query(
    "INSERT INTO faq (id, question, answer, is_active, created_at) VALUES ($1,$2,$3,true,NOW()) RETURNING *",
    [uuidv4(), xss(question), xss(answer)]
  ).catch(err => { res.status(500).json({ success:false, message: err.message }); return null; });
  if (result) res.json({ success: true, item: result.rows[0] });
});

router.put("/faq/:id", ...adminAuth, async (req, res) => {
  const { question, answer } = req.body;
  await db.query("UPDATE faq SET question=$1, answer=$2, updated_at=NOW() WHERE id=$3", [xss(question), xss(answer), req.params.id]);
  res.json({ success: true });
});

router.delete("/faq/:id", ...adminAuth, async (req, res) => {
  await db.query("UPDATE faq SET is_active=false WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

// ---- GET/POST/PUT/DELETE /api/cms/testimonials ----
router.get("/testimonials", async (req, res) => {
  const result = await db.query("SELECT * FROM testimonials WHERE is_active=true ORDER BY sort_order").catch(() => ({ rows: [] }));
  res.json({ success: true, testimonials: result.rows });
});

router.post("/testimonials", ...adminAuth, async (req, res) => {
  const { name, role, text, stars } = req.body;
  const result = await db.query(
    "INSERT INTO testimonials (id, name, role, text, stars, is_active, created_at) VALUES ($1,$2,$3,$4,$5,true,NOW()) RETURNING *",
    [uuidv4(), xss(name), xss(role), xss(text), parseInt(stars) || 5]
  ).catch(err => { res.status(500).json({ success:false, message: err.message }); return null; });
  if (result) res.json({ success: true, item: result.rows[0] });
});

module.exports = router;
