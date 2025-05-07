# MongoDB Integration Plan for Meta Maximus

## Overview

This plan outlines the steps to integrate MongoDB as the persistent storage solution for Meta Maximus, replacing the current in-memory storage approach. MongoDB will store all templates, scheduled changes, and application state.

## Database Design

### Collections Structure

1. **templates**
   - Global templates for products, collections, and homepage
   - Document structure:
     ```json
     {
       "_id": ObjectId,
       "type": "global",
       "product": {
         "title": "{{productTitle}} - {{season}} {{year}} | {{storeName}}",
         "description": "Shop our premium {{productTitle}} for {{season}} {{year}}..."
       },
       "collection": {
         "title": "{{collectionTitle}} - {{season}} {{year}} Collection | {{storeName}}",
         "description": "Explore our {{collectionTitle}} for {{season}} {{year}}..."
       },
       "home": {
         "title": "{{storeName}} - {{season}} {{year}} Collection",
         "description": "Shop our collection of quality products..."
       },
       "storeId": "shop_domain.myshopify.com",
       "createdAt": ISODate,
       "updatedAt": ISODate
     }
     ```
   - Indexes:
     - `{ storeId: 1 }` - For fast lookup by store
     - `{ type: 1, storeId: 1 }` - For looking up global templates by store

2. **customTemplates**
   - Custom templates for specific products and collections
   - Document structure:
     ```json
     {
       "_id": ObjectId,
       "resourceType": "product|collection",
       "resourceId": "12345678",
       "title": "Custom title template for {{productTitle}}",
       "description": "Custom description template...",
       "storeId": "shop_domain.myshopify.com",
       "active": true,
       "createdAt": ISODate,
       "updatedAt": ISODate
     }
     ```
   - Indexes:
     - `{ resourceType: 1, resourceId: 1, storeId: 1 }` - For fast lookup of specific resources
     - `{ storeId: 1, active: 1 }` - For finding all active custom templates for a store

3. **scheduledChanges**
   - Scheduled templates set to activate at specific times
   - Document structure:
     ```json
     {
       "_id": ObjectId,
       "name": "Summer Sale 2025",
       "resourceType": "global|product|collection",
       "resourceId": "12345678|null",
       "template": {
         "title": "Summer Sale {{year}} - Save up to {{maxDiscountPercentage}}!",
         "description": "Limited time offer: Save up to {{maxDiscountPercentage}}..."
       },
       "scheduledDate": ISODate,
       "endDate": ISODate|null,
       "executed": false,
       "active": true,
       "storeId": "shop_domain.myshopify.com",
       "createdAt": ISODate,
       "updatedAt": ISODate
     }
     ```
   - Indexes:
     - `{ storeId: 1, active: 1, executed: 1, scheduledDate: 1 }` - For finding pending changes
     - `{ resourceType: 1, resourceId: 1, storeId: 1 }` - For finding scheduled changes for specific resources

4. **customRules**
   - Rules for applying templates to specific products/collections based on criteria
   - Document structure:
     ```json
     {
       "_id": ObjectId,
       "name": "Summer Collection Rule",
       "resourceType": "product|collection",
       "criteria": {
         "tags": ["summer", "2025"],
         "productType": "t-shirt",
         "vendor": "BrandName",
         "collectionId": "12345678"
       },
       "template": {
         "title": "{{productTitle}} - Summer {{year}} | {{storeName}}",
         "description": "Shop our premium {{productTitle}} for Summer {{year}}..."
       },
       "priority": 1,
       "active": true,
       "storeId": "shop_domain.myshopify.com",
       "createdAt": ISODate,
       "updatedAt": ISODate
     }
     ```
   - Indexes:
     - `{ storeId: 1, resourceType: 1, active: 1, priority: 1 }` - For finding applicable rules
     - `{ "criteria.tags": 1, storeId: 1 }` - For finding rules by specific tags

5. **sessions**
   - Store Shopify session data for authentication
   - Document structure:
     ```json
     {
       "_id": ObjectId,
       "shop": "shop_domain.myshopify.com",
       "accessToken": "shpat_...",
       "scopes": ["read_products", "write_products", ...],
       "expiresAt": ISODate,
       "createdAt": ISODate,
       "updatedAt": ISODate
     }
     ```
   - Indexes:
     - `{ shop: 1 }` - For looking up sessions by shop
     - `{ expiresAt: 1 }` - For cleaning up expired sessions

## Implementation Steps

### 1. Setup MongoDB Connection

1. Create MongoDB connection in `database.js`:
   ```javascript
   // Connection URI from environment variables
   const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
   const dbName = process.env.MONGODB_DB_NAME || 'meta-maximus';
   
   // Create a MongoDB client
   const client = new MongoClient(uri, { 
     useNewUrlParser: true, 
     useUnifiedTopology: true 
   });
   
   // Connect to MongoDB
   async function connectToDatabase() {
     try {
       await client.connect();
       console.log('Connected to MongoDB');
       db = client.db(dbName);
       await initializeCollections();
       return db;
     } catch (error) {
       console.error('Error connecting to MongoDB:', error);
       console.log('Falling back to in-memory storage');
       return null;
     }
   }
   ```

2. Add environment variables to `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=meta-maximus
   ```

### 2. Database Function Implementation

Replace the existing database functions with MongoDB implementations:

1. **getGlobalTemplates**:
   ```javascript
   async function getGlobalTemplates(storeId) {
     try {
       const globalTemplate = await db.collection('templates').findOne({ 
         type: 'global', 
         storeId 
       });
       
       if (!globalTemplate) {
         // Return default templates if none found
         return {
           product: { ... default templates ... },
           collection: { ... default templates ... },
           home: { ... default templates ... }
         };
       }
       
       return {
         product: globalTemplate.product,
         collection: globalTemplate.collection,
         home: globalTemplate.home
       };
     } catch (error) {
       console.error('Error getting global templates:', error);
       // Fall back to default templates
       return { ... default templates ... };
     }
   }
   ```

2. **saveGlobalTemplates**:
   ```javascript
   async function saveGlobalTemplates(templates, storeId) {
     try {
       const update = await db.collection('templates').updateOne(
         { type: 'global', storeId },
         { 
           $set: { 
             ...templates, 
             updatedAt: new Date() 
           },
           $setOnInsert: { 
             createdAt: new Date(),
             type: 'global', 
             storeId 
           }
         },
         { upsert: true }
       );
       
       return templates;
     } catch (error) {
       console.error('Error saving global templates:', error);
       throw error;
     }
   }
   ```

3. **getCustomTemplate**:
   ```javascript
   async function getCustomTemplate(resourceType, resourceId, storeId) {
     try {
       const customTemplate = await db.collection('customTemplates').findOne({
         resourceType,
         resourceId,
         storeId,
         active: true
       });
       
       return customTemplate || null;
     } catch (error) {
       console.error(`Error getting custom template:`, error);
       return null;
     }
   }
   ```

4. Similar implementation for remaining database functions:
   - saveCustomTemplate
   - scheduleTemplateChange
   - getPendingScheduledChanges
   - markScheduledChangeExecuted
   - getHomePageTemplate
   - saveHomePageTemplate

### 3. Add Indexes for Performance

Create indexes for each collection to optimize query performance:

```javascript
async function initializeCollections() {
  try {
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Templates collection
    if (!collectionNames.includes('templates')) {
      await db.createCollection('templates');
      await db.collection('templates').createIndex({ storeId: 1 });
      await db.collection('templates').createIndex({ type: 1, storeId: 1 });
    }
    
    // Custom templates collection
    if (!collectionNames.includes('customTemplates')) {
      await db.createCollection('customTemplates');
      await db.collection('customTemplates').createIndex({ resourceType: 1, resourceId: 1, storeId: 1 });
      await db.collection('customTemplates').createIndex({ storeId: 1, active: 1 });
    }
    
    // Scheduled changes collection
    if (!collectionNames.includes('scheduledChanges')) {
      await db.createCollection('scheduledChanges');
      await db.collection('scheduledChanges').createIndex({ storeId: 1, active: 1, executed: 1, scheduledDate: 1 });
      await db.collection('scheduledChanges').createIndex({ resourceType: 1, resourceId: 1, storeId: 1 });
    }
    
    // Custom rules collection
    if (!collectionNames.includes('customRules')) {
      await db.createCollection('customRules');
      await db.collection('customRules').createIndex({ storeId: 1, resourceType: 1, active: 1, priority: 1 });
      await db.collection('customRules').createIndex({ "criteria.tags": 1, storeId: 1 });
    }
    
    // Sessions collection
    if (!collectionNames.includes('sessions')) {
      await db.createCollection('sessions');
      await db.collection('sessions').createIndex({ shop: 1 }, { unique: true });
      await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }
  } catch (error) {
    console.error('Error initializing collections:', error);
    throw error;
  }
}
```

### 4. Error Handling & Fallbacks

Implement robust error handling to ensure the application remains functional even if MongoDB is temporarily unavailable:

```javascript
// Database operations with fallback
async function withFallback(operation, fallbackData) {
  try {
    // Attempt to connect to database if not already connected
    if (!client.topology || !client.topology.isConnected()) {
      await connectToDatabase();
    }
    
    // Execute the database operation
    return await operation();
  } catch (error) {
    console.error('Database operation error, using fallback:', error);
    return fallbackData;
  }
}
```

### 5. Session Management

Implement Shopify session storage in MongoDB:

```javascript
// Store a Shopify session
async function storeSession(session) {
  try {
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
  } catch (error) {
    console.error('Error storing session:', error);
    return false;
  }
}

// Load a Shopify session
async function loadSession(shop) {
  try {
    const session = await db.collection('sessions').findOne({ shop });
    return session;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}
```

### 6. Data Validation

Implement data validation to ensure data integrity:

```javascript
// Template validation
function validateTemplate(template) {
  if (!template) {
    throw new Error('Template is required');
  }
  
  // Validate title if present
  if (template.title && typeof template.title !== 'string') {
    throw new Error('Template title must be a string');
  }
  
  // Validate description if present
  if (template.description && typeof template.description !== 'string') {
    throw new Error('Template description must be a string');
  }
  
  return true;
}
```

## Testing Plan

1. **Unit Tests**
   - Test MongoDB connection and reconnection logic
   - Test CRUD operations for each collection
   - Test fallback mechanisms

2. **Integration Tests**
   - Test template storage and retrieval
   - Test scheduled changes processing
   - Test session management

3. **Performance Tests**
   - Measure query response times
   - Test with large datasets
   - Verify index effectiveness

## Deployment Considerations

1. **MongoDB Atlas Setup**
   - Create cluster in MongoDB Atlas
   - Set up network access rules
   - Create database user with appropriate permissions

2. **Environment Configuration**
   - Set up environment variables for production
   - Use connection string with authentication
   - Configure connection pooling appropriately

3. **Security**
   - Ensure all database credentials are stored securely
   - Enable MongoDB authentication
   - Consider field-level encryption for sensitive data

## Migration

1. **Data Migration Script**
   - Create script to migrate from in-memory to MongoDB
   - Preserve existing templates and scheduled changes

2. **Rollback Plan**
   - Create a backup of all data before migration
   - Implement ability to revert to in-memory storage if issues arise

## Monitoring & Maintenance

1. **Monitoring**
   - Set up MongoDB Atlas monitoring
   - Implement application-level logging for database operations
   - Set up alerts for connection issues

2. **Maintenance**
   - Schedule regular backups
   - Plan for index optimization
   - Set up database cleanup tasks (e.g., old sessions, executed scheduled changes)

## Implementation Timeline

1. **Phase 1: Basic MongoDB Integration (Week 1)**
   - Implement connection setup
   - Convert basic CRUD operations
   - Set up indexes

2. **Phase 2: Advanced Features (Week 2)**
   - Implement error handling and fallbacks
   - Add session management
   - Set up data validation

3. **Phase 3: Testing & Optimization (Week 3)**
   - Write unit and integration tests
   - Optimize queries and indexes
   - Perform load testing

4. **Phase 4: Deployment & Monitoring (Week 4)**
   - Set up production MongoDB cluster
   - Implement monitoring
   - Deploy to production

_Note: This plan assumes a fresh MongoDB installation. If you're using an existing MongoDB instance, adjust the setup steps accordingly._