/**
 * Server Entry Point
 * Start Express server and initialize connections
 */

require("dotenv").config();
const app = require("./app");
const { testConnection, closePool } = require("./config/database");
const { connectRedis, closeRedis } = require("./config/redis");

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

let server;

/**
 * Start server
 */
const startServer = async () => {
  try {
    console.log("========================================");
    console.log(`Starting Auth Service in ${NODE_ENV} mode...`);
    console.log("========================================");

    // Test database connection
    console.log("\n1. Testing database connection...");
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Database connection failed");
    }

    // Connect to Redis
    console.log("\n2. Connecting to Redis...");
    await connectRedis();

    // Start Express server
    console.log(`\n3. Starting Express server on port ${PORT}...`);
    server = app.listen(PORT, () => {
      console.log("\n========================================");
      console.log(`✓ Auth Service running on port ${PORT}`);
      console.log(`✓ Environment: ${NODE_ENV}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log("========================================\n");
    });
  } catch (error) {
    console.error("\n✗ Failed to start server:", error.message);
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    if (server) {
      server.close(() => {
        console.log("✓ Express server closed");
      });
    }

    // Close database connection
    await closePool();
    console.log("✓ Database pool closed");

    // Close Redis connection
    await closeRedis();
    console.log("✓ Redis connection closed");

    console.log("\n✓ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error during shutdown:", error.message);
    process.exit(1);
  }
};

/**
 * Handle uncaught exceptions
 */
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(error);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(error);
  process.exit(1);
});

/**
 * Handle termination signals
 */
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start the server
startServer();
