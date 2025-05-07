const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Define the consistent character count and badge CSS
const badgeCSS = `.character-count {
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

// Look for style tags in products and collections HTML templates
const productsStyleRegex = /(const productsHTML = `[\s\S]*?<style>)([\s\S]*?)(<\/style>)/;
const collectionsStyleRegex = /(const collectionsHTML = `[\s\S]*?<style>)([\s\S]*?)(<\/style>)/;

// Replace or add the .character-count and .badge CSS in productsHTML
if (productsStyleRegex.test(content)) {
  content = content.replace(productsStyleRegex, (match, start, styles, end) => {
    // Remove existing character-count and badge styles
    let cleanedStyles = styles.replace(/\.character-count\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\.good\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\.warning\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\.bad\s*\{[\s\S]*?\}/g, '');
    
    // Add the consistent styles
    return `${start}${cleanedStyles}\n    ${badgeCSS}${end}`;
  });
}

// Replace or add the .character-count and .badge CSS in collectionsHTML
if (collectionsStyleRegex.test(content)) {
  content = content.replace(collectionsStyleRegex, (match, start, styles, end) => {
    // Remove existing character-count and badge styles
    let cleanedStyles = styles.replace(/\.character-count\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\.good\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\.warning\s*\{[\s\S]*?\}/g, '');
    cleanedStyles = cleanedStyles.replace(/\.badge\.bad\s*\{[\s\S]*?\}/g, '');
    
    // Add the consistent styles
    return `${start}${cleanedStyles}\n    ${badgeCSS}${end}`;
  });
}

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Character count and badge CSS updated successfully across all pages.');
