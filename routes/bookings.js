"use strict";

const express = require("express");
const xss     = require("xss");
const { v4: uuidv4 } = require("uuid");
const db      = require("../db/pool");
const logger  = require("../middleware/logger");
const { requireJWT, requireRole } = require("../middleware/auth");

const router = express.Router();

// ---- Config ----
// Available days: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri (0=Sun, 6=Sat)
const AVAILABLE_DAYS  = [1, 2, 3, 4, 5];
const SLOT_START_HOUR = 9;   // 9am
const SLOT_END_HOUR   = 17;  // 5pm (last slot at 4:30)
const SLOT_DURATION   = 30;  // minutes
const BOOKING_WINDOW  = 30;  // days ahead available for booking
const MAX_PER_SLOT    = 1;   // max concurrent bookings per slot

function sanitize(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" ? xss(v.trim()) : v;
  }
  return out;
}

function generateConfirmationNo() {
  return "SMP-" + Math.random().toString(36).toUpperCase().slice(2, 8);
}

// Build all slots for a given date (HH:MM strings)
function buildSlots() {
  const slots = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    }
  }
  return slots;
}

// ---- GET /api/bookings/availability?month=YYYY-MM ----
router.get("/availability", async (req, res) => {
  try {
    const { month } = req.query; // e.g. "2026-06"
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + BOOKING_WINDOW);

    // Parse requested month or default to current
    let startDate = month ? new Date(`${month}-01`) : new Date(today);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // last day of month

    // Fetch existing bookings in range
    const existing = await db.query(
      `SELECT booked_date, booked_slot, COUNT(*) as cnt
       FROM demo_bookings
       WHERE booked_date >= $1 AND booked_date <= $2 AND status != 'cancelled'
       GROUP BY booked_date, booked_slot`,
      [startDate.toISOString().split("T")[0], endDate.toISOString().split("T")[0]]
    );

    // Build booked map: { "2026-06-25": { "10:00": 1, ... } }
    const booked = {};
    for (const row of existing.rows) {
      const d = row.booked_date.toISOString().split("T")[0];
      if (!booked[d]) booked[d] = {};
      booked[d][row.booked_slot] = parseInt(row.cnt);
    }

    const allSlots = buildSlots();
    const availability = {};

    // Iterate each day in month
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateStr = cur.toISOString().split("T")[0];
      const dow = cur.getDay();

      if (AVAILABLE_DAYS.includes(dow) && cur >= today && cur <= windowEnd) {
        const dayBooked = booked[dateStr] || {};
        const slots = allSlots.map(slot => ({
          slot,
          available: (dayBooked[slot] || 0) < MAX_PER_SLOT,
        }));
        const hasAny = slots.some(s => s.available);
        if (hasAny) availability[dateStr] = slots;
      }

      cur.setDate(cur.getDate() + 1);
    }

    res.json({ success: true, availability });
  } catch (err) {
    logger.error("Availability fetch error", { err: err.message });
    res.status(500).json({ success: false, message: "Could not fetch availability." });
  }
});

// ---- POST /api/bookings ----
router.post("/", async (req, res) => {
  const data = sanitize(req.body);
  const { fullName, email, phone, company, numProperties, date, slot, timezone } = data;

  if (!fullName || !email || !date || !slot) {
    return res.status(400).json({ success: false, message: "Name, email, date and time slot are required." });
  }

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address." });
  }

  // Validate date is a weekday within booking window
  const bookDate = new Date(date + "T00:00:00Z");
  const today    = new Date(); today.setHours(0,0,0,0);
  const windowEnd = new Date(today); windowEnd.setDate(windowEnd.getDate() + BOOKING_WINDOW);
  const dow = bookDate.getUTCDay();

  if (!AVAILABLE_DAYS.includes(dow)) {
    return res.status(400).json({ success: false, message: "Selected day is not available." });
  }
  if (bookDate < today || bookDate > windowEnd) {
    return res.status(400).json({ success: false, message: "Date is outside the booking window." });
  }

  // Validate slot format
  if (!/^\d{2}:\d{2}$/.test(slot) || !buildSlots().includes(slot)) {
    return res.status(400).json({ success: false, message: "Invalid time slot." });
  }

  try {
    // Check slot still available
    const check = await db.query(
      `SELECT COUNT(*) as cnt FROM demo_bookings
       WHERE booked_date=$1 AND booked_slot=$2 AND status != 'cancelled'`,
      [date, slot]
    );
    if (parseInt(check.rows[0].cnt) >= MAX_PER_SLOT) {
      return res.status(409).json({ success: false, message: "This slot was just taken. Please choose another time." });
    }

    const confirmNo = generateConfirmationNo();
    await db.query(
      `INSERT INTO demo_bookings
         (id, full_name, email, phone, company, num_properties, booked_date, booked_slot, timezone, confirmation_no, ip_address, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [uuidv4(), fullName, email, phone || null, company || null, numProperties || null,
       date, slot, timezone || "America/New_York", confirmNo, req.ip]
    );

    logger.info(`Demo booked by ${email} on ${date} at ${slot} — ${confirmNo}`);
    res.json({
      success: true,
      message: "Demo booked successfully!",
      confirmation: confirmNo,
      date,
      slot,
    });
  } catch (err) {
    logger.error("Booking error", { err: err.message });
    res.status(500).json({ success: false, message: "Could not complete booking. Please try again." });
  }
});

// ---- DELETE /api/bookings/:id (cancel) ----
router.delete("/:id", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await db.query(
      `UPDATE demo_bookings SET status='cancelled', updated_at=NOW()
       WHERE (id=$1 OR confirmation_no=$1) AND email=$2 AND status='confirmed'
       RETURNING id`,
      [req.params.id, email]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found or already cancelled." });
    }
    res.json({ success: true, message: "Booking cancelled successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not cancel booking." });
  }
});

// ---- GET /api/bookings (admin) ----
router.get("/", requireJWT, requireRole("super_admin","administrator","sales_manager"), async (req, res) => {
  try {
    const { status, from, to } = req.query;
    let q = "SELECT * FROM demo_bookings WHERE 1=1";
    const params = [];
    if (status) { params.push(status); q += ` AND status=$${params.length}`; }
    if (from)   { params.push(from);   q += ` AND booked_date>=$${params.length}`; }
    if (to)     { params.push(to);     q += ` AND booked_date<=$${params.length}`; }
    q += " ORDER BY booked_date ASC, booked_slot ASC LIMIT 200";
    const result = await db.query(q, params);
    res.json({ success: true, bookings: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not fetch bookings." });
  }
});

// ---- PATCH /api/bookings/:id (admin update) ----
router.patch("/:id", requireJWT, requireRole("super_admin","administrator","sales_manager"), async (req, res) => {
  const { status, notes } = req.body;
  try {
    await db.query(
      "UPDATE demo_bookings SET status=$1, notes=$2, updated_at=NOW() WHERE id=$3",
      [xss(status), xss(notes || ""), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
});

module.exports = router;
