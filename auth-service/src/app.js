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

// Helmet - Set security headers
app.use(helmet());

// CORS - Enable cross-origin requests
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
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
