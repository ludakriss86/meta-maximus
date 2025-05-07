/**
 * Database Validation Service for Meta Maximus
 * 
 * Provides schema validation for MongoDB collections
 */

const logger = require('./logger');

/**
 * MongoDB schema for templates collection
 */
const templatesSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["type", "storeId", "createdAt", "updatedAt"],
      properties: {
        type: {
          bsonType: "string",
          enum: ["global"]
        },
        product: {
          bsonType: "object",
          required: ["title", "description"],
          properties: {
            title: { bsonType: "string" },
            description: { bsonType: "string" }
          }
        },
        collection: {
          bsonType: "object",
          required: ["title", "description"],
          properties: {
            title: { bsonType: "string" },
            description: { bsonType: "string" }
          }
        },
        home: {
          bsonType: "object",
          required: ["title", "description"],
          properties: {
            title: { bsonType: "string" },
            description: { bsonType: "string" }
          }
        },
        storeId: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
};

/**
 * MongoDB schema for customTemplates collection
 */
const customTemplatesSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["resourceType", "resourceId", "storeId", "active", "createdAt", "updatedAt"],
      properties: {
        resourceType: {
          bsonType: "string",
          enum: ["product", "collection"]
        },
        resourceId: { bsonType: "string" },
        title: { bsonType: "string" },
        description: { bsonType: "string" },
        storeId: { bsonType: "string" },
        active: { bsonType: "bool" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
};

/**
 * MongoDB schema for scheduledChanges collection
 */
const scheduledChangesSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "resourceType", "template", "scheduledDate", "executed", "active", "storeId", "createdAt", "updatedAt"],
      properties: {
        name: { bsonType: "string" },
        resourceType: {
          bsonType: "string",
          enum: ["global", "product", "collection"]
        },
        resourceId: { bsonType: ["string", "null"] },
        template: {
          bsonType: "object",
          required: ["title", "description"],
          properties: {
            title: { bsonType: "string" },
            description: { bsonType: "string" }
          }
        },
        scheduledDate: { bsonType: "date" },
        endDate: { bsonType: ["date", "null"] },
        executed: { bsonType: "bool" },
        active: { bsonType: "bool" },
        storeId: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
};

/**
 * MongoDB schema for customRules collection
 */
const customRulesSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "resourceType", "criteria", "template", "priority", "active", "storeId", "createdAt", "updatedAt"],
      properties: {
        name: { bsonType: "string" },
        resourceType: {
          bsonType: "string",
          enum: ["product", "collection"]
        },
        criteria: {
          bsonType: "object",
          minProperties: 1
        },
        template: {
          bsonType: "object",
          required: ["title", "description"],
          properties: {
            title: { bsonType: "string" },
            description: { bsonType: "string" }
          }
        },
        priority: { bsonType: "int" },
        active: { bsonType: "bool" },
        storeId: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
};

/**
 * MongoDB schema for sessions collection
 */
const sessionsSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["shop", "accessToken", "expiresAt", "createdAt", "updatedAt"],
      properties: {
        shop: { bsonType: "string" },
        accessToken: { bsonType: "string" },
        scopes: { bsonType: "array" },
        expiresAt: { bsonType: "date" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "warn"
};

/**
 * MongoDB schema for all collections
 */
const collectionSchemas = {
  templates: templatesSchema,
  customTemplates: customTemplatesSchema,
  scheduledChanges: scheduledChangesSchema,
  customRules: customRulesSchema,
  sessions: sessionsSchema
};

/**
 * Apply validation schemas to collections
 * @param {Object} db - MongoDB database instance
 */
async function applyValidationSchemas(db) {
  try {
    logger.info('Applying validation schemas to collections...');
    
    for (const [collectionName, schema] of Object.entries(collectionSchemas)) {
      try {
        await db.command({ 
          collMod: collectionName,
          validator: schema.validator,
          validationLevel: schema.validationLevel,
          validationAction: schema.validationAction
        });
        
        logger.info(`Applied validation schema to collection: ${collectionName}`);
      } catch (error) {
        // Handle collection not found
        if (error.code === 26) {
          logger.warn(`Collection ${collectionName} not found, skipping schema validation`);
        } else {
          logger.error(`Error applying validation schema to ${collectionName}`, error);
        }
      }
    }
    
    logger.info('Finished applying validation schemas');
  } catch (error) {
    logger.error('Error applying validation schemas', error);
  }
}

/**
 * Sanitize user input for database operations
 * @param {Object} data - User input data
 * @returns {Object} Sanitized data
 */
function sanitizeInput(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Process all string properties
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      // Trim strings and sanitize potential MongoDB operators
      sanitized[key] = sanitized[key].trim().replace(/^\$/g, '_$');
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeInput(sanitized[key]);
    }
  });
  
  return sanitized;
}

/**
 * Validate template object
 * @param {Object} template - Template to validate
 * @throws {Error} If validation fails
 */
function validateTemplate(template) {
  if (!template) {
    throw new Error('Template is required');
  }
  
  // Validate title if present
  if (template.title !== undefined) {
    if (typeof template.title !== 'string') {
      throw new Error('Template title must be a string');
    }
    
    if (template.title.length > 1000) {
      throw new Error('Template title is too long (max 1000 characters)');
    }
  }
  
  // Validate description if present
  if (template.description !== undefined) {
    if (typeof template.description !== 'string') {
      throw new Error('Template description must be a string');
    }
    
    if (template.description.length > 5000) {
      throw new Error('Template description is too long (max 5000 characters)');
    }
  }
  
  return true;
}

/**
 * Validate store ID format
 * @param {string} storeId - Store ID to validate
 * @returns {boolean} Validation result
 */
function validateStoreId(storeId) {
  if (!storeId || typeof storeId !== 'string') {
    return false;
  }
  
  // Store ID should be alphanumeric plus some special chars like dots or dashes
  return /^[a-zA-Z0-9_.-]+$/.test(storeId) || /^[a-zA-Z0-9_.-]+\.myshopify\.com$/.test(storeId);
}

/**
 * Validate resource ID format
 * @param {string} resourceId - Resource ID to validate
 * @returns {boolean} Validation result
 */
function validateResourceId(resourceId) {
  if (!resourceId || typeof resourceId !== 'string') {
    return false;
  }
  
  // Shopify resource IDs are typically numeric or gids
  return /^\d+$/.test(resourceId) || /^gid:\/\/shopify\/\w+\/\d+$/.test(resourceId);
}

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} Validation result
 */
function validateObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return /^[0-9a-fA-F]{24}$/.test(id);
}

module.exports = {
  applyValidationSchemas,
  sanitizeInput,
  validateTemplate,
  validateStoreId,
  validateResourceId,
  validateObjectId
};