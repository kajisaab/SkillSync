/**
 * Express Application Setup
 * Configure Express app with middleware and routes
 */

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const { healthCheck } = require("./controller/auth.controller");
const {
  notFoundHandler,
  errorHandler,
} = require("./middlewares/error.middleware");

// Create Express app
const app = express();

// Helmet - Set security headers (with CORS-friendly settings)
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" },
//   crossOriginOpenerPolicy: { policy: "unsafe-none" },
// }));

// CORS - Enable cross-origin requests
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  }),
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", healthCheck);

app.use("/api/auth", authRoutes);

app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

module.exports = app;
