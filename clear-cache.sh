#!/bin/bash

# Stop any running server
pkill -f "node.*server/index.js"

# Clear Node.js cache
rm -rf node_modules/.cache

# Rebuild the application
npm run build

# Start the server in development mode
npm run dev
