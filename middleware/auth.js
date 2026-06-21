"use strict";

const jwt    = require("jsonwebtoken");
const logger = require("./logger");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

/**
 * Verify JWT from Authorization header (Bearer token).
 * Used to protect admin API routes.
 */
function requireJWT(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin     = payload;
    next();
  } catch (err) {
    logger.warn(`JWT verification failed: ${err.message}`, { ip: req.ip });
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

/**
 * Check session-based admin login (for serving protected HTML pages).
 */
function requireAdminSession(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  // Redirect to login page
  res.redirect("/secure-admin/login");
}

/**
 * Role-based access control factory.
 * Usage: requireRole("super_admin", "administrator")
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }
    if (!roles.includes(req.admin.role)) {
      logger.warn(`Unauthorized role access: user ${req.admin.id} (${req.admin.role}) attempted ${roles.join("/")}`, { ip: req.ip });
      return res.status(403).json({ success: false, message: "Insufficient permissions." });
    }
    next();
  };
}

module.exports = { requireJWT, requireAdminSession, requireRole };
