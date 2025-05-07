// Script to update the homepageHTML template in server/index.js to add variable buttons
const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// Check if insertVariable function already exists in homepageHTML
if (!serverFileContent.includes('function insertVariable(textareaId, variable) {') ||
    !serverFileContent.match(/homepageHTML.*function insertVariable/s)) {
  // Add insertVariable function to the script section of homepageHTML
  const insertVariableFunctionCode = `
    // Variable insertion functions
    function insertVariable(textareaId, variable) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      
      // Insert variable at cursor position
      textarea.value = textarea.value.substring(0, startPos) + 
                       variable + 
                       textarea.value.substring(endPos);
      
      // Move cursor after the inserted variable
      textarea.selectionStart = textarea.selectionEnd = startPos + variable.length;
      
      // Trigger input event to update character count and preview
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
  `;

  // Find the position right before the first script closing tag in homepageHTML
  const scriptEndPos = serverFileContent.indexOf('</script>', serverFileContent.indexOf('homepageHTML'));
  if (scriptEndPos !== -1) {
    serverFileContent = 
      serverFileContent.substring(0, scriptEndPos) + 
      insertVariableFunctionCode + 
      serverFileContent.substring(scriptEndPos);
  }
}

// 1. Add variable buttons for homeTitle
// First, find the position of the homeTitle label
const homeTitleLabelPos = serverFileContent.indexOf('<label for="homeTitle">');
if (homeTitleLabelPos !== -1) {
  // Find the end of the input element
  const homeTitleInputEndPos = serverFileContent.indexOf('>', serverFileContent.indexOf('id="homeTitle"', homeTitleLabelPos)) + 1;
  
  // Variable buttons HTML for homeTitle
  const homeTitleButtonsHTML = `
        <div class="variable-buttons">
          <!-- Common variables -->
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{year}}')">YEAR</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{month}}')">MONTH</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{season}}')">SEASON</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{storeName}}')">STORE</button>
          <!-- Conditionals -->
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{if condition}}')">IF</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{else}}')">ELSE</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{endif}}')">ENDIF</button>
        </div>`;
  
  // Insert the variable buttons HTML after the input element
  serverFileContent = 
    serverFileContent.substring(0, homeTitleInputEndPos) + 
    homeTitleButtonsHTML + 
    serverFileContent.substring(homeTitleInputEndPos);
}

// 2. Add variable buttons for homeDescription
// First, find the position of the homeDescription label
const homeDescLabelPos = serverFileContent.indexOf('<label for="homeDescription">');
if (homeDescLabelPos !== -1) {
  // Find the end of the textarea element
  const homeDescTextareaEndPos = serverFileContent.indexOf('</textarea>', homeDescLabelPos) + 11;
  
  // Variable buttons HTML for homeDescription
  const homeDescButtonsHTML = `
        <div class="variable-buttons">
          <!-- Common variables -->
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
        </div>`;
  
  // Insert the variable buttons HTML after the textarea element
  serverFileContent = 
    serverFileContent.substring(0, homeDescTextareaEndPos) + 
    homeDescButtonsHTML + 
    serverFileContent.substring(homeDescTextareaEndPos);
}

// 3. Make sure the CSS for variable buttons and badge-button is included in the style section
if (!serverFileContent.includes('.badge-button') || !serverFileContent.includes('.variable-buttons')) {
  const buttonStyles = `
      /* Badge-style variable buttons */
      .variable-buttons {
        margin: 4px 0 6px 0;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      
      .badge-button {
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 500;
        border: none;
        border-radius: 12px; /* Fully rounded corners */
        cursor: pointer;
        transition: all 0.2s;
      }
      
      /* Regular variables */
      .badge-button.var {
        background-color: #e0e5f0;
        color: #5c6ac4;
      }
      .badge-button.var:hover {
        background-color: #c9cfe0;
      }
      
      /* Primary variables */
      .badge-button.primary {
        background-color: #eaf5fe;
        color: #007ace;
      }
      .badge-button.primary:hover {
        background-color: #b4dbf7;
      }
      
      /* Conditional logic */
      .badge-button.conditional {
        background-color: #e3f1df;
        color: #108043;
      }
      .badge-button.conditional:hover {
        background-color: #bbe5b3;
      }
  `;

  // Find the position right before the first style closing tag in homepageHTML
  const styleEndPos = serverFileContent.indexOf('</style>', serverFileContent.indexOf('homepageHTML'));
  if (styleEndPos !== -1) {
    serverFileContent = 
      serverFileContent.substring(0, styleEndPos) + 
      buttonStyles + 
      serverFileContent.substring(styleEndPos);
  }
}

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');

console.log('Successfully added variable buttons to the homepage template!');