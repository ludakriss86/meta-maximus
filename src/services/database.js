/**
 * Database Service for Meta Maximus
 * 
 * MongoDB connection and utility functions for database operations
 */

const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const logger = require('./logger');
const dbValidation = require('./dbValidation');
require('dotenv').config();

// Connection URI from environment variables
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'meta-maximus';

// Log connection info for debugging purposes in sanitized form
console.log('MongoDB Connection Info:');
console.log('- DB Name:', dbName);
console.log('- URI Present:', !!uri);
console.log('- URI Format:', uri ? (uri.startsWith('mongodb+srv://') ? 'srv format' : 'standard format') : 'missing');
if (uri && uri.includes('@')) {
  // Don't log credentials, just show protocol and host portion
  const [protocol, rest] = uri.split('://');
  const host = rest.split('@')[1];
  console.log('- Host:', protocol + '://****@' + host);
}

let client;
let db;

// Connection retry settings
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INITIAL_DELAY_MS = 500;

// In-memory storage as fallback
const inMemoryStorage = {
  globalTemplates: {
    product: {
      title: "{{productTitle}} - {{season}} {{year}} | Your Store",
      description: "Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{endif}}"
    },
    collection: {
      title: "{{collectionTitle}} - {{season}} {{year}} Collection | Your Store",
      description: "Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}"
    }
  },
  homePage: null,
  customTemplates: {},
  scheduled: []
};

// Development mode flag - set to false to use MongoDB
const USE_IN_MEMORY_STORAGE = false;

/**
 * Initialize database connection with retry logic
 */
async function connectToDatabase() {
  // Check if we should use in-memory storage
  if (USE_IN_MEMORY_STORAGE) {
    logger.info('Using in-memory storage for development');
    return null;
  }

  let retryAttempt = 0;
  let lastError = null;
  const startTime = Date.now();

  while (retryAttempt < MAX_RETRY_ATTEMPTS) {
    try {
      // Create a MongoDB client if it doesn't exist
      if (!client) {
        logger.debug('Creating new MongoDB client instance', { uri: uri.replace(/:[^\/]+@/, ':***@') });
        const options = {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
          // Connection pool settings
          maxPoolSize: 10,
          minPoolSize: 1,
          maxIdleTimeMS: 30000,
          // Timeout settings
          connectTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          // SSL settings for Heroku-compatible configuration
          ssl: true,
          // Disable all TLS/SSL certificate validation
          // This is necessary for some MongoDB Atlas configs to work with Heroku
          tls: true,
          tlsInsecure: true, // Allows insecure TLS connections
          tlsAllowInvalidCertificates: true,
          tlsAllowInvalidHostnames: true,
          tlsDisableCertificateRevocationCheck: true
        };
        
        client = new MongoClient(uri, options);
      }

      // Connect to MongoDB if not already connected
      if (!client.topology || !client.topology.isConnected()) {
        logger.info('Establishing MongoDB connection...', { database: dbName });
        await client.connect();
        
        const connectionDuration = Date.now() - startTime;
        logger.info('Connected to MongoDB', { 
          database: dbName, 
          durationMs: connectionDuration
        });
        
        db = client.db(dbName);
        await initializeCollections();
      }
      
      // Verify connection by running a simple command
      await db.command({ ping: 1 });
      logger.debug("Database connection verified successfully");
      
      return db;
    } catch (error) {
      lastError = error;
      retryAttempt++;
      
      // Categorize error for better handling
      const errorCategory = categorizeDatabaseError(error);
      
      if (errorCategory === 'FATAL') {
        logger.error(`Fatal database error, not retrying`, { 
          category: errorCategory,
          message: error.message,
          attempt: retryAttempt
        });
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_INITIAL_DELAY_MS * Math.pow(2, retryAttempt),
        30000 // Max 30 seconds
      );
      
      logger.warn(`MongoDB connection attempt failed`, { 
        attempt: retryAttempt,
        totalAttempts: MAX_RETRY_ATTEMPTS,
        errorCategory,
        message: error.message,
        retryDelayMs: delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const totalDuration = Date.now() - startTime;
  logger.error(`Failed to connect to MongoDB after multiple attempts`, {
    attempts: MAX_RETRY_ATTEMPTS,
    totalDurationMs: totalDuration,
    lastError: lastError ? { 
      message: lastError.message, 
      code: lastError.code,
      category: categorizeDatabaseError(lastError)
    } : null
  });
  
  logger.info('Using in-memory storage as fallback due to connection failure');
  return null;
}

/**
 * Categorize database errors for better handling
 * @param {Error} error - The database error to categorize
 * @returns {string} Error category: 'CONNECTION', 'TIMEOUT', 'AUTH', 'QUERY', or 'FATAL'
 */
function categorizeDatabaseError(error) {
  const errorMsg = error.message.toLowerCase();
  const errorCode = error.code;
  
  // Authentication errors
  if (errorMsg.includes('auth') || 
      errorMsg.includes('not authorized') || 
      errorCode === 18 || errorCode === 13) {
    return 'AUTH';
  }
  
  // Connection errors - can retry
  if (errorMsg.includes('connect') || 
      errorMsg.includes('network') || 
      errorMsg.includes('timeout') ||
      errorCode === 6 || errorCode === 7) {
    return 'CONNECTION';
  }
  
  // Timeout errors
  if (errorMsg.includes('timed out') || errorCode === 50) {
    return 'TIMEOUT';
  }
  
  // Query errors
  if (errorMsg.includes('query') || 
      errorMsg.includes('command') || 
      (errorCode >= 40 && errorCode <= 80)) {
    return 'QUERY';
  }
  
  // Fatal errors - don't retry
  if (errorMsg.includes('topology was destroyed') || 
      errorMsg.includes('server selection') ||
      errorCode === 74 || errorCode === 11000) {
    return 'FATAL';
  }
  
  // Default
  return 'UNKNOWN';
}

/**
 * Initialize required collections and create indexes
 */
async function initializeCollections() {
  try {
    logger.info('Initializing database collections and indexes...');
    
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Create templates collection if it doesn't exist
    if (!collectionNames.includes('templates')) {
      logger.info('Creating templates collection...');
      await db.createCollection('templates');
      
      // Create indexes
      await db.collection('templates').createIndex({ storeId: 1 });
      await db.collection('templates').createIndex({ type: 1, storeId: 1 });
      
      // Add default templates
      await db.collection('templates').insertOne({
        type: 'global',
        product: {
          title: "{{productTitle}} - {{season}} {{year}} | Your Store",
          description: "Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{endif}}"
        },
        collection: {
          title: "{{collectionTitle}} - {{season}} {{year}} Collection | Your Store",
          description: "Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}"
        },
        home: {
          title: "{{storeName}} - {{season}} {{year}} Collection",
          description: "Shop our collection of quality products. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} off with our current sale!{{else}}New items added regularly.{{endif}}"
        },
        storeId: 'default',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      logger.info('Templates collection created with default data');
    }
    
    // Create customTemplates collection if it doesn't exist
    if (!collectionNames.includes('customTemplates')) {
      logger.info('Creating customTemplates collection...');
      await db.createCollection('customTemplates');
      
      // Create indexes
      await db.collection('customTemplates').createIndex({ resourceType: 1, resourceId: 1, storeId: 1 });
      await db.collection('customTemplates').createIndex({ storeId: 1, active: 1 });
      
      logger.info('CustomTemplates collection created');
    }
    
    // Create scheduledChanges collection if it doesn't exist
    if (!collectionNames.includes('scheduledChanges')) {
      logger.info('Creating scheduledChanges collection...');
      await db.createCollection('scheduledChanges');
      
      // Create indexes
      await db.collection('scheduledChanges').createIndex({ storeId: 1, active: 1, executed: 1, scheduledDate: 1 });
      await db.collection('scheduledChanges').createIndex({ resourceType: 1, resourceId: 1, storeId: 1 });
      
      logger.info('ScheduledChanges collection created');
    }
    
    // Create customRules collection if it doesn't exist
    if (!collectionNames.includes('customRules')) {
      logger.info('Creating customRules collection...');
      await db.createCollection('customRules');
      
      // Create indexes
      await db.collection('customRules').createIndex({ storeId: 1, resourceType: 1, active: 1, priority: 1 });
      await db.collection('customRules').createIndex({ "criteria.tags": 1, storeId: 1 });
      
      logger.info('CustomRules collection created');
    }
    
    // Create sessions collection if it doesn't exist
    if (!collectionNames.includes('sessions')) {
      logger.info('Creating sessions collection...');
      await db.createCollection('sessions');
      
      // Create indexes
      await db.collection('sessions').createIndex({ shop: 1 }, { unique: true });
      await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      
      logger.info('Sessions collection created');
    }
    
    // Apply validation schemas to all collections
    await dbValidation.applyValidationSchemas(db);
    
    logger.info('Collections initialization completed successfully');
  } catch (error) {
    logger.error('Error initializing collections', error);
    throw error;
  }
}

/**
 * Helper function for database operations with fallback and retry logic
 * @param {Function} operation - Database operation to perform
 * @param {*} fallbackData - Data to return if operation fails
 * @param {Object} options - Additional options for the operation
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelayMs - Initial delay in milliseconds (default: 200)
 * @param {boolean} options.useTransaction - Whether to use a transaction (default: false)
 * @returns {*} Operation result or fallback data
 */
async function withFallback(operation, fallbackData, options = {}) {
  const { 
    maxRetries = 3, 
    initialDelayMs = 200, 
    useTransaction = false,
    operationName = 'database operation' 
  } = options;
  
  let retryAttempt = 0;
  let lastError = null;
  
  // Track operation timing for performance monitoring
  const startTime = Date.now();
  
  while (retryAttempt <= maxRetries) {
    let session = null;
    
    try {
      // Attempt to connect to database
      await connectToDatabase();
      
      // If connection failed or db is not available, return fallback
      if (!db) {
        console.warn(`No database connection available for ${operationName}, using fallback data`);
        return fallbackData;
      }
      
      // Execute the operation, optionally in a transaction
      if (useTransaction) {
        // Start a session for the transaction
        session = client.startSession();
        session.startTransaction({
          readConcern: { level: 'majority' },
          writeConcern: { w: 'majority' }
        });
        
        try {
          logger.debug(`Starting transaction for ${operationName}`);
          
          // Execute operation in transaction
          const result = await operation(session);
          
          // Commit the transaction
          await session.commitTransaction();
          
          // Log successful operation with timing
          const duration = Date.now() - startTime;
          logger.dbOperation(operationName, { 
            transaction: true, 
            status: 'success'
          }, duration);
          
          return result;
        } catch (txnError) {
          // Abort transaction on error
          logger.error(`Transaction error in ${operationName}`, txnError);
          await session.abortTransaction();
          throw txnError;
        } finally {
          // End session regardless of outcome
          session.endSession();
        }
      } else {
        // Execute without transaction
        const result = await operation();
        
        // Log successful operation with timing
        const duration = Date.now() - startTime;
        
        // Log operation details to database log
        logger.dbOperation(operationName, { 
          status: 'success'
        }, duration);
        
        // Log as debug if duration is normal, warn if slow
        const isSlowOperation = duration > 1000; // More than 1 second
        if (isSlowOperation) {
          logger.warn(`Slow operation detected: ${operationName}`, { durationMs: duration });
        } else {
          logger.debug(`${operationName} completed`, { durationMs: duration });
        }
        
        return result;
      }
    } catch (error) {
      lastError = error;
      retryAttempt++;
      
      // Clean up session if it exists
      if (session) {
        session.endSession();
      }
      
      // Categorize error for better handling
      const errorCategory = categorizeDatabaseError(error);
      const currentDuration = Date.now() - startTime;
      
      // Log the database operation error
      logger.dbOperation(operationName, {
        status: 'error',
        attempt: retryAttempt,
        maxRetries: maxRetries,
        errorCategory,
        errorCode: error.code,
        errorMessage: error.message
      }, currentDuration);
      
      // Log detailed error information
      logger.error(`Database operation error`, {
        operation: operationName,
        attempt: retryAttempt,
        maxRetries: maxRetries + 1,
        category: errorCategory,
        message: error.message,
        code: error.code,
        stack: error.stack,
        durationMs: currentDuration
      });
      
      // Some errors we shouldn't retry
      if (errorCategory === 'FATAL' || errorCategory === 'AUTH') {
        logger.error(`Fatal or authentication error, not retrying operation`, {
          operation: operationName,
          category: errorCategory
        });
        break;
      }
      
      // If we've reached max retries, stop trying
      if (retryAttempt > maxRetries) {
        logger.error(`Maximum retry attempts reached for database operation`, {
          operation: operationName,
          attempts: retryAttempt,
          maxRetries: maxRetries
        });
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const jitter = Math.random() * 0.3 + 0.85; // Random value between 0.85 and 1.15
      const delay = Math.min(
        initialDelayMs * Math.pow(2, retryAttempt - 1) * jitter,
        10000 // Max 10 seconds
      );
      
      logger.warn(`Retrying database operation`, {
        operation: operationName,
        attempt: retryAttempt,
        delayMs: Math.round(delay)
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all retries failed
  const duration = Date.now() - startTime;
  logger.error(`All database operation attempts failed`, {
    operation: operationName,
    attempts: retryAttempt,
    totalDurationMs: duration,
    lastError: lastError ? {
      message: lastError.message,
      code: lastError.code,
      category: categorizeDatabaseError(lastError)
    } : null
  });
  
  // Log the fallback usage
  logger.dbOperation(operationName, {
    status: 'fallback',
    attempts: retryAttempt,
    reason: lastError ? lastError.message : 'Unknown error'
  }, duration);
  
  // You could implement more sophisticated fallback logic here,
  // like a degraded mode or partial data recovery
  
  return fallbackData;
}

/**
 * Get global templates
 * 
 * @param {string} storeId - Store identifier
 * @returns {Object} Global templates object
 */
async function getGlobalTemplates(storeId = 'default') {
  // Input validation
  if (typeof storeId !== 'string') {
    console.error('Invalid storeId provided to getGlobalTemplates:', storeId);
    storeId = 'default';
  }
  
  return withFallback(
    async () => {
      const globalTemplate = await db.collection('templates').findOne({ 
        type: 'global', 
        storeId 
      });
      
      if (!globalTemplate) {
        // Return default templates if none found
        return {
          product: inMemoryStorage.globalTemplates.product,
          collection: inMemoryStorage.globalTemplates.collection,
          home: inMemoryStorage.homePage || {
            title: "{{storeName}} - {{season}} {{year}} Collection",
            description: "Shop our collection of quality products. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} off with our current sale!{{else}}New items added regularly.{{endif}}"
          }
        };
      }
      
      return {
        product: globalTemplate.product,
        collection: globalTemplate.collection,
        home: globalTemplate.home
      };
    },
    inMemoryStorage.globalTemplates,
    {
      operationName: 'getGlobalTemplates',
      maxRetries: 2,
      initialDelayMs: 100
    }
  );
}

/**
 * Save global templates
 * 
 * @param {Object} templates - Templates object
 * @param {string} storeId - Store identifier
 * @returns {Object} Updated templates
 */
async function saveGlobalTemplates(templates, storeId = 'default') {
  // Input validation
  if (!templates || typeof templates !== 'object') {
    throw new Error('Templates object is required');
  }
  
  if (typeof storeId !== 'string') {
    console.error('Invalid storeId provided to saveGlobalTemplates:', storeId);
    storeId = 'default';
  }
  
  return withFallback(
    async (session = null) => {
      // Deep clone the templates to prevent modification of the original
      const templatesCopy = JSON.parse(JSON.stringify(templates));
      
      // Validate templates - will throw an error if invalid
      if (templatesCopy.product) validateTemplate(templatesCopy.product);
      if (templatesCopy.collection) validateTemplate(templatesCopy.collection);
      
      // Create update document
      const updateDoc = {
        $set: { 
          updatedAt: new Date() 
        },
        $setOnInsert: { 
          createdAt: new Date(),
          type: 'global',
          storeId
        }
      };
      
      // Add product template if provided
      if (templatesCopy.product) {
        updateDoc.$set.product = templatesCopy.product;
      }
      
      // Add collection template if provided
      if (templatesCopy.collection) {
        updateDoc.$set.collection = templatesCopy.collection;
      }
      
      // Add home template if provided or use default
      if (templatesCopy.home) {
        updateDoc.$set.home = templatesCopy.home;
      } else if (!updateDoc.$set.home) {
        updateDoc.$setOnInsert.home = inMemoryStorage.homePage || {
          title: "{{storeName}} - {{season}} {{year}} Collection",
          description: "Shop our collection of quality products. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} off with our current sale!{{else}}New items added regularly.{{endif}}"
        };
      }
      
      // Get the collection with session if provided
      const collection = session 
        ? session.client.db(dbName).collection('templates')
        : db.collection('templates');
      
      // Update or insert global templates
      const result = await collection.updateOne(
        { type: 'global', storeId },
        updateDoc,
        { upsert: true }
      );
      
      if (result.acknowledged) {
        console.log(`Updated global templates for store ${storeId}:`, {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount
        });
      } else {
        console.warn('Operation not acknowledged by MongoDB server');
      }
      
      // Fetch and return the updated document
      const updatedTemplate = await collection.findOne({ type: 'global', storeId });
      return {
        product: updatedTemplate.product,
        collection: updatedTemplate.collection,
        home: updatedTemplate.home
      };
    },
    templates,
    {
      operationName: 'saveGlobalTemplates',
      useTransaction: true, // Use transaction for this critical operation
      maxRetries: 3,
      initialDelayMs: 200
    }
  );
}

/**
 * Get custom template for a specific resource
 * 
 * @param {string} resourceType - Type of resource ('product' or 'collection')
 * @param {string} resourceId - Shopify ID of the resource
 * @param {string} storeId - Store identifier
 * @returns {Object|null} Custom template or null if not found
 */
async function getCustomTemplate(resourceType, resourceId, storeId = 'default') {
  return withFallback(
    async () => {
      const customTemplate = await db.collection('customTemplates').findOne({
        resourceType,
        resourceId,
        storeId,
        active: true
      });
      
      return customTemplate || null;
    },
    null
  );
}

/**
 * Save custom template for a specific resource
 * 
 * @param {string} resourceType - Type of resource ('product' or 'collection')
 * @param {string} resourceId - Shopify ID of the resource
 * @param {Object} template - Template object with title and description
 * @param {string} storeId - Store identifier
 * @returns {Object} Updated template
 */
async function saveCustomTemplate(resourceType, resourceId, template, storeId = 'default') {
  // Input validation
  if (resourceType !== 'product' && resourceType !== 'collection') {
    throw new Error('Invalid resource type. Must be "product" or "collection"');
  }
  
  if (!dbValidation.validateResourceId(resourceId)) {
    throw new Error('Invalid resource ID format');
  }
  
  if (!dbValidation.validateStoreId(storeId)) {
    logger.warn('Invalid storeId provided, using default', { storeId });
    storeId = 'default';
  }
  
  // Sanitize input
  const sanitizedTemplate = dbValidation.sanitizeInput(template);
  
  return withFallback(
    async (session = null) => {
      // Validate template
      validateTemplate(sanitizedTemplate);
      
      // Get the collection with session if provided
      const collection = session 
        ? session.client.db(dbName).collection('customTemplates')
        : db.collection('customTemplates');
      
      // Update or insert custom template
      const result = await collection.updateOne(
        { resourceType, resourceId, storeId },
        { 
          $set: { 
            title: sanitizedTemplate.title,
            description: sanitizedTemplate.description,
            active: true,
            updatedAt: new Date() 
          },
          $setOnInsert: { 
            createdAt: new Date(),
            resourceType,
            resourceId,
            storeId
          }
        },
        { upsert: true }
      );
      
      if (result.acknowledged) {
        logger.debug(`Updated custom template for ${resourceType} ${resourceId}`, {
          storeId,
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount
        });
      }
      
      return sanitizedTemplate;
    },
    sanitizedTemplate,
    {
      operationName: 'saveCustomTemplate',
      maxRetries: 2,
      initialDelayMs: 200
    }
  );
}

/**
 * Schedule a template change
 * 
 * @param {string} resourceType - Type of resource ('product', 'collection', or 'global')
 * @param {string} resourceId - Shopify ID of the resource (null for global)
 * @param {Object} template - Template object with title and description
 * @param {Date} scheduledDate - Date when template should be applied
 * @param {Date|null} endDate - Optional end date for scheduled change
 * @param {string} name - Name of the scheduled change
 * @param {string} storeId - Store identifier
 * @returns {Object} Created schedule
 */
async function scheduleTemplateChange(resourceType, resourceId, template, scheduledDate, endDate = null, name = "", storeId = 'default') {
  return withFallback(
    async () => {
      // Validate template
      validateTemplate(template);
      
      // Create schedule document
      const schedule = {
        name: name || `Scheduled change for ${resourceType} ${resourceId || 'global'}`,
        resourceType,
        resourceId,
        template,
        scheduledDate,
        endDate,
        executed: false,
        active: true,
        storeId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert schedule
      const result = await db.collection('scheduledChanges').insertOne(schedule);
      
      // Return schedule with _id
      return { ...schedule, _id: result.insertedId };
    },
    {
      resourceType,
      resourceId,
      template,
      scheduledDate,
      endDate,
      executed: false,
      active: true,
      name: name || `Scheduled change for ${resourceType} ${resourceId || 'global'}`,
      storeId,
      createdAt: new Date(),
      _id: Date.now().toString() // Fake ID for fallback
    }
  );
}

/**
 * Get pending scheduled changes
 * 
 * @param {string} storeId - Store identifier
 * @returns {Array} Array of pending scheduled changes
 */
async function getPendingScheduledChanges(storeId = 'default') {
  return withFallback(
    async () => {
      const now = new Date();
      
      // Find all active, not executed scheduled changes where
      // scheduledDate <= now <= endDate (or endDate is null)
      const pendingChanges = await db.collection('scheduledChanges')
        .find({
          storeId,
          active: true,
          executed: false,
          scheduledDate: { $lte: now },
          $or: [
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        })
        .sort({ scheduledDate: 1 })
        .toArray();
      
      return pendingChanges;
    },
    []
  );
}

/**
 * Mark scheduled change as executed
 * 
 * @param {string} scheduleId - ID of the scheduled change
 * @returns {boolean} Success status
 */
async function markScheduledChangeExecuted(scheduleId) {
  return withFallback(
    async () => {
      const result = await db.collection('scheduledChanges').updateOne(
        { _id: new ObjectId(scheduleId) },
        { 
          $set: { 
            executed: true,
            updatedAt: new Date() 
          }
        }
      );
      
      return result.modifiedCount > 0;
    },
    true
  );
}

/**
 * Get home page template
 * 
 * @param {string} storeId - Store identifier
 * @returns {Object|null} Home page template or null if not found
 */
async function getHomePageTemplate(storeId = 'default') {
  return withFallback(
    async () => {
      const globalTemplate = await db.collection('templates').findOne({ 
        type: 'global', 
        storeId 
      });
      
      return globalTemplate?.home || null;
    },
    inMemoryStorage.homePage
  );
}

/**
 * Save home page template
 * 
 * @param {Object} template - Template object with title and description
 * @param {string} storeId - Store identifier
 * @returns {Object} Updated template
 */
async function saveHomePageTemplate(template, storeId = 'default') {
  return withFallback(
    async () => {
      // Validate template
      validateTemplate(template);
      
      // Update or insert home template in global templates
      await db.collection('templates').updateOne(
        { type: 'global', storeId },
        { 
          $set: { 
            home: template,
            updatedAt: new Date() 
          },
          $setOnInsert: { 
            createdAt: new Date(),
            type: 'global',
            storeId,
            product: inMemoryStorage.globalTemplates.product,
            collection: inMemoryStorage.globalTemplates.collection
          }
        },
        { upsert: true }
      );
      
      return template;
    },
    template
  );
}

/**
 * Get all custom rules
 * 
 * @param {string} resourceType - Optional type of resource ('product' or 'collection')
 * @param {string} storeId - Store identifier
 * @returns {Array} Array of custom rules
 */
async function getCustomRules(resourceType = null, storeId = 'default') {
  return withFallback(
    async () => {
      // Query object
      const query = { storeId };
      
      // Add resourceType if provided
      if (resourceType) {
        query.resourceType = resourceType;
      }
      
      // Find all custom rules
      const customRules = await db.collection('customRules')
        .find(query)
        .sort({ priority: 1 })
        .toArray();
      
      return customRules;
    },
    []
  );
}

/**
 * Save custom rule
 * 
 * @param {Object} rule - Custom rule object
 * @param {string} storeId - Store identifier
 * @returns {Object} Updated rule
 */
async function saveCustomRule(rule, storeId = 'default') {
  return withFallback(
    async () => {
      // Validate rule
      if (!rule.resourceType) {
        throw new Error('Resource type is required');
      }
      
      if (!rule.criteria) {
        throw new Error('Rule criteria are required');
      }
      
      validateTemplate(rule.template);
      
      // Create or update rule
      let savedRule;
      
      if (rule._id) {
        // Update existing rule
        const result = await db.collection('customRules').updateOne(
          { _id: new ObjectId(rule._id) },
          { 
            $set: { 
              name: rule.name,
              resourceType: rule.resourceType,
              criteria: rule.criteria,
              template: rule.template,
              priority: rule.priority || 1,
              active: rule.active !== false, // Default to true if not specified
              updatedAt: new Date() 
            }
          }
        );
        
        savedRule = { ...rule, updatedAt: new Date() };
      } else {
        // Create new rule
        const newRule = {
          name: rule.name || `Rule for ${rule.resourceType}`,
          resourceType: rule.resourceType,
          criteria: rule.criteria,
          template: rule.template,
          priority: rule.priority || 1,
          active: rule.active !== false, // Default to true if not specified
          storeId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await db.collection('customRules').insertOne(newRule);
        savedRule = { ...newRule, _id: result.insertedId };
      }
      
      return savedRule;
    },
    rule
  );
}

/**
 * Store Shopify session data
 * 
 * @param {Object} session - Shopify session object
 * @returns {boolean} Success status
 */
async function storeSession(session) {
  return withFallback(
    async () => {
      await db.collection('sessions').updateOne(
        { shop: session.shop },
        {
          $set: {
            accessToken: session.accessToken,
            scopes: session.scope,
            expiresAt: new Date(Date.now() + 24*60*60*1000), // 24 hours
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      return true;
    },
    false
  );
}

/**
 * Load Shopify session data
 * 
 * @param {string} shop - Shopify shop domain
 * @returns {Object|null} Session object or null if not found
 */
async function loadSession(shop) {
  return withFallback(
    async () => {
      const session = await db.collection('sessions').findOne({ shop });
      return session;
    },
    null
  );
}

/**
 * Template validation
 * 
 * @param {Object} template - Template object to validate
 * @returns {boolean} Validation result
 * @throws {Error} If validation fails
 */
function validateTemplate(template) {
  // Use the validation from dbValidation module
  return dbValidation.validateTemplate(template);
}

/**
 * Gracefully close the database connection
 * @returns {Promise<boolean>} Success status
 */
async function closeDatabaseConnection() {
  if (!client) {
    return true; // No connection to close
  }
  
  try {
    console.log('Gracefully closing MongoDB connection...');
    await client.close(true); // Force close
    console.log('MongoDB connection closed successfully');
    return true;
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    return false;
  }
}

// Clean up database connection on process exit
process.on('exit', () => {
  if (client) {
    console.log('Process exiting, closing database connection');
    // We can't use async functions in 'exit' handlers, so we use the sync version
    try {
      client.close(true);
    } catch (err) {
      console.error('Error during database disconnect on exit:', err);
    }
  }
});

// Handle other termination signals to gracefully close the connection
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, closing database connection...`);
    await closeDatabaseConnection();
    process.exit(0);
  });
});

/**
 * Check if the database is connected
 * @returns {boolean} True if connected, false otherwise
 */
function isConnected() {
  if (USE_IN_MEMORY_STORAGE) {
    return false;
  }
  
  return !!(client && client.topology && client.topology.isConnected());
}

module.exports = {
  connectToDatabase,
  closeDatabaseConnection,
  getGlobalTemplates,
  saveGlobalTemplates,
  getCustomTemplate,
  saveCustomTemplate,
  scheduleTemplateChange,
  getPendingScheduledChanges,
  markScheduledChangeExecuted,
  getHomePageTemplate,
  saveHomePageTemplate,
  getCustomRules,
  saveCustomRule,
  storeSession,
  loadSession,
  validateTemplate,
  isConnected
};