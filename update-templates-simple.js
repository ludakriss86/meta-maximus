const fs = require('fs');
const path = require('path');

// Path to server/index.js
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// HTML code for variable buttons - this will appear in a form field
const variableButtonsHTML = `
  <div style="margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background-color: #f9f9f9;">
    <h4 style="margin-top: 0; color: #5c6ac4;">Quick Insert Variables:</h4>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{year}}')">YEAR</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{month}}')">MONTH</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{season}}')">SEASON</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{date}}')">DATE</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{productTitle}}')">PRODUCT</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{collectionTitle}}')">COLLECTION</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{storeName}}')">STORE</button>
    </div>
    
    <h4 style="margin-top: 0; color: #5c6ac4;">Conditional Logic:</h4>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{if hasDiscount}}...{{endif}}')">IF DISCOUNT</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertText('{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
    </div>
    
    <h4 style="margin-top: 0; color: #5c6ac4;">Format Modifiers:</h4>
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertModifier(':uppercase')">UPPERCASE</button>
      <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="insertModifier(':lowercase')">LOWERCASE</button>
    </div>
  </div>
`;

// JavaScript functions to insert text at cursor position
const insertJavaScript = `
<script>
  // Function to insert text at cursor position in the active element
  function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      activeElement.value = activeElement.value.substring(0, startPos) + 
                           text + 
                           activeElement.value.substring(endPos, activeElement.value.length);
      activeElement.selectionStart = activeElement.selectionEnd = startPos + text.length;
      activeElement.focus();
    }
  }
  
  // Function to insert a modifier at cursor position or after a variable
  function insertModifier(modifier) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const beforeCursor = activeElement.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\\{\\{([^}]+)\\}\\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          activeElement.value = activeElement.value.substring(0, variableEndPos) + 
                               modifier +
                               activeElement.value.substring(variableEndPos, activeElement.value.length);
          activeElement.selectionStart = activeElement.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
          activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
        activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
      }
      
      activeElement.focus();
    }
  }
</script>
`;

// Update homepage HTML template
if (serverFileContent.includes('<!DOCTYPE html>')) {
  // Add the insertion JavaScript to the end of the body in each HTML template
  serverFileContent = serverFileContent.replace(
    /<\/body>\s*<\/html>/g, 
    insertJavaScript + '</body></html>'
  );

  // Find all textarea elements in the templates and add the variable buttons after them
  serverFileContent = serverFileContent.replace(
    /<textarea\s+[^>]*name=['"]metaTitle['"][^>]*>.*?<\/textarea>/g,
    match => match + variableButtonsHTML
  );
  
  serverFileContent = serverFileContent.replace(
    /<textarea\s+[^>]*name=['"]metaDescription['"][^>]*>.*?<\/textarea>/g,
    match => match + variableButtonsHTML
  );
  
  serverFileContent = serverFileContent.replace(
    /<textarea\s+[^>]*name=['"]title['"][^>]*>.*?<\/textarea>/g,
    match => match + variableButtonsHTML
  );
  
  serverFileContent = serverFileContent.replace(
    /<textarea\s+[^>]*name=['"]description['"][^>]*>.*?<\/textarea>/g,
    match => match + variableButtonsHTML
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');
  
  console.log('Variable buttons added to textarea elements in HTML templates.');
} else {
  console.log('Could not find HTML templates in the server file.');
}