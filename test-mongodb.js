/**
 * MongoDB Connection Test Script
 * 
 * Run this script to test your MongoDB connection settings
 */

const database = require('./src/services/database');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  try {
    // Attempt to connect to the database
    const db = await database.connectToDatabase();
    
    if (!db) {
      console.error('❌ Connection failed - check your connection string and credentials');
      process.exit(1);
    }
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test fetching global templates
    console.log('\nTesting global templates fetch...');
    const templates = await database.getGlobalTemplates();
    console.log('Global templates:', JSON.stringify(templates, null, 2));
    
    // Clean up connection
    console.log('\nCleaning up connection...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing MongoDB connection:', error);
    process.exit(1);
  }
}

// Run the test
testConnection();