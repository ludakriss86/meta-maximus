const fs = require('fs');
const path = require('path');

// Define the file path
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Create a function to update the styles in a template
function updateStyles(templateVariableName) {
  // Find the template variable
  const templateStart = content.indexOf(`const ${templateVariableName} = \``);
  if (templateStart === -1) {
    console.log(`Template ${templateVariableName} not found`);
    return;
  }
  
  // Find the style section
  const styleStart = content.indexOf('<style>', templateStart);
  const styleEnd = content.indexOf('</style>', styleStart);
  if (styleStart === -1 || styleEnd === -1) {
    console.log(`Style section not found in ${templateVariableName}`);
    return;
  }
  
  // Get the style section
  const styleSection = content.substring(styleStart, styleEnd);
  
  // Look for the gray badge class and replace with warning
  // This is a backup in case the previous script missed any
  let updatedStyleSection = styleSection.replace(/\.badge\.gray\s*{[\s\S]*?}/g, 
    `.badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }`);
  
  // Update the content
  content = content.substring(0, styleStart) + updatedStyleSection + content.substring(styleEnd);
}

// Update badge styles in all templates
updateStyles('homepageHTML');
updateStyles('collectionsHTML');
updateStyles('productsHTML');

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('Table and badge styles updated successfully.');

// Now let's check for any remaining gray badges and replace them with warning
content = fs.readFileSync(filePath, 'utf8');
const updatedContent = content.replace(/badge gray/g, 'badge warning');
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('Badge gray updated to warning (yellow) successfully.');

// Fix the inconsistency in scheduleModal between home page and other pages
const homePageModal = content.indexOf('<\!-- Schedule Modal -->', content.indexOf('const homepageHTML'));
const collectionsModal = content.indexOf('<\!-- Schedule Modal -->', content.indexOf('const collectionsHTML'));

if (homePageModal \!== -1 && collectionsModal \!== -1) {
  // Extract the collections modal
  const collectionsModalStart = content.indexOf('<div id="scheduleModal"', collectionsModal);
  const collectionsModalEnd = content.indexOf('</div>\n  </div>', collectionsModalStart) + 12; // +12 for the two closing divs
  
  if (collectionsModalStart \!== -1 && collectionsModalEnd \!== -1) {
    const collectionsModalContent = content.substring(collectionsModalStart, collectionsModalEnd);
    
    // Replace the home page modal with the collections modal
    const homePageModalStart = content.indexOf('<div id="scheduleModal"', homePageModal);
    const homePageModalEnd = content.indexOf('</div>\n  </div>', homePageModalStart) + 12;
    
    if (homePageModalStart \!== -1 && homePageModalEnd \!== -1) {
      content = content.substring(0, homePageModalStart) + collectionsModalContent + content.substring(homePageModalEnd);
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Home page modal updated to match collections modal successfully.');
    }
  }
}
