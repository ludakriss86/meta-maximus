// Script to fix the homepage variables
const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// Find homepageHTML variable
const homepageHTMLStart = serverFileContent.indexOf('const homepageHTML = `');
if (homepageHTMLStart !== -1) {
  // Find the beginning of the homeTitle variable buttons div
  const homeTitleVarButtonsStart = serverFileContent.indexOf('<div class="variable-buttons">', homepageHTMLStart);
  const homeTitleVarButtonsEnd = serverFileContent.indexOf('</div>', homeTitleVarButtonsStart) + 6;
  
  // Replace with new variable buttons including shopifyTitle and initialCaps
  const newHomeTitleButtons = `<div class="variable-buttons">
          <!-- Common variables -->
          <button type="button" class="badge-button var" onclick="insertVariable('homeTitle', '{{shopifyTitle}}')">DEFAULT</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{year}}')">YEAR</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{month}}')">MONTH</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{season}}')">SEASON</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{storeName}}')">STORE</button>
          <!-- Conditionals -->
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{if condition}}')">IF</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{else}}')">ELSE</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{endif}}')">ENDIF</button>
          
          <!-- Format modifiers -->
          <button type="button" class="badge-button format" onclick="insertModifier('homeTitle', ':initialCaps')">INITIAL CAPS</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeTitle', ':uppercase')">UPPER</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeTitle', ':lowercase')">LOWER</button>
        </div>`;
  
  // Replace the old buttons with the new ones
  serverFileContent = 
    serverFileContent.substring(0, homeTitleVarButtonsStart) + 
    newHomeTitleButtons + 
    serverFileContent.substring(homeTitleVarButtonsEnd);
  
  // Find the beginning of the homeDescription variable buttons div
  const homeDescVarButtonsStart = serverFileContent.indexOf('<div class="variable-buttons">', homeTitleVarButtonsEnd);
  const homeDescVarButtonsEnd = serverFileContent.indexOf('</div>', homeDescVarButtonsStart) + 6;
  
  // Replace with new variable buttons including shopifyDescription and initialCaps
  const newHomeDescButtons = `<div class="variable-buttons">
          <!-- Common variables -->
          <button type="button" class="badge-button var" onclick="insertVariable('homeDescription', '{{shopifyDescription}}')">DEFAULT</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{year}}')">YEAR</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{month}}')">MONTH</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{season}}')">SEASON</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{storeName}}')">STORE</button>
          <!-- Conditionals -->
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{if hasDiscount}}')">IF DISCOUNT</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{else}}')">ELSE</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{endif}}')">ENDIF</button>
          <!-- Special variables -->
          <button type="button" class="badge-button var" onclick="insertVariable('homeDescription', '{{maxDiscountPercentage}}')">DISCOUNT%</button>
          
          <!-- Format modifiers -->
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':initialCaps')">INITIAL CAPS</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':uppercase')">UPPER</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':lowercase')">LOWER</button>
        </div>`;
  
  // Replace the old buttons with the new ones
  serverFileContent = 
    serverFileContent.substring(0, homeDescVarButtonsStart) + 
    newHomeDescButtons + 
    serverFileContent.substring(homeDescVarButtonsEnd);
  
  // Add the insertModifier function to the homepageHTML if it doesn't exist
  if (!serverFileContent.includes('function insertModifier') || 
      !serverFileContent.substring(homepageHTMLStart, homepageHTMLStart + 10000).includes('function insertModifier')) {
    // Find the script section in homepageHTML
    const scriptStart = serverFileContent.indexOf('<script>', homepageHTMLStart);
    const scriptEnd = serverFileContent.indexOf('</script>', scriptStart);
    
    // Add the insertModifier function before the end of the script
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
    }`;
    
    serverFileContent = 
      serverFileContent.substring(0, scriptEnd) + 
      insertModifierFunc + 
      serverFileContent.substring(scriptEnd);
  }
  
  // Add CSS for format button if it doesn't exist in homepageHTML
  if (!serverFileContent.substring(homepageHTMLStart, homepageHTMLStart + 10000).includes('.badge-button.format')) {
    // Find the style section in homepageHTML
    const styleStart = serverFileContent.indexOf('<style>', homepageHTMLStart);
    const styleEnd = serverFileContent.indexOf('</style>', styleStart);
    
    // Add the CSS for format button before the end of the style tag
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
      serverFileContent.substring(0, styleEnd) + 
      formatButtonCSS + 
      serverFileContent.substring(styleEnd);
  }
}

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');

console.log('Successfully fixed homepage variable buttons!');