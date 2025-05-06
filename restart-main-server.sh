#!/bin/bash

echo "===== Meta Maximus Main Server Restart ====="

# Stop any running server instances
echo "Stopping running servers..."
pkill -f "node.*server/index.js" || echo "No server was running"
pkill -f "node.*test-server.js" || echo "No test server was running"

# Clear Node.js cache
echo "Cleaning cache..."
rm -rf node_modules/.cache

# Make sure we use PORT=3001 in our environment
echo "Making sure PORT is set to 3001..."
export PORT=3001

# Display the current PORT setting
echo "Current PORT setting: $PORT"

# Start the server with the correct PORT
echo "Starting server on port $PORT..."
NODE_ENV=development node server/index.js