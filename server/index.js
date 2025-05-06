require('dotenv').config();
const express = require('express');
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
const { join } = require('path');
const { createRequestHandler } = require('@remix-run/express');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Shopify API
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(','),
  HOST_NAME: process.env.HOST || `localhost:${port}`,
  API_VERSION: ApiVersion.January24,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Middleware
app.use(express.json());

// API Routes
app.use('/api', require('./routes/api'));

// Serve static assets from the public folder
app.use(express.static(join(__dirname, '..', 'public')));

// For all other requests, serve the Remix app
app.all(
  '*',
  createRequestHandler({
    build: require('../build'),
  })
);

// Start server
app.listen(port, () => {
  console.log(`Meta Maximus app listening at http://localhost:${port}`);
});