const fs = require('fs');
const path = require('path');

// Path to server/index.js
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// CSS for badge-style variable buttons
const buttonStyles = `
    /* Badge-style variable buttons */
    .variable-buttons {
      margin: 4px 0 6px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    /* Badge-style buttons */
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
    
    /* Format modifiers */
    .badge-button.format {
      background-color: #f6f0fd;
      color: #9c6ade;
    }
    .badge-button.format:hover {
      background-color: #e3d0ff;
    }
    
    /* Discount variables */
    .badge-button.discount {
      background-color: #fdf6e3;
      color: #daa520;
    }
    .badge-button.discount:hover {
      background-color: #f9e9c0;
    }`;

// JavaScript functions for variable buttons
const buttonFunctions = `
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
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    
    function insertModifier(textareaId, modifier) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const beforeCursor = textarea.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\\{\\{([^}]+)\\}\\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          textarea.value = textarea.value.substring(0, variableEndPos) + 
                           modifier +
                           textarea.value.substring(variableEndPos, textarea.value.length);
          textarea.selectionStart = textarea.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
          textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
        textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
      }
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }`;

// HTML for variable buttons
const getTitleButtons = (textareaId) => `
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('${textareaId}', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('${textareaId}', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('${textareaId}', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('${textareaId}', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('${textareaId}', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('${textareaId}', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('${textareaId}', ':lowercase')">LOWER</button>
          </div>`;

const getDescriptionButtons = (textareaId) => `
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('${textareaId}', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('${textareaId}', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('${textareaId}', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('${textareaId}', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('${textareaId}', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('${textareaId}', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('${textareaId}', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('${textareaId}', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('${textareaId}', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('${textareaId}', '{{discountRange}}')">RANGE</button>
          </div>`;

// Add CSS styles to each style block in the HTML templates
const cssStyleBlocks = serverFileContent.match(/<style>[\s\S]*?<\/style>/g);
if (cssStyleBlocks) {
  cssStyleBlocks.forEach(styleBlock => {
    const newStyleBlock = styleBlock.replace(/<\/style>/, `${buttonStyles}\n  </style>`);
    serverFileContent = serverFileContent.replace(styleBlock, newStyleBlock);
  });
}

// Add JavaScript functions to each script block in the HTML templates
const scriptBlocks = serverFileContent.match(/<script>[\s\S]*?<\/script>/g);
if (scriptBlocks) {
  scriptBlocks.forEach(scriptBlock => {
    const newScriptBlock = scriptBlock.replace(/<\/script>/, `${buttonFunctions}\n  </script>`);
    serverFileContent = serverFileContent.replace(scriptBlock, newScriptBlock);
  });
}

// Add buttons after labels but before textareas
// Collection Title
serverFileContent = serverFileContent.replace(
  /<label for="collectionTitle">Meta Title Template<\/label>/g,
  `<label for="collectionTitle">Meta Title Template</label>${getTitleButtons('collectionTitle')}`
);

// Collection Description
serverFileContent = serverFileContent.replace(
  /<label for="collectionDescription">Meta Description Template<\/label>/g,
  `<label for="collectionDescription">Meta Description Template</label>${getDescriptionButtons('collectionDescription')}`
);

// Product Title
serverFileContent = serverFileContent.replace(
  /<label for="productTitle">Meta Title Template<\/label>/g,
  `<label for="productTitle">Meta Title Template</label>${getTitleButtons('productTitle')}`
);

// Product Description
serverFileContent = serverFileContent.replace(
  /<label for="productDescription">Meta Description Template<\/label>/g,
  `<label for="productDescription">Meta Description Template</label>${getDescriptionButtons('productDescription')}`
);

// Edit form textareas
serverFileContent = serverFileContent.replace(
  /<label for="editTitle">Meta Title Template<\/label>/g,
  `<label for="editTitle">Meta Title Template</label>${getTitleButtons('editTitle')}`
);

serverFileContent = serverFileContent.replace(
  /<label for="editDescription">Meta Description Template<\/label>/g,
  `<label for="editDescription">Meta Description Template</label>${getDescriptionButtons('editDescription')}`
);

// Schedule form textareas
serverFileContent = serverFileContent.replace(
  /<label for="scheduleTitle">Meta Title Template<\/label>/g,
  `<label for="scheduleTitle">Meta Title Template</label>${getTitleButtons('scheduleTitle')}`
);

serverFileContent = serverFileContent.replace(
  /<label for="scheduleDescription">Meta Description Template<\/label>/g,
  `<label for="scheduleDescription">Meta Description Template</label>${getDescriptionButtons('scheduleDescription')}`
);

// Rule form textareas
serverFileContent = serverFileContent.replace(
  /<label for="collectionRuleTitle">Meta Title Template<\/label>/g,
  `<label for="collectionRuleTitle">Meta Title Template</label>${getTitleButtons('collectionRuleTitle')}`
);

serverFileContent = serverFileContent.replace(
  /<label for="collectionRuleDescription">Meta Description Template<\/label>/g,
  `<label for="collectionRuleDescription">Meta Description Template</label>${getDescriptionButtons('collectionRuleDescription')}`
);

serverFileContent = serverFileContent.replace(
  /<label for="ruleTitle">Meta Title Template<\/label>/g,
  `<label for="ruleTitle">Meta Title Template</label>${getTitleButtons('ruleTitle')}`
);

serverFileContent = serverFileContent.replace(
  /<label for="ruleDescription">Meta Description Template<\/label>/g,
  `<label for="ruleDescription">Meta Description Template</label>${getDescriptionButtons('ruleDescription')}`
);

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');

console.log('Variable buttons added to all meta field textareas in server/index.js');