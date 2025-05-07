// Script to update the position of variable buttons in homepageHTML to be above the input fields
const fs = require('fs');
const path = require('path');

// Path to the server/index.js file
const serverFilePath = path.join(__dirname, 'server', 'index.js');

// Read the server file
let serverFileContent = fs.readFileSync(serverFilePath, 'utf8');

// 1. Fix homeTitle variable buttons position
// Find the current variable buttons div after the input
const homeTitleRegex = /<label for="homeTitle">Meta Title Template<\/label>\s*<input type="text" id="homeTitle".*?>\s*<div class="variable-buttons">([\s\S]*?)<\/div>/;
const homeTitleMatch = serverFileContent.match(homeTitleRegex);

if (homeTitleMatch) {
  // The content of the variable buttons div
  const variableButtonsContent = homeTitleMatch[1];
  
  // Remove the existing variable buttons div
  serverFileContent = serverFileContent.replace(homeTitleRegex, (match) => {
    return match.replace(/<div class="variable-buttons">[\s\S]*?<\/div>/, '');
  });
  
  // Add the variable buttons div above the input
  serverFileContent = serverFileContent.replace(
    /<label for="homeTitle">Meta Title Template<\/label>/,
    `<label for="homeTitle">Meta Title Template</label>
        <div class="variable-buttons">${variableButtonsContent}</div>`
  );
}

// 2. Fix homeDescription variable buttons position
// Find the current variable buttons div after the textarea
const homeDescRegex = /<label for="homeDescription">Meta Description Template<\/label>\s*<textarea id="homeDescription">.*?<\/textarea>\s*<div class="variable-buttons">([\s\S]*?)<\/div>/;
const homeDescMatch = serverFileContent.match(homeDescRegex);

if (homeDescMatch) {
  // The content of the variable buttons div
  const variableButtonsContent = homeDescMatch[1];
  
  // Remove the existing variable buttons div
  serverFileContent = serverFileContent.replace(homeDescRegex, (match) => {
    return match.replace(/<div class="variable-buttons">[\s\S]*?<\/div>/, '');
  });
  
  // Add the variable buttons div above the textarea
  serverFileContent = serverFileContent.replace(
    /<label for="homeDescription">Meta Description Template<\/label>/,
    `<label for="homeDescription">Meta Description Template</label>
        <div class="variable-buttons">${variableButtonsContent}</div>`
  );
}

// Write the updated content back to the file
fs.writeFileSync(serverFilePath, serverFileContent, 'utf8');

console.log('Successfully repositioned variable buttons to be above the input fields!');