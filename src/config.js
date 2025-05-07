/**
 * Common configuration settings for Meta Maximus
 * This ensures consistent port usage throughout the application
 */

require('dotenv').config();

// Default port that will be used if not specified in .env
const DEFAULT_PORT = 3001;

// Get port from environment or use default
const PORT = process.env.PORT || DEFAULT_PORT;

module.exports = {
  PORT,
  DEFAULT_PORT,
  HOST: process.env.HOST || `localhost:${PORT}`
};