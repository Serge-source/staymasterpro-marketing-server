/**
 * StayMaster Pro — Express Server
 * Serves the marketing site (static) and provides the admin API.
 *
 * Deployment: Node.js 18+ on Render, Railway, or HostGator VPS.
 * Set environment variables in .env (see .env.example).
 */

"use strict";

require("dotenv").config();

const express    = require("express");
const helmet     = require("helmet");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");
const session    = require("express-session");
const path       = require("path");
const logger     = require("./middleware/logger");

// Route handlers
const authRoutes     = require("./routes/auth");
const cmsRoutes      = require("./routes/cms");
const leadsRoutes    = require("./routes/leads");
const adminRoutes    = require("./routes/admin");
const bookingRoutes  = require("./routes/bookings");

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet sets security-related HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://unpkg.com"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      frameSrc:   ["https://www.youtube.com", "https://youtube.com"],
    },
  },
}));

// CORS — restrict to your production domain in production
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  credentials: true,
}));

// Parse JSON + URL-encoded bodies
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Session (used for CSRF + admin login state)
app.use(session({
  secret:            process.env.SESSION_SECRET || "change-me-in-production",
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
  },
}));

// Request logger
app.use(logger.requestMiddleware);

// ============================================================
// RATE LIMITING
// ============================================================

// Strict limit for login endpoint — prevents brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: "Too many login attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
});

// General API limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      60,
  message:  { success: false, message: "Rate limit exceeded. Please slow down." },
});

app.use("/api/admin/login", loginLimiter);
app.use("/api/",            apiLimiter);

// ============================================================
// STATIC FILES — Marketing Site
// ============================================================

// Serve public marketing site from the parent directory
const publicDir = path.join(__dirname, process.env.PUBLIC_DIR || "..");
app.use(express.static(publicDir, {
  index: "index.html",
  // Do NOT serve the admin folder as static — handled via dedicated route below
  setHeaders: (res, filePath) => {
    // Prevent caching of HTML files
    if (filePath.endsWith(".html")) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    }
  },
}));

// ============================================================
// ADMIN PORTAL — Protected static files
// Served only after authentication check via middleware
// ============================================================

const { requireAdminSession } = require("./middleware/auth");

// The admin login page is publicly accessible (it IS the gate)
app.get("/secure-admin/login", (req, res) => {
  res.sendFile(path.join(publicDir, "admin", "login.html"));
});
app.get("/admin/login",        (req, res) => {
  res.sendFile(path.join(publicDir, "admin", "login.html"));
});

// Dashboard and all other /secure-admin/* routes require a valid session
app.use("/secure-admin", requireAdminSession, express.static(path.join(publicDir, "admin")));
app.use("/admin",        requireAdminSession, express.static(path.join(publicDir, "admin")));

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/admin",    authRoutes);    // login, logout, 2FA
app.use("/api/cms",      cmsRoutes);    // branding, pricing, features, FAQ, SEO
app.use("/api/leads",    leadsRoutes);  // contact form, demo requests, trial signups
app.use("/api/secure",   adminRoutes);  // customers, billing, chatbot, audit logs
app.use("/api/bookings", bookingRoutes); // demo booking calendar

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================================
// SPA FALLBACK — return index.html for unknown routes
// (Keeps deep-linking working if you add client-side routing later)
// ============================================================

app.get("*", (req, res) => {
  // Do NOT serve index.html for /api or /secure-admin miss
  if (req.path.startsWith("/api/") || req.path.startsWith("/secure-admin/")) {
    return res.status(404).json({ success: false, message: "Not found." });
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  // Never leak stack traces in production
  const message = process.env.NODE_ENV === "production"
    ? "An unexpected error occurred."
    : err.message;

  res.status(err.status || 500).json({ success: false, message });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`✅  StayMaster Pro server running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Admin panel : http://localhost:${PORT}/secure-admin/login`);
});

module.exports = app;
