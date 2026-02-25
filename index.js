#!/usr/bin/env node

/**
 * Entry point for Render deployment
 * Starts the Express backend server
 */

const path = require("path");

// Ensure we're in the right working directory
process.chdir(path.join(__dirname));

// Start the backend server
try {
  require("./backend/server.js");
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}

