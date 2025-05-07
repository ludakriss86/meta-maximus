const fs = require('fs');
const path = require('path');

// Path to server/index.js
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
const serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// Extract the HTML templates
const extractTemplate = (variableName) => {
  const pattern = new RegExp(`const ${variableName} = \`([\\s\\S]*?)\`;`, 'g');
  const match = pattern.exec(serverFileContent);
  return match ? match[1] : null;
};

// HTML code for variable buttons
const variableButtonsHTML = `
<div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9;">
  <h3 style="margin-top: 0; color: #5c6ac4;">Quick Insert Variables:</h3>
  <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">YEAR</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">MONTH</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">SEASON</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">DATE</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">PRODUCT</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">COLLECTION</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">STORE</button>
  </div>
  
  <h3 style="margin-top: 0; color: #5c6ac4;">Conditional Logic:</h3>
  <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">IF DISCOUNT</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">IF/ELSE</button>
  </div>
  
  <h3 style="margin-top: 0; color: #5c6ac4;">Format Modifiers:</h3>
  <div style="display: flex; gap: 10px; flex-wrap: wrap;">
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">UPPERCASE</button>
    <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px; cursor: pointer;">LOWERCASE</button>
  </div>
</div>
`;

// Function to inject variable buttons into a template where the template has a textarea
const injectVariableButtons = (template) => {
  // Check if the template has a textarea
  if (template.includes('<textarea')) {
    // Insert after the textarea
    return template.replace(/<\/textarea>/g, '</textarea>' + variableButtonsHTML);
  }
  // If template has a form with method="POST"
  else if (template.includes('<form') && template.includes('method="POST"')) {
    // Insert before the form submit button or action buttons
    return template.replace(/<div class="form-actions">/g, variableButtonsHTML + '<div class="form-actions">');
  }
  return template;
};

// Extract the HTML templates
const collectionsHTML = extractTemplate('collectionsHTML');
const productsHTML = extractTemplate('productsHTML');
const templatesHTML = extractTemplate('templatesHTML');
const homepageHTML = extractTemplate('homepageHTML');

// Modify the templates to include variable buttons
const updatedCollectionsHTML = injectVariableButtons(collectionsHTML);
const updatedProductsHTML = injectVariableButtons(productsHTML);
const updatedTemplatesHTML = injectVariableButtons(templatesHTML);
const updatedHomepageHTML = injectVariableButtons(homepageHTML);

// Update the server file with the modified templates
let updatedServerFileContent = serverFileContent;

if (collectionsHTML && updatedCollectionsHTML !== collectionsHTML) {
  updatedServerFileContent = updatedServerFileContent.replace(
    `const collectionsHTML = \`${collectionsHTML}\`;`,
    `const collectionsHTML = \`${updatedCollectionsHTML}\`;`
  );
}

if (productsHTML && updatedProductsHTML !== productsHTML) {
  updatedServerFileContent = updatedServerFileContent.replace(
    `const productsHTML = \`${productsHTML}\`;`,
    `const productsHTML = \`${updatedProductsHTML}\`;`
  );
}

if (templatesHTML && updatedTemplatesHTML !== templatesHTML) {
  updatedServerFileContent = updatedServerFileContent.replace(
    `const templatesHTML = \`${templatesHTML}\`;`,
    `const templatesHTML = \`${updatedTemplatesHTML}\`;`
  );
}

if (homepageHTML && updatedHomepageHTML !== homepageHTML) {
  updatedServerFileContent = updatedServerFileContent.replace(
    `const homepageHTML = \`${homepageHTML}\`;`,
    `const homepageHTML = \`${updatedHomepageHTML}\`;`
  );
}

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, updatedServerFileContent, 'utf8');

console.log('HTML templates updated with variable buttons.');