/**
 * MongoDB Fallback Test Script
 * 
 * Run this script to test the application with in-memory fallback
 */

const database = require('./src/services/database');

async function testWithFallback() {
  console.log('Testing with in-memory fallback...');
  
  try {
    // 1. Test global templates
    console.log('\n1. Testing global templates:');
    const globalTemplates = await database.getGlobalTemplates();
    console.log('Global templates:', JSON.stringify(globalTemplates, null, 2));
    
    // 2. Test saving and retrieving home page template
    console.log('\n2. Testing home page template:');
    const homeTemplate = {
      title: "{{storeName}} - {{year}} Special Collection",
      description: "Check out our {{year}} special collection with the latest products."
    };
    
    await database.saveHomePageTemplate(homeTemplate);
    const savedHomeTemplate = await database.getHomePageTemplate();
    console.log('Saved home template:', JSON.stringify(savedHomeTemplate, null, 2));
    
    // 3. Test scheduling a template change
    console.log('\n3. Testing scheduled template change:');
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 7); // Schedule for 7 days from now
    
    const scheduledTemplate = {
      title: "Summer Sale {{year}} - Save up to 30%!",
      description: "Limited time offer: Save up to 30% on selected items."
    };
    
    const schedule = await database.scheduleTemplateChange(
      'global',
      null,
      scheduledTemplate,
      scheduledDate,
      null,
      'Summer Sale Template'
    );
    
    console.log('Created schedule:', JSON.stringify(schedule, null, 2));
    
    // 4. Test pending scheduled changes
    console.log('\n4. Testing pending scheduled changes:');
    const pendingChanges = await database.getPendingScheduledChanges();
    console.log('Pending changes:', JSON.stringify(pendingChanges, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during tests:', error);
  }
}

// Run the test
testWithFallback();