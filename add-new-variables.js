// Script to add new variables to all pages: shopifyTitle, shopifyDescription, and initialCaps format
const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// Add the insertModifier function if it doesn't exist
if (!serverFileContent.includes('function insertModifier')) {
  // Find a good place to add the function - after the insertVariable function
  const insertVarFuncPos = serverFileContent.indexOf('function insertVariable');
  if (insertVarFuncPos !== -1) {
    // Find the end of the insertVariable function
    const insertVarFuncEnd = serverFileContent.indexOf('}', serverFileContent.indexOf('function insertVariable'));
    const endOfFunction = serverFileContent.indexOf('\n', insertVarFuncEnd) + 1;
    
    // Add the insertModifier function
    const insertModifierFunc = `
    // Format modifier insertion function
    function insertModifier(textareaId, modifier) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get the selected text
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      
      // Check if there's any selection
      if (startPos === endPos) {
        // No selection, notify user
        alert("Please select some text or a variable to apply the modifier.");
        return;
      }
      
      const selectedText = textarea.value.substring(startPos, endPos);
      
      // Check if selection is a variable or contains a variable
      if (selectedText.includes('{{') && selectedText.includes('}}')) {
        // Add modifier before the closing }}
        const modifiedText = selectedText.replace(/}}(?=[^}]*$)/, modifier + '}}');
        
        // Replace the selected text with the modified version
        textarea.value = textarea.value.substring(0, startPos) + modifiedText + textarea.value.substring(endPos);
        
        // Update selection to include the modification
        textarea.selectionStart = startPos;
        textarea.selectionEnd = startPos + modifiedText.length;
      } else {
        // Wrap selected text in {{ }} with modifier
        const modifiedText = '{{' + selectedText + modifier + '}}';
        
        // Replace the selected text with the modified version
        textarea.value = textarea.value.substring(0, startPos) + modifiedText + textarea.value.substring(endPos);
        
        // Update selection to include the modification
        textarea.selectionStart = startPos;
        textarea.selectionEnd = startPos + modifiedText.length;
      }
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    `;
    
    serverFileContent = 
      serverFileContent.substring(0, endOfFunction) + 
      insertModifierFunc + 
      serverFileContent.substring(endOfFunction);
  }
}

// Function to add new variables to a variable-buttons section
function addNewVariablesToSection(sectionRegex, buttonIdPrefix, isTitle) {
  // Find all button sections for the given ID prefix
  const matches = serverFileContent.match(new RegExp(sectionRegex, 'g'));
  
  if (matches) {
    for (const match of matches) {
      // Check if the section already has the new variables
      if (match.includes('shopifyTitle') || match.includes('shopifyDescription')) {
        continue; // Skip this section if it already has the new variables
      }
      
      // Determine which variable to add based on whether it's a title or description
      const shopifyVar = isTitle ? 'shopifyTitle' : 'shopifyDescription';
      const shopifyLabel = isTitle ? 'SHOPIFY TITLE' : 'SHOPIFY DESC';
      
      // Add new variable button
      const newVariable = `<button type="button" class="badge-button var" onclick="insertVariable('${buttonIdPrefix}', '{{${shopifyVar}}}')">DEFAULT</button>`;
      
      // Check if the format modifiers section exists
      if (match.includes('<!-- Format modifiers -->')) {
        // Add initialCaps modifier to existing format modifiers section
        const formatSection = match.match(/<!-- Format modifiers -->[^<]*<button[^>]*>/);
        if (formatSection) {
          const newMatch = match.replace(
            formatSection[0],
            `<!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('${buttonIdPrefix}', ':initialCaps')">INITIAL CAPS</button>
            ${formatSection[0]}`
          );
          
          // Add shopify variable to common variables section
          const commonVarsSection = newMatch.match(/<!-- Common variables -->[^<]*<button[^>]*>/);
          if (commonVarsSection) {
            const finalMatch = newMatch.replace(
              commonVarsSection[0],
              `<!-- Common variables -->
            ${newVariable}
            ${commonVarsSection[0]}`
            );
            
            // Replace the original section with the modified one
            serverFileContent = serverFileContent.replace(match, finalMatch);
          }
        }
      } else {
        // If no format modifiers section exists, add it after conditional logic section
        const conditionalSection = match.match(/<!-- Conditional logic -->[^<]*(?:<button[^>]*>.*?<\/button>[\s\n]*)+/s);
        if (conditionalSection) {
          const newMatch = match.replace(
            conditionalSection[0],
            `${conditionalSection[0]}
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('${buttonIdPrefix}', ':initialCaps')">INITIAL CAPS</button>
            <button type="button" class="badge-button format" onclick="insertModifier('${buttonIdPrefix}', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('${buttonIdPrefix}', ':lowercase')">LOWER</button>`
          );
          
          // Add shopify variable to common variables section
          const commonVarsSection = newMatch.match(/<!-- Common variables -->[^<]*<button[^>]*>/);
          if (commonVarsSection) {
            const finalMatch = newMatch.replace(
              commonVarsSection[0],
              `<!-- Common variables -->
            ${newVariable}
            ${commonVarsSection[0]}`
            );
            
            // Replace the original section with the modified one
            serverFileContent = serverFileContent.replace(match, finalMatch);
          }
        }
      }
    }
  }
}

// Add the .format CSS class if it doesn't exist
if (!serverFileContent.includes('.badge-button.format')) {
  const badgeButtonCSS = serverFileContent.match(/\.badge-button\.conditional:hover\s*\{[^}]*\}/);
  if (badgeButtonCSS && badgeButtonCSS.index) {
    const insertPoint = badgeButtonCSS.index + badgeButtonCSS[0].length;
    const formatButtonCSS = `
      
      /* Format modifiers */
      .badge-button.format {
        background-color: #f1e9ff;
        color: #5c6ac4;
      }
      .badge-button.format:hover {
        background-color: #e3d6ff;
      }`;
    
    serverFileContent = 
      serverFileContent.substring(0, insertPoint) + 
      formatButtonCSS + 
      serverFileContent.substring(insertPoint);
  }
}

// Add new variables to all pages
// Homepage
addNewVariablesToSection('<div class="variable-buttons">[\\s\\S]*?<button[^>]*onclick="insertVariable\\(\'homeTitle\'[\\s\\S]*?<\\/div>', 'homeTitle', true);
addNewVariablesToSection('<div class="variable-buttons">[\\s\\S]*?<button[^>]*onclick="insertVariable\\(\'homeDescription\'[\\s\\S]*?<\\/div>', 'homeDescription', false);

// Collections
addNewVariablesToSection('<div class="variable-buttons">[\\s\\S]*?<button[^>]*onclick="insertVariable\\(\'collectionTitle\'[\\s\\S]*?<\\/div>', 'collectionTitle', true);
addNewVariablesToSection('<div class="variable-buttons">[\\s\\S]*?<button[^>]*onclick="insertVariable\\(\'collectionDescription\'[\\s\\S]*?<\\/div>', 'collectionDescription', false);

// Products
addNewVariablesToSection('<div class="variable-buttons">[\\s\\S]*?<button[^>]*onclick="insertVariable\\(\'productTitle\'[\\s\\S]*?<\\/div>', 'productTitle', true);
addNewVariablesToSection('<div class="variable-buttons">[\\s\\S]*?<button[^>]*onclick="insertVariable\\(\'productDescription\'[\\s\\S]*?<\\/div>', 'productDescription', false);

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');

console.log('Successfully added new variables and initialCaps format!');