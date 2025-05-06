#!/bin/bash

echo "===== Meta Maximus Server Restart with React SSR ====="

# Stop any running server instances
echo "Stopping running servers..."
pkill -f "node.*server/index.js" || echo "No server was running"

# Install new dependencies
echo "Installing dependencies..."
npm install

# Clear cache
echo "Clearing cache..."
rm -rf node_modules/.cache

# Set the environment variable for React
export NODE_ENV=development
export PORT=3001

echo "Starting server with React SSR on port $PORT..."
npm run dev