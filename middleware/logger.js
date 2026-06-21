"use strict";

const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "logs/error.log",  level: "error" }),
    new winston.transports.File({ filename: "logs/access.log" }),
  ],
});

// Express request logging middleware
logger.requestMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.path} ${res.statusCode} — ${Date.now() - start}ms`, {
      ip:        req.ip,
      userAgent: req.headers["user-agent"],
    });
  });
  next();
};

module.exports = logger;
