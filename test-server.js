const express = require('express');
const path = require('path');

// Create a simple Express server
const app = express();
const port = 3001;

// Import our renderReact module
const {
  renderHomePage,
  renderCollectionsPage,
  renderProductsPage,
  renderMetafieldsPage,
  renderTemplatesPage
} = require('./server/renderReact');

// Set up routes
app.get('/', (req, res) => {
  res.send(renderHomePage());
});

app.get('/collections', (req, res) => {
  res.send(renderCollectionsPage());
});

app.get('/products', (req, res) => {
  res.send(renderProductsPage());
});

app.get('/metafields', (req, res) => {
  res.send(renderMetafieldsPage());
});

app.get('/templates', (req, res) => {
  res.send(renderTemplatesPage());
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(port, () => {
  console.log(`Test server is running on http://localhost:${port}`);
  console.log('Available routes:');
  console.log('  - / (home)');
  console.log('  - /collections');
  console.log('  - /products');
  console.log('  - /metafields');
  console.log('  - /templates');
});