const fs = require('fs');
const path = require('path');
const util = require('util');

// Path to the server/index.js file
const filePath = path.join(__dirname, 'server', 'index.js');

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Find the CSS style blocks in each HTML template
const templateMatches = content.match(/const (\w+HTML) = `[\s\S]*?<style>([\s\S]*?)<\/style>/g);

if (\!templateMatches) {
  console.log('No style blocks found');
  process.exit(1);
}

// Compare the CSS styles
const templates = {};

templateMatches.forEach(match => {
  const templateName = match.match(/const (\w+HTML)/)[1];
  const styleBlock = match.match(/<style>([\s\S]*?)<\/style>/)[1];
  
  // Extract table and badge styles
  const tableStyle = styleBlock.match(/table\s*{[\s\S]*?}/);
  const thTdStyle = styleBlock.match(/th,\s*td\s*{[\s\S]*?}/);
  const thStyle = styleBlock.match(/th\s*{[\s\S]*?}/);
  const badgeStyle = styleBlock.match(/\.badge\s*{[\s\S]*?}/);
  const badgeGreenStyle = styleBlock.match(/\.badge\.green\s*{[\s\S]*?}/);
  const badgeBlueStyle = styleBlock.match(/\.badge\.blue\s*{[\s\S]*?}/);
  const badgeWarningStyle = styleBlock.match(/\.badge\.warning\s*{[\s\S]*?}/);
  
  templates[templateName] = {
    table: tableStyle ? tableStyle[0] : "Not found",
    thTd: thTdStyle ? thTdStyle[0] : "Not found",
    th: thStyle ? thStyle[0] : "Not found",
    badge: badgeStyle ? badgeStyle[0] : "Not found",
    badgeGreen: badgeGreenStyle ? badgeGreenStyle[0] : "Not found",
    badgeBlue: badgeBlueStyle ? badgeBlueStyle[0] : "Not found",
    badgeWarning: badgeWarningStyle ? badgeWarningStyle[0] : "Not found"
  };
});

// Print the comparison
console.log('Template Style Comparison:');
console.log(util.inspect(templates, { depth: null, colors: true }));

// Find home page scheduler table
let homepageIndex = content.indexOf('const homepageHTML = `');
let schedulerIndex = content.indexOf('<\!-- Scheduler Section -->', homepageIndex);
let tableStartIndex = content.indexOf('<table>', schedulerIndex);
let tableEndIndex = content.indexOf('</table>', tableStartIndex);

console.log('\nHome Page Scheduler Table:');
console.log(content.substring(tableStartIndex, tableEndIndex + 8));

// Find collections scheduler table
let collectionsIndex = content.indexOf('const collectionsHTML = `');
let collectionsSchedulerIndex = content.indexOf('<\!-- Scheduling Section -->', collectionsIndex);
let collectionsTableStartIndex = content.indexOf('<table>', collectionsSchedulerIndex);
let collectionsTableEndIndex = content.indexOf('</table>', collectionsTableStartIndex);

console.log('\nCollections Page Scheduler Table:');
console.log(content.substring(collectionsTableStartIndex, collectionsTableEndIndex + 8));

