const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Replace "badge gray" with "badge warning" everywhere in the file
content = content.replace(/badge gray/g, 'badge warning');

// Replace "badge ' + badgeClass" with "warning" where badgeClass = 'gray'
content = content.replace(/const badgeElement = row\.querySelector\('\.badge'\);\s+badgeElement\.className = 'badge ' \+ badgeClass;/g, 
  `const badgeElement = row.querySelector('.badge');
      badgeElement.className = badgeClass === 'gray' ? 'badge warning' : 'badge ' + badgeClass;`);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Badge colors updated successfully from gray to warning (yellow).');
