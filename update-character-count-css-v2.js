const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Define the consistent character count CSS
const characterCountCSS = `
    .character-count {
      font-size: 12px;
      margin-bottom: 15px;
      color: #637381;
    }`;

// Define the consistent badge CSS
const badgeCSS = `
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

// Find collectionsHTML and insert/update the CSS
const collectionsHTMLPosition = content.indexOf('const collectionsHTML = `');
if (collectionsHTMLPosition \!== -1) {
  const collectionsStylePosition = content.indexOf('<style>', collectionsHTMLPosition);
  const collectionsStyleEndPosition = content.indexOf('</style>', collectionsStylePosition);
  
  if (collectionsStylePosition \!== -1 && collectionsStyleEndPosition \!== -1) {
    const stylesSection = content.substring(collectionsStylePosition, collectionsStyleEndPosition);
    
    // If character-count styles already exist, replace them
    if (stylesSection.includes('.character-count')) {
      const updatedStylesSection = stylesSection.replace(/\.character-count\s*\{[^}]*\}/g, characterCountCSS);
      content = content.replace(stylesSection, updatedStylesSection);
    } else {
      // If they don't exist, add them
      const newStylesSection = stylesSection + characterCountCSS;
      content = content.replace(stylesSection, newStylesSection);
    }
    
    // Same for badge styles
    if (stylesSection.includes('.badge {')) {
      const updatedStylesSection = content.substring(collectionsStylePosition, collectionsStyleEndPosition)
        .replace(/\.badge\s*\{[^}]*\}(?:\s*\.badge\.good\s*\{[^}]*\})?(?:\s*\.badge\.warning\s*\{[^}]*\})?(?:\s*\.badge\.bad\s*\{[^}]*\})?/g, badgeCSS);
      content = content.replace(content.substring(collectionsStylePosition, collectionsStyleEndPosition), updatedStylesSection);
    } else {
      // If they don't exist, add them
      const newStylesSection = content.substring(collectionsStylePosition, collectionsStyleEndPosition) + badgeCSS;
      content = content.replace(content.substring(collectionsStylePosition, collectionsStyleEndPosition), newStylesSection);
    }
  }
}

// Find productsHTML and insert/update the CSS
const productsHTMLPosition = content.indexOf('const productsHTML = `');
if (productsHTMLPosition \!== -1) {
  const productsStylePosition = content.indexOf('<style>', productsHTMLPosition);
  const productsStyleEndPosition = content.indexOf('</style>', productsStylePosition);
  
  if (productsStylePosition \!== -1 && productsStyleEndPosition \!== -1) {
    const stylesSection = content.substring(productsStylePosition, productsStyleEndPosition);
    
    // If character-count styles already exist, replace them
    if (stylesSection.includes('.character-count')) {
      const updatedStylesSection = stylesSection.replace(/\.character-count\s*\{[^}]*\}/g, characterCountCSS);
      content = content.replace(stylesSection, updatedStylesSection);
    } else {
      // If they don't exist, add them
      const newStylesSection = stylesSection + characterCountCSS;
      content = content.replace(stylesSection, newStylesSection);
    }
    
    // Same for badge styles
    if (stylesSection.includes('.badge {')) {
      const updatedStylesSection = content.substring(productsStylePosition, productsStyleEndPosition)
        .replace(/\.badge\s*\{[^}]*\}(?:\s*\.badge\.good\s*\{[^}]*\})?(?:\s*\.badge\.warning\s*\{[^}]*\})?(?:\s*\.badge\.bad\s*\{[^}]*\})?/g, badgeCSS);
      content = content.replace(content.substring(productsStylePosition, productsStyleEndPosition), updatedStylesSection);
    } else {
      // If they don't exist, add them
      const newStylesSection = content.substring(productsStylePosition, productsStyleEndPosition) + badgeCSS;
      content = content.replace(content.substring(productsStylePosition, productsStyleEndPosition), newStylesSection);
    }
  }
}

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Character count and badge CSS updated successfully across all pages.');
