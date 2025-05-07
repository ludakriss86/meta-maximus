const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// First, let's see if there's an existing consistent style for character-count in the homepageHTML
// If one exists, we'll extract it and apply it to the other pages
const consistentCharacterCountCSS = `
    .character-count {
      font-size: 12px;
      margin-bottom: 15px;
      color: #637381;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .badge.good {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }
    .badge.bad {
      background: #ffd2d2;
      color: #bf0711;
    }`;

// Update existing style sections in the HTML template strings
// Products and Collections pages likely have different CSS for character-count
// We'll find and replace them to ensure consistency

// For the styles in collectionsHTML
content = content.replace(
  /\.character-count\s*\{[^}]*\}(?:\s*\.badge\s*\{[^}]*\})?(?:\s*\.badge\.good\s*\{[^}]*\})?(?:\s*\.badge\.warning\s*\{[^}]*\})?(?:\s*\.badge\.bad\s*\{[^}]*\})?/g,
  consistentCharacterCountCSS
);

// For the styles in productsHTML
content = content.replace(
  /\.character-count\s*\{[^}]*\}(?:\s*\.badge\s*\{[^}]*\})?(?:\s*\.badge\.good\s*\{[^}]*\})?(?:\s*\.badge\.warning\s*\{[^}]*\})?(?:\s*\.badge\.bad\s*\{[^}]*\})?/g,
  consistentCharacterCountCSS
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Character count and badge CSS updated successfully across all pages.');
