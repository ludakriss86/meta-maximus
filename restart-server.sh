#!/bin/bash

# Clear terminal
clear

echo "=== Meta Maximus Server Restart ==="
echo "Stopping any running servers..."

# Find and kill any running Node.js processes for the server
pkill -f "node.*server/index.js" || echo "No server running"

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
npm run dev