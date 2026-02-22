// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Logger (Winston)
//  Structured logging with file rotation for audit trail
// ═══════════════════════════════════════════════════════════════════════════════

const winston = require("winston");
const path = require("path");
const config = require("../config");
const fs = require("fs");

// Ensure logs directory exists
if (!fs.existsSync(config.logsPath)) {
  fs.mkdirSync(config.logsPath, { recursive: true });
}

const logger = winston.createLogger({
  level: config.isDev ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "kairos-backend" },
  transports: [
    // ── All logs ──────────────────────────────────────────
    new winston.transports.File({
      filename: path.join(config.logsPath, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),

    // ── Error logs only ──────────────────────────────────
    new winston.transports.File({
      filename: path.join(config.logsPath, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),

    // ── Mint/Burn audit trail (CRITICAL — never delete) ──
    new winston.transports.File({
      filename: path.join(config.logsPath, "audit.log"),
      level: "info",
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 50,
    }),
  ],
});

// Console output in development
if (config.isDev) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 1
            ? ` ${JSON.stringify(meta, null, 0)}`
            : "";
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      ),
    })
  );
} else {
  // Minimal console in production
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}] ${message}`;
        })
      ),
    })
  );
}

module.exports = logger;
