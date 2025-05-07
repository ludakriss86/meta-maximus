/**
 * Logging Service for Meta Maximus
 * 
 * Centralized logging functionality with different log levels and formatting
 */

const fs = require('fs');
const path = require('path');
const { EOL } = require('os');

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Default log level from environment or INFO
const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

// Determine if we're running on Heroku
const isHeroku = process.env.DYNO ? true : false;

// Log file paths - only used when not on Heroku
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');
const DB_LOG_FILE = path.join(LOG_DIR, 'database.log');

// Performance metrics
const metrics = {
  dbOperations: {
    count: 0,
    totalDuration: 0,
    maxDuration: 0
  },
  errors: {
    count: 0,
    byCategory: {}
  }
};

/**
 * Initialize the logger
 */
function initialize() {
  // On Heroku, we don't need to create log directories
  // as we'll be logging to stdout/stderr
  if (!isHeroku) {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(LOG_DIR)) {
      try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      } catch (error) {
        console.error('Failed to create log directory:', error);
      }
    }
  }
}

/**
 * Format a log message
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata
 * @returns {string} Formatted log message
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length 
    ? JSON.stringify(meta) 
    : '';
    
  return `[${timestamp}] [${level}] ${message}${metaStr ? ' ' + metaStr : ''}`;
}

/**
 * Write to log file
 * 
 * @param {string} filePath - Path to log file
 * @param {string} message - Log message
 */
function writeToFile(filePath, message) {
  // Skip file writing on Heroku
  if (isHeroku) {
    return;
  }
  
  try {
    fs.appendFileSync(filePath, message + EOL);
  } catch (error) {
    console.error(`Failed to write to log file ${filePath}:`, error);
  }
}

/**
 * Log an error message
 * 
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or metadata
 */
function error(message, error = {}) {
  if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
    const meta = error instanceof Error 
      ? { 
          message: error.message, 
          stack: error.stack,
          code: error.code
        }
      : error;
      
    const formattedMessage = formatLog('ERROR', message, meta);
    
    // Increment error counter
    metrics.errors.count++;
    
    // Track error by category if available
    if (meta.category) {
      metrics.errors.byCategory[meta.category] = (metrics.errors.byCategory[meta.category] || 0) + 1;
    }
    
    // Log to console and files
    console.error(formattedMessage);
    writeToFile(LOG_FILE, formattedMessage);
    writeToFile(ERROR_LOG_FILE, formattedMessage);
  }
}

/**
 * Log a warning message
 * 
 * @param {string} message - Warning message
 * @param {Object} meta - Additional metadata
 */
function warn(message, meta = {}) {
  if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.WARN) {
    const formattedMessage = formatLog('WARN', message, meta);
    
    // Log to console and file
    console.warn(formattedMessage);
    writeToFile(LOG_FILE, formattedMessage);
  }
}

/**
 * Log an info message
 * 
 * @param {string} message - Info message
 * @param {Object} meta - Additional metadata
 */
function info(message, meta = {}) {
  if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.INFO) {
    const formattedMessage = formatLog('INFO', message, meta);
    
    // Log to console and file
    console.log(formattedMessage);
    writeToFile(LOG_FILE, formattedMessage);
  }
}

/**
 * Log a debug message
 * 
 * @param {string} message - Debug message
 * @param {Object} meta - Additional metadata
 */
function debug(message, meta = {}) {
  if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    const formattedMessage = formatLog('DEBUG', message, meta);
    
    // Log to console and file
    console.log(formattedMessage);
    writeToFile(LOG_FILE, formattedMessage);
  }
}

/**
 * Log a database operation
 * 
 * @param {string} operation - Operation name
 * @param {Object} details - Operation details
 * @param {number} duration - Operation duration in milliseconds
 */
function dbOperation(operation, details = {}, duration = 0) {
  // Update metrics
  metrics.dbOperations.count++;
  metrics.dbOperations.totalDuration += duration;
  
  if (duration > metrics.dbOperations.maxDuration) {
    metrics.dbOperations.maxDuration = duration;
  }
  
  // Format and log the message
  const meta = {
    ...details,
    durationMs: duration
  };
  
  const formattedMessage = formatLog('DB', operation, meta);
  
  // Log to console based on level and to DB log file
  if (DEFAULT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log(formattedMessage);
  }
  
  writeToFile(DB_LOG_FILE, formattedMessage);
}

/**
 * Get current metrics
 * 
 * @returns {Object} Current metrics
 */
function getMetrics() {
  // Calculate averages
  const avgDuration = metrics.dbOperations.count > 0
    ? metrics.dbOperations.totalDuration / metrics.dbOperations.count
    : 0;
    
  return {
    ...metrics,
    dbOperations: {
      ...metrics.dbOperations,
      avgDuration
    },
    timestamp: new Date().toISOString()
  };
}

// Initialize logger
initialize();

module.exports = {
  LOG_LEVELS,
  error,
  warn,
  info,
  debug,
  dbOperation,
  getMetrics
};