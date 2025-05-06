#!/bin/bash

echo "===== Meta Maximus Test Server ====="

# Stop any running server instances
echo "Stopping running servers..."
pkill -f "node.*server/index.js" || echo "No main server was running"
pkill -f "node.*test-server.js" || echo "No test server was running"

# Set the environment variable for React
export NODE_ENV=development
export PORT=3001

echo "Starting test server on port $PORT..."
node test-server.js