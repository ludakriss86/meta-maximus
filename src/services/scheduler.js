/**
 * Scheduler Service for Meta Maximus
 * 
 * Handles scheduled meta tag changes
 */

const database = require('./database');
require('@shopify/shopify-api/adapters/node');
const { shopifyApi, ApiVersion, LATEST_API_VERSION } = require('@shopify/shopify-api');
const config = require('../config');
require('dotenv').config();

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES ? process.env.SCOPES.split(',') : [],
  hostName: process.env.HOST || config.HOST, // Use consistent host from config
  hostScheme: 'https',
  apiVersion: ApiVersion.January24 || LATEST_API_VERSION,
  isEmbeddedApp: true,
});

// Default check interval (5 minutes)
const DEFAULT_CHECK_INTERVAL = 5 * 60 * 1000;

let isRunning = false;
let checkInterval = null;
let lastCheck = null;

/**
 * Start the scheduler service
 * 
 * @param {number} interval - Check interval in milliseconds
 */
function startScheduler(interval = DEFAULT_CHECK_INTERVAL) {
  if (isRunning) {
    console.log('Scheduler is already running');
    return;
  }
  
  console.log(`Starting scheduler with ${interval}ms check interval`);
  
  // Run immediately
  checkScheduledChanges();
  
  // Set up interval
  checkInterval = setInterval(checkScheduledChanges, interval);
  isRunning = true;
}

/**
 * Stop the scheduler service
 */
function stopScheduler() {
  if (!isRunning) {
    console.log('Scheduler is not running');
    return;
  }
  
  console.log('Stopping scheduler');
  
  clearInterval(checkInterval);
  isRunning = false;
}

/**
 * Check for and apply scheduled template changes
 */
async function checkScheduledChanges() {
  console.log('Checking for scheduled template changes');
  lastCheck = new Date();
  
  try {
    // Connect to database
    await database.connectToDatabase();
    
    // Get pending scheduled changes
    const pendingChanges = await database.getPendingScheduledChanges();
    
    if (pendingChanges.length === 0) {
      console.log('No pending scheduled changes found');
      return;
    }
    
    console.log(`Found ${pendingChanges.length} pending scheduled changes`);
    
    // Process each scheduled change
    for (const change of pendingChanges) {
      try {
        // Get session (for a production app, you'd get this from the database)
        // For now, we'll use a default session in environment variables
        const session = {
          shop: process.env.SHOP,
          accessToken: process.env.SHOPIFY_ACCESS_TOKEN
        };
        
        // Skip if we don't have the necessary credentials
        if (!session.shop || !session.accessToken) {
          console.log('Skipping scheduled change - missing shop or access token');
          continue;
        }
        
        // Create a client
        const client = new shopify.clients.Rest({
          session: session
        });
        
        // Apply the template change
        await applyTemplateChange(client, change);
        
        // Mark as executed
        await database.markScheduledChangeExecuted(change._id.toString());
        
        console.log(`Applied scheduled change for ${change.resourceType} ${change.resourceId}`);
      } catch (error) {
        console.error(`Error applying scheduled change for ${change.resourceType} ${change.resourceId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking scheduled changes:', error);
  }
}

/**
 * Apply a template change to a Shopify resource
 * 
 * @param {object} client - Shopify REST client
 * @param {object} change - Scheduled change object
 */
async function applyTemplateChange(client, change) {
  const { resourceType, resourceId, template } = change;
  
  // Determine the correct API path based on resource type
  let path;
  if (resourceType === 'product') {
    path = `products/${resourceId}/metafields`;
  } else if (resourceType === 'collection') {
    path = `collections/${resourceId}/metafields`;
  } else {
    throw new Error(`Unsupported resource type: ${resourceType}`);
  }
  
  // Update metafields
  const updates = [];
  
  // Update title_tag if provided
  if (template.title) {
    updates.push(
      client.post({
        path,
        data: {
          metafield: {
            namespace: 'global',
            key: 'title_tag',
            value: template.title,
            type: 'single_line_text_field',
          },
        },
      })
    );
  }
  
  // Update description_tag if provided
  if (template.description) {
    updates.push(
      client.post({
        path,
        data: {
          metafield: {
            namespace: 'global',
            key: 'description_tag',
            value: template.description,
            type: 'single_line_text_field',
          },
        },
      })
    );
  }
  
  // Wait for all updates to complete
  await Promise.all(updates);
  
  // Also save to our custom templates database
  await database.saveCustomTemplate(resourceType, resourceId, template);
}

/**
 * Get scheduler status
 * 
 * @returns {object} Scheduler status information
 */
function getSchedulerStatus() {
  return {
    isRunning,
    lastCheck,
    checkInterval: checkInterval ? DEFAULT_CHECK_INTERVAL : null
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  checkScheduledChanges,
  getSchedulerStatus
};