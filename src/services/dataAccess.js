/**
 * Data Access Service for Meta Maximus
 * 
 * Provides a higher-level API for database operations with consistent patterns
 */

const database = require('./database');
const logger = require('./logger');
const dbValidation = require('./dbValidation');
const { ObjectId } = require('mongodb');

/**
 * Resource types and their corresponding collections
 */
const RESOURCE_TYPES = {
  TEMPLATE: 'templates',
  CUSTOM_TEMPLATE: 'customTemplates',
  SCHEDULED_CHANGE: 'scheduledChanges',
  CUSTOM_RULE: 'customRules',
  SESSION: 'sessions'
};

/**
 * Get templates by resource type
 * 
 * @param {Object} options - Options for the query
 * @param {string} options.resourceType - Type of resource ('product', 'collection', or 'global')
 * @param {string} options.storeId - Store identifier (default: 'default')
 * @param {boolean} options.activeOnly - Whether to return only active items (default: true)
 * @returns {Promise<Array>} Array of matching templates
 */
async function getTemplates(options = {}) {
  const { 
    resourceType,
    storeId = 'default',
    activeOnly = true
  } = options;
  
  try {
    // Input validation
    if (!resourceType || !['product', 'collection', 'global', 'home'].includes(resourceType)) {
      throw new Error('Invalid resource type. Must be "product", "collection", "global", or "home"');
    }
    
    if (resourceType === 'global' || resourceType === 'home') {
      // Get global templates including home
      const globalTemplates = await database.getGlobalTemplates(storeId);
      
      if (resourceType === 'global') {
        return globalTemplates;
      } else {
        return globalTemplates.home || null;
      }
    }
    
    // For product or collection, get custom templates
    const query = { resourceType, storeId };
    
    if (activeOnly) {
      query.active = true;
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, using fallback data');
      return [];
    }
    
    // Fetch templates
    const templates = await db.collection(RESOURCE_TYPES.CUSTOM_TEMPLATE)
      .find(query)
      .toArray();
    
    logger.debug(`Retrieved ${templates.length} ${resourceType} templates`, { storeId });
    
    return templates;
  } catch (error) {
    logger.error('Error getting templates', { 
      resourceType, 
      storeId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get template by ID
 * 
 * @param {string} id - Template ID
 * @returns {Promise<Object|null>} Template object or null if not found
 */
async function getTemplateById(id) {
  try {
    // Input validation
    if (!dbValidation.validateObjectId(id)) {
      throw new Error('Invalid template ID format');
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, using fallback data');
      return null;
    }
    
    // Fetch template
    const template = await db.collection(RESOURCE_TYPES.CUSTOM_TEMPLATE)
      .findOne({ _id: new ObjectId(id) });
    
    if (!template) {
      logger.debug(`Template not found with ID: ${id}`);
      return null;
    }
    
    logger.debug(`Retrieved template by ID: ${id}`);
    
    return template;
  } catch (error) {
    logger.error('Error getting template by ID', { 
      id, 
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete template by ID
 * 
 * @param {string} id - Template ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteTemplateById(id) {
  try {
    // Input validation
    if (!dbValidation.validateObjectId(id)) {
      throw new Error('Invalid template ID format');
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, cannot delete template');
      return false;
    }
    
    // Delete template
    const result = await db.collection(RESOURCE_TYPES.CUSTOM_TEMPLATE)
      .deleteOne({ _id: new ObjectId(id) });
    
    logger.info(`Deleted template with ID: ${id}`, { 
      deleted: result.deletedCount 
    });
    
    return result.deletedCount > 0;
  } catch (error) {
    logger.error('Error deleting template by ID', { 
      id, 
      error: error.message
    });
    throw error;
  }
}

/**
 * Update template status by ID
 * 
 * @param {string} id - Template ID
 * @param {boolean} active - Active status
 * @returns {Promise<boolean>} Success status
 */
async function updateTemplateStatus(id, active) {
  try {
    // Input validation
    if (!dbValidation.validateObjectId(id)) {
      throw new Error('Invalid template ID format');
    }
    
    if (typeof active !== 'boolean') {
      throw new Error('Active status must be a boolean');
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, cannot update template status');
      return false;
    }
    
    // Update template status
    const result = await db.collection(RESOURCE_TYPES.CUSTOM_TEMPLATE)
      .updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            active,
            updatedAt: new Date() 
          }
        }
      );
    
    logger.info(`Updated template status to ${active} for ID: ${id}`, { 
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
    
    return result.modifiedCount > 0;
  } catch (error) {
    logger.error('Error updating template status', { 
      id, 
      active,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get scheduled changes
 * 
 * @param {Object} options - Options for the query
 * @param {string} options.resourceType - Type of resource ('product', 'collection', or 'global')
 * @param {string} options.resourceId - Resource ID (optional)
 * @param {string} options.storeId - Store identifier (default: 'default')
 * @param {boolean} options.activeOnly - Whether to return only active items (default: true)
 * @param {boolean} options.pendingOnly - Whether to return only pending (not executed) items (default: true)
 * @param {number} options.limit - Maximum number of items to return (default: 100)
 * @returns {Promise<Array>} Array of scheduled changes
 */
async function getScheduledChanges(options = {}) {
  const { 
    resourceType,
    resourceId,
    storeId = 'default',
    activeOnly = true,
    pendingOnly = true,
    limit = 100
  } = options;
  
  try {
    // Build query
    const query = { storeId };
    
    if (resourceType) {
      if (!['product', 'collection', 'global'].includes(resourceType)) {
        throw new Error('Invalid resource type. Must be "product", "collection", or "global"');
      }
      query.resourceType = resourceType;
    }
    
    if (resourceId) {
      query.resourceId = resourceId;
    }
    
    if (activeOnly) {
      query.active = true;
    }
    
    if (pendingOnly) {
      query.executed = false;
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, using fallback data');
      return [];
    }
    
    // Fetch scheduled changes
    const scheduledChanges = await db.collection(RESOURCE_TYPES.SCHEDULED_CHANGE)
      .find(query)
      .sort({ scheduledDate: 1 })
      .limit(limit)
      .toArray();
    
    logger.debug(`Retrieved ${scheduledChanges.length} scheduled changes`, { 
      resourceType, 
      resourceId,
      storeId 
    });
    
    return scheduledChanges;
  } catch (error) {
    logger.error('Error getting scheduled changes', { 
      resourceType, 
      resourceId,
      storeId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete scheduled change by ID
 * 
 * @param {string} id - Scheduled change ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteScheduledChangeById(id) {
  try {
    // Input validation
    if (!dbValidation.validateObjectId(id)) {
      throw new Error('Invalid scheduled change ID format');
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, cannot delete scheduled change');
      return false;
    }
    
    // Delete scheduled change
    const result = await db.collection(RESOURCE_TYPES.SCHEDULED_CHANGE)
      .deleteOne({ _id: new ObjectId(id) });
    
    logger.info(`Deleted scheduled change with ID: ${id}`, { 
      deleted: result.deletedCount 
    });
    
    return result.deletedCount > 0;
  } catch (error) {
    logger.error('Error deleting scheduled change by ID', { 
      id, 
      error: error.message
    });
    throw error;
  }
}

/**
 * Get custom rules
 * 
 * @param {Object} options - Options for the query
 * @param {string} options.resourceType - Type of resource ('product' or 'collection')
 * @param {string} options.storeId - Store identifier (default: 'default')
 * @param {boolean} options.activeOnly - Whether to return only active items (default: true)
 * @returns {Promise<Array>} Array of custom rules
 */
async function getCustomRules(options = {}) {
  const { 
    resourceType,
    storeId = 'default',
    activeOnly = true
  } = options;
  
  try {
    // Build query
    const query = { storeId };
    
    if (resourceType) {
      if (!['product', 'collection'].includes(resourceType)) {
        throw new Error('Invalid resource type. Must be "product" or "collection"');
      }
      query.resourceType = resourceType;
    }
    
    if (activeOnly) {
      query.active = true;
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, using fallback data');
      return [];
    }
    
    // Fetch custom rules
    const customRules = await db.collection(RESOURCE_TYPES.CUSTOM_RULE)
      .find(query)
      .sort({ priority: 1 })
      .toArray();
    
    logger.debug(`Retrieved ${customRules.length} custom rules`, { 
      resourceType, 
      storeId 
    });
    
    return customRules;
  } catch (error) {
    logger.error('Error getting custom rules', { 
      resourceType, 
      storeId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete custom rule by ID
 * 
 * @param {string} id - Custom rule ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteCustomRuleById(id) {
  try {
    // Input validation
    if (!dbValidation.validateObjectId(id)) {
      throw new Error('Invalid custom rule ID format');
    }
    
    // Use the database connection to query
    const db = await database.connectToDatabase();
    if (!db) {
      logger.warn('Database not available, cannot delete custom rule');
      return false;
    }
    
    // Delete custom rule
    const result = await db.collection(RESOURCE_TYPES.CUSTOM_RULE)
      .deleteOne({ _id: new ObjectId(id) });
    
    logger.info(`Deleted custom rule with ID: ${id}`, { 
      deleted: result.deletedCount 
    });
    
    return result.deletedCount > 0;
  } catch (error) {
    logger.error('Error deleting custom rule by ID', { 
      id, 
      error: error.message
    });
    throw error;
  }
}

/**
 * Process pending scheduled changes
 * 
 * @param {string} storeId - Store identifier (default: 'default')
 * @returns {Promise<Array>} Array of processed scheduled changes
 */
async function processPendingScheduledChanges(storeId = 'default') {
  try {
    // Get pending scheduled changes
    const pendingChanges = await database.getPendingScheduledChanges(storeId);
    
    if (!pendingChanges || pendingChanges.length === 0) {
      logger.info('No pending scheduled changes to process', { storeId });
      return [];
    }
    
    logger.info(`Processing ${pendingChanges.length} pending scheduled changes`, { storeId });
    
    const processed = [];
    
    // Process each change
    for (const change of pendingChanges) {
      try {
        // Apply the template change based on resource type
        if (change.resourceType === 'global') {
          // Update global template
          const globalTemplates = await database.getGlobalTemplates(storeId);
          
          // Create updated templates object
          const updatedTemplates = { ...globalTemplates };
          
          // Update the relevant part (assumed to be home for global)
          updatedTemplates.home = change.template;
          
          // Save updated templates
          await database.saveGlobalTemplates(updatedTemplates, storeId);
        } else if (change.resourceType === 'product' || change.resourceType === 'collection') {
          // Save custom template for specific resource
          await database.saveCustomTemplate(
            change.resourceType,
            change.resourceId,
            change.template,
            storeId
          );
        }
        
        // Mark scheduled change as executed
        await database.markScheduledChangeExecuted(change._id);
        
        // Add to processed list
        processed.push({
          id: change._id,
          name: change.name,
          resourceType: change.resourceType,
          resourceId: change.resourceId,
          scheduledDate: change.scheduledDate,
          status: 'success'
        });
        
        logger.info(`Processed scheduled change: ${change.name}`, {
          id: change._id,
          resourceType: change.resourceType,
          resourceId: change.resourceId
        });
      } catch (error) {
        logger.error(`Error processing scheduled change: ${change.name}`, {
          id: change._id,
          resourceType: change.resourceType,
          resourceId: change.resourceId,
          error: error.message
        });
        
        // Add to processed list with error
        processed.push({
          id: change._id,
          name: change.name,
          resourceType: change.resourceType,
          resourceId: change.resourceId,
          scheduledDate: change.scheduledDate,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return processed;
  } catch (error) {
    logger.error('Error processing pending scheduled changes', { 
      storeId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  RESOURCE_TYPES,
  getTemplates,
  getTemplateById,
  deleteTemplateById,
  updateTemplateStatus,
  getScheduledChanges,
  deleteScheduledChangeById,
  getCustomRules,
  deleteCustomRuleById,
  processPendingScheduledChanges
};