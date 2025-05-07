// Script to fix variables and ensure they are added correctly to all pages
const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// Add the insertModifier function if it doesn't exist
if (!serverFileContent.includes('function insertModifier')) {
  // Find all script sections
  const scriptSections = [...serverFileContent.matchAll(/<script>[\s\S]*?<\/script>/g)];
  
  for (const match of scriptSections) {
    // Only add to script sections that include insertVariable
    if (match[0].includes('function insertVariable')) {
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
      
      // Add the function before the end of the script tag
      const scriptEndIdx = match.index + match[0].lastIndexOf('</script>');
      serverFileContent = 
        serverFileContent.substring(0, scriptEndIdx) + 
        insertModifierFunc + 
        serverFileContent.substring(scriptEndIdx);
      
      break; // Only add to one script section
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

// 1. Fix Home page variables
// Home Title
const homeTitleDiv = serverFileContent.match(/<div class="variable-buttons">[\s\S]*?<!-- Common variables -->[\s\S]*?<button[^>]*onclick="insertVariable\('homeTitle'/);
if (homeTitleDiv) {
  const homeTitleButtonsSection = `<div class="variable-buttons">
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
  
  // Replace the existing variable buttons div
  const startIdx = homeTitleDiv.index;
  const endIdx = serverFileContent.indexOf('</div>', startIdx) + 6; // Include the closing div tag
  serverFileContent = 
    serverFileContent.substring(0, startIdx) + 
    homeTitleButtonsSection + 
    serverFileContent.substring(endIdx);
}

// Home Description
const homeDescDiv = serverFileContent.match(/<div class="variable-buttons">[\s\S]*?<!-- Common variables -->[\s\S]*?<button[^>]*onclick="insertVariable\('homeDescription'/);
if (homeDescDiv) {
  const homeDescButtonsSection = `<div class="variable-buttons">
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
  
  // Replace the existing variable buttons div
  const startIdx = homeDescDiv.index;
  const endIdx = serverFileContent.indexOf('</div>', startIdx) + 6; // Include the closing div tag
  serverFileContent = 
    serverFileContent.substring(0, startIdx) + 
    homeDescButtonsSection + 
    serverFileContent.substring(endIdx);
}

// 2. For collections page - find any button sections for collectionTitle and add the new buttons
// Collection Title
const collectionTitleDivs = [...serverFileContent.matchAll(/<div class="variable-buttons">[\s\S]*?<!-- Common variables -->[\s\S]*?<button[^>]*onclick="insertVariable\('collectionTitle'/g)];
for (const match of collectionTitleDivs) {
  // Skip if shopifyTitle is already present
  if (serverFileContent.substring(match.index, match.index + 500).includes('shopifyTitle')) {
    continue;
  }
  
  // Add shopifyTitle after the common variables comment
  const commonVarsCommentIdx = serverFileContent.indexOf('<!-- Common variables -->', match.index) + '<!-- Common variables -->'.length;
  const shopifyTitleButton = `
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{shopifyTitle}}')">DEFAULT</button>`;
  
  serverFileContent = 
    serverFileContent.substring(0, commonVarsCommentIdx) + 
    shopifyTitleButton + 
    serverFileContent.substring(commonVarsCommentIdx);
  
  // Check if format modifiers exist
  const formatModifiersExist = serverFileContent.substring(match.index, match.index + 500).includes('initialCaps');
  if (!formatModifiersExist) {
    // Add initialCaps to format modifiers section or create new section
    const formatSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Format modifiers -->/);
    if (formatSection) {
      // Add to existing format modifiers section
      const formatSectionIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf('<!-- Format modifiers -->') + '<!-- Format modifiers -->'.length;
      const initialCapsButton = `
            <button type="button" class="badge-button format" onclick="insertModifier('collectionTitle', ':initialCaps')">INITIAL CAPS</button>`;
      
      serverFileContent = 
        serverFileContent.substring(0, formatSectionIdx) + 
        initialCapsButton + 
        serverFileContent.substring(formatSectionIdx);
    } else {
      // Create new format modifiers section after conditional logic
      const conditionalSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Conditional logic -->[\s\S]*?<\/button>/);
      if (conditionalSection) {
        const conditionalSectionEndIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf(conditionalSection[0]) + conditionalSection[0].length;
        const formatModifiersSection = `
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionTitle', ':initialCaps')">INITIAL CAPS</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionTitle', ':lowercase')">LOWER</button>`;
        
        serverFileContent = 
          serverFileContent.substring(0, conditionalSectionEndIdx) + 
          formatModifiersSection + 
          serverFileContent.substring(conditionalSectionEndIdx);
      }
    }
  }
}

// Collection Description
const collectionDescDivs = [...serverFileContent.matchAll(/<div class="variable-buttons">[\s\S]*?<!-- Common variables -->[\s\S]*?<button[^>]*onclick="insertVariable\('collectionDescription'/g)];
for (const match of collectionDescDivs) {
  // Skip if shopifyDescription is already present
  if (serverFileContent.substring(match.index, match.index + 500).includes('shopifyDescription')) {
    continue;
  }
  
  // Add shopifyDescription after the common variables comment
  const commonVarsCommentIdx = serverFileContent.indexOf('<!-- Common variables -->', match.index) + '<!-- Common variables -->'.length;
  const shopifyDescButton = `
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{shopifyDescription}}')">DEFAULT</button>`;
  
  serverFileContent = 
    serverFileContent.substring(0, commonVarsCommentIdx) + 
    shopifyDescButton + 
    serverFileContent.substring(commonVarsCommentIdx);
  
  // Check if format modifiers exist
  const formatModifiersExist = serverFileContent.substring(match.index, match.index + 500).includes('initialCaps');
  if (!formatModifiersExist) {
    // Add initialCaps to format modifiers section or create new section
    const formatSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Format modifiers -->/);
    if (formatSection) {
      // Add to existing format modifiers section
      const formatSectionIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf('<!-- Format modifiers -->') + '<!-- Format modifiers -->'.length;
      const initialCapsButton = `
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':initialCaps')">INITIAL CAPS</button>`;
      
      serverFileContent = 
        serverFileContent.substring(0, formatSectionIdx) + 
        initialCapsButton + 
        serverFileContent.substring(formatSectionIdx);
    } else {
      // Create new format modifiers section after conditional logic
      const conditionalSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Conditional logic -->[\s\S]*?<\/button>/);
      if (conditionalSection) {
        const conditionalSectionEndIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf(conditionalSection[0]) + conditionalSection[0].length;
        const formatModifiersSection = `
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':initialCaps')">INITIAL CAPS</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':lowercase')">LOWER</button>`;
        
        serverFileContent = 
          serverFileContent.substring(0, conditionalSectionEndIdx) + 
          formatModifiersSection + 
          serverFileContent.substring(conditionalSectionEndIdx);
      }
    }
  }
}

// 3. For products page - find any button sections for productTitle and add the new buttons
// Product Title
const productTitleDivs = [...serverFileContent.matchAll(/<div class="variable-buttons">[\s\S]*?<!-- Common variables -->[\s\S]*?<button[^>]*onclick="insertVariable\('productTitle'/g)];
for (const match of productTitleDivs) {
  // Skip if shopifyTitle is already present
  if (serverFileContent.substring(match.index, match.index + 500).includes('shopifyTitle')) {
    continue;
  }
  
  // Add shopifyTitle after the common variables comment
  const commonVarsCommentIdx = serverFileContent.indexOf('<!-- Common variables -->', match.index) + '<!-- Common variables -->'.length;
  const shopifyTitleButton = `
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{shopifyTitle}}')">DEFAULT</button>`;
  
  serverFileContent = 
    serverFileContent.substring(0, commonVarsCommentIdx) + 
    shopifyTitleButton + 
    serverFileContent.substring(commonVarsCommentIdx);
  
  // Check if format modifiers exist
  const formatModifiersExist = serverFileContent.substring(match.index, match.index + 500).includes('initialCaps');
  if (!formatModifiersExist) {
    // Add initialCaps to format modifiers section or create new section
    const formatSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Format modifiers -->/);
    if (formatSection) {
      // Add to existing format modifiers section
      const formatSectionIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf('<!-- Format modifiers -->') + '<!-- Format modifiers -->'.length;
      const initialCapsButton = `
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':initialCaps')">INITIAL CAPS</button>`;
      
      serverFileContent = 
        serverFileContent.substring(0, formatSectionIdx) + 
        initialCapsButton + 
        serverFileContent.substring(formatSectionIdx);
    } else {
      // Create new format modifiers section after conditional logic
      const conditionalSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Conditional logic -->[\s\S]*?<\/button>/);
      if (conditionalSection) {
        const conditionalSectionEndIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf(conditionalSection[0]) + conditionalSection[0].length;
        const formatModifiersSection = `
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':initialCaps')">INITIAL CAPS</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':lowercase')">LOWER</button>`;
        
        serverFileContent = 
          serverFileContent.substring(0, conditionalSectionEndIdx) + 
          formatModifiersSection + 
          serverFileContent.substring(conditionalSectionEndIdx);
      }
    }
  }
}

// Product Description
const productDescDivs = [...serverFileContent.matchAll(/<div class="variable-buttons">[\s\S]*?<!-- Common variables -->[\s\S]*?<button[^>]*onclick="insertVariable\('productDescription'/g)];
for (const match of productDescDivs) {
  // Skip if shopifyDescription is already present
  if (serverFileContent.substring(match.index, match.index + 500).includes('shopifyDescription')) {
    continue;
  }
  
  // Add shopifyDescription after the common variables comment
  const commonVarsCommentIdx = serverFileContent.indexOf('<!-- Common variables -->', match.index) + '<!-- Common variables -->'.length;
  const shopifyDescButton = `
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{shopifyDescription}}')">DEFAULT</button>`;
  
  serverFileContent = 
    serverFileContent.substring(0, commonVarsCommentIdx) + 
    shopifyDescButton + 
    serverFileContent.substring(commonVarsCommentIdx);
  
  // Check if format modifiers exist
  const formatModifiersExist = serverFileContent.substring(match.index, match.index + 500).includes('initialCaps');
  if (!formatModifiersExist) {
    // Add initialCaps to format modifiers section or create new section
    const formatSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Format modifiers -->/);
    if (formatSection) {
      // Add to existing format modifiers section
      const formatSectionIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf('<!-- Format modifiers -->') + '<!-- Format modifiers -->'.length;
      const initialCapsButton = `
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':initialCaps')">INITIAL CAPS</button>`;
      
      serverFileContent = 
        serverFileContent.substring(0, formatSectionIdx) + 
        initialCapsButton + 
        serverFileContent.substring(formatSectionIdx);
    } else {
      // Create new format modifiers section after conditional logic
      const conditionalSection = serverFileContent.substring(match.index, match.index + 500).match(/<!-- Conditional logic -->[\s\S]*?<\/button>/);
      if (conditionalSection) {
        const conditionalSectionEndIdx = match.index + serverFileContent.substring(match.index, match.index + 500).indexOf(conditionalSection[0]) + conditionalSection[0].length;
        const formatModifiersSection = `
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':initialCaps')">INITIAL CAPS</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':lowercase')">LOWER</button>`;
        
        serverFileContent = 
          serverFileContent.substring(0, conditionalSectionEndIdx) + 
          formatModifiersSection + 
          serverFileContent.substring(conditionalSectionEndIdx);
      }
    }
  }
}

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');

console.log('Successfully fixed all variable buttons on all pages!');