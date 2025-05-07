const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Update the first CSS block (Templates page and potentially others)
content = content.replace(
  /\.google-preview \{\s+max-width: 600px;\s+font-family: arial, sans-serif;\s+\}/g, 
  `.google-preview {
      margin-top: 20px;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #f9f9f9;
      max-width: 600px;
      font-family: arial, sans-serif;
    }`
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('CSS updated successfully.');
