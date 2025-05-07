#!/bin/bash

echo "===== Meta Maximus with Variable Buttons ====="

# Stop any running server instances
echo "Stopping running servers..."
pkill -f "node.*server/index.js" || echo "No server was running"
pkill -f "node.*test-server.js" || echo "No test server was running"

# Make sure we use PORT=3001 in our environment
echo "Making sure PORT is set to 3001..."
export PORT=3001

# Start the server with the correct PORT
echo "Starting server on port $PORT..."
NODE_ENV=development node server/index.js &

# Sleep for a moment to let the server start
sleep 2

# Open the collections and products pages in the default browser
echo "Opening collections page in browser..."
open http://localhost:3001/collections

echo "Opening products page in browser..."
open http://localhost:3001/products

echo "Server started! Press Ctrl+C to stop when done."

# Wait for user to press Ctrl+C
wait