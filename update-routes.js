const fs = require('fs');
const path = require('path');

// Path to server/index.js
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// Add the require statement for the React renderer
const requireRendererCode = `const { 
  renderHomePage, 
  renderCollectionsPage, 
  renderProductsPage, 
  renderMetafieldsPage, 
  renderTemplatesPage 
} = require('./renderReact');`;

// Insert the require statement after other requires
serverFileContent = serverFileContent.replace(
  /const router = express\.Router\(\);/,
  `const router = express.Router();\n\n// React renderer for server-side rendering\n${requireRendererCode}`
);

// Update the root route to use React rendering
serverFileContent = serverFileContent.replace(
  /res\.send\(dashboardHTML\);/g,
  'res.send(renderHomePage());'
);

// Update the templates route
serverFileContent = serverFileContent.replace(
  /app\.get\('\/templates', \(req, res\) => {\s*\/\/ For a real implementation, this would check for authentication\s*res\.send\(templatesHTML\);/g,
  `app.get('/templates', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderTemplatesPage());`
);

// Update the collections route
serverFileContent = serverFileContent.replace(
  /app\.get\('\/collections', \(req, res\) => {\s*\/\/ For a real implementation, this would check for authentication\s*res\.send\(collectionsHTML\);/g,
  `app.get('/collections', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderCollectionsPage());`
);

// Update the products route
serverFileContent = serverFileContent.replace(
  /app\.get\('\/products', \(req, res\) => {\s*\/\/ For a real implementation, this would check for authentication\s*res\.send\(productsHTML\);/g,
  `app.get('/products', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderProductsPage());`
);

// Update the homepage route
serverFileContent = serverFileContent.replace(
  /app\.get\('\/homepage', \(req, res\) => {\s*\/\/ For a real implementation, this would check for authentication\s*res\.send\(homepageHTML\);/g,
  `app.get('/homepage', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderHomePage());`
);

// Add a new route for metafields
const metafieldsRoute = `
// Metafields route
app.get('/metafields', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderMetafieldsPage());
});
`;

// Add the metafields route after the products route
serverFileContent = serverFileContent.replace(
  /app\.get\('\/products', \(req, res\) => {[\s\S]+?}\);/,
  (match) => `${match}\n${metafieldsRoute}`
);

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');

console.log('Server routes updated to use React renderer.');