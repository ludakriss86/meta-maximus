const express = require('express');
require('@shopify/shopify-api/adapters/node');
const { shopifyApi, ApiVersion, LATEST_API_VERSION } = require('@shopify/shopify-api');
const database = require('../../src/services/database');
const VariableParser = require('../../src/services/variableParser');

const router = express.Router();

// Sample store data for development
const sampleStoreData = {
  shop: {
    name: 'Your Awesome Store',
    domain: 'your-store.myshopify.com',
    email: 'contact@example.com'
  },
  products: [],
  collections: []
};

// Initialize database connection
database.connectToDatabase().catch(err => {
  console.error('Failed to connect to database:', err);
  console.log('Will continue with fallback to in-memory storage');
});

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.HOST || 'localhost:3000',
  hostScheme: 'https',
  apiVersion: ApiVersion.January24 || LATEST_API_VERSION,
  isEmbeddedApp: true,
});

/**
 * API endpoint to get product meta fields
 */
router.get('/products/:id/metafields', async (req, res) => {
  try {
    const productId = req.params.id;
    const session = req.shopifySession;
    
    // Create a client
    const client = new shopify.clients.Rest({
      session: session
    });
    
    // Fetch metafields for the product
    const response = await client.get({
      path: `products/${productId}/metafields`,
    });
    
    res.json(response.body.metafields);
  } catch (error) {
    console.error('Error fetching product metafields:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to update product meta fields
 */
router.post('/products/:id/metafields', async (req, res) => {
  try {
    const productId = req.params.id;
    const { metaTitle, metaDescription } = req.body;
    const session = req.shopifySession;
    
    // Create a client
    const client = new shopify.clients.Rest({
      session: session
    });
    
    // Update metafields
    const updates = [];
    
    // Update title_tag if provided
    if (metaTitle) {
      updates.push(
        client.post({
          path: `products/${productId}/metafields`,
          data: {
            metafield: {
              namespace: 'global',
              key: 'title_tag',
              value: metaTitle,
              type: 'single_line_text_field',
            },
          },
        })
      );
    }
    
    // Update description_tag if provided
    if (metaDescription) {
      updates.push(
        client.post({
          path: `products/${productId}/metafields`,
          data: {
            metafield: {
              namespace: 'global',
              key: 'description_tag',
              value: metaDescription,
              type: 'single_line_text_field',
            },
          },
        })
      );
    }
    
    // Wait for all updates to complete
    await Promise.all(updates);
    
    // Return the updated metafields
    const updatedMetafields = await client.get({
      path: `products/${productId}/metafields`,
    });
    
    res.json(updatedMetafields.body.metafields);
  } catch (error) {
    console.error('Error updating product metafields:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to preview parsed meta tags
 */
router.post('/preview', (req, res) => {
  try {
    const { template, data } = req.body;
    
    // Initialize variable parser
    const parser = new VariableParser();
    
    // Parse template with provided data
    const parsedResult = parser.parse(template, data);
    
    res.json({ parsed: parsedResult });
  } catch (error) {
    console.error('Error parsing template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get global templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await database.getGlobalTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to save global templates
 */
router.post('/templates', async (req, res) => {
  try {
    const { product, collection } = req.body;
    const updateData = {};
    
    // Update templates
    if (product) {
      updateData.product = product;
    }
    
    if (collection) {
      updateData.collection = collection;
    }
    
    // Save templates to database
    const updatedTemplates = await database.saveGlobalTemplates(updateData);
    
    res.json({ 
      success: true, 
      message: 'Templates saved successfully',
      templates: updatedTemplates
    });
  } catch (error) {
    console.error('Error saving templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get home page meta template
 */
router.get('/homepage/template', async (req, res) => {
  try {
    // Get home page template from database
    const homePageTemplate = await database.getHomePageTemplate();
    
    if (!homePageTemplate) {
      // Return default template if none exists
      return res.json({
        isCustom: false,
        template: {
          title: "{{storeName}} - {{season}} {{year}} Collection",
          description: "Shop our collection of quality products. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} off with our current sale!{{else}}New items added regularly.{{endif}}"
        }
      });
    }
    
    res.json({
      isCustom: true,
      template: {
        title: homePageTemplate.title,
        description: homePageTemplate.description
      }
    });
  } catch (error) {
    console.error('Error getting home page template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to save home page meta template
 */
router.post('/homepage/template', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    // Validate template data
    if (!title && !description) {
      return res.status(400).json({ error: 'Missing template data' });
    }
    
    // Save home page template to database
    const updatedTemplate = await database.saveHomePageTemplate({
      title,
      description
    });
    
    res.json({
      success: true,
      message: 'Home page template saved successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error saving home page template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get store data with variables
 */
router.get('/store/data', async (req, res) => {
  try {
    const session = req.shopifySession;
    
    // In a real implementation, we would fetch data from Shopify API
    // For now, use sample data
    const storeData = { ...sampleStoreData };
    
    // Initialize variable parser
    const parser = new VariableParser();
    
    // Register store variables
    parser.registerStoreVariables(storeData);
    
    // Return available variables
    res.json({
      store: storeData.shop,
      variables: parser.getAllVariablesByCategory(),
      basicVariables: {
        storeName: parser.resolveVariable('storeName'),
        year: parser.resolveVariable('year'),
        season: parser.resolveVariable('season')
      }
    });
  } catch (error) {
    console.error('Error fetching store data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get custom template for a specific resource
 */
router.get('/:resourceType/:resourceId/template', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    // Validate resource type
    if (resourceType !== 'products' && resourceType !== 'collections') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }
    
    // Convert from plural to singular for database
    const type = resourceType === 'products' ? 'product' : 'collection';
    
    // Get custom template from database
    const customTemplate = await database.getCustomTemplate(type, resourceId);
    
    if (!customTemplate) {
      // Return global template if no custom template exists
      const globalTemplates = await database.getGlobalTemplates();
      return res.json({ 
        isCustom: false, 
        template: globalTemplates[type] 
      });
    }
    
    res.json({ 
      isCustom: true, 
      template: {
        title: customTemplate.title,
        description: customTemplate.description
      }
    });
  } catch (error) {
    console.error('Error getting custom template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to save custom template for a specific resource
 */
router.post('/:resourceType/:resourceId/template', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { title, description } = req.body;
    
    // Validate resource type
    if (resourceType !== 'products' && resourceType !== 'collections') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }
    
    // Convert from plural to singular for database
    const type = resourceType === 'products' ? 'product' : 'collection';
    
    // Validate template data
    if (!title && !description) {
      return res.status(400).json({ error: 'Missing template data' });
    }
    
    // Save custom template to database
    const updatedTemplate = await database.saveCustomTemplate(type, resourceId, {
      title,
      description
    });
    
    res.json({ 
      success: true, 
      message: 'Custom template saved successfully',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('Error saving custom template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to schedule a template change
 */
router.post('/:resourceType/:resourceId/schedule', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { title, description, scheduledDate } = req.body;
    
    // Validate resource type
    if (resourceType !== 'products' && resourceType !== 'collections') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }
    
    // Convert from plural to singular for database
    const type = resourceType === 'products' ? 'product' : 'collection';
    
    // Validate template data
    if (!title && !description) {
      return res.status(400).json({ error: 'Missing template data' });
    }
    
    // Validate scheduled date
    if (!scheduledDate) {
      return res.status(400).json({ error: 'Missing scheduled date' });
    }
    
    // Convert string date to Date object
    const scheduleTime = new Date(scheduledDate);
    
    // Schedule template change
    const schedule = await database.scheduleTemplateChange(type, resourceId, {
      title,
      description
    }, scheduleTime);
    
    res.json({ 
      success: true, 
      message: 'Template change scheduled successfully',
      schedule
    });
  } catch (error) {
    console.error('Error scheduling template change:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get product data with discount calculations
 */
router.get('/collections/:id/products', async (req, res) => {
  try {
    const collectionId = req.params.id;
    const session = req.shopifySession;
    
    // Create a client
    const client = new shopify.clients.Rest({
      session: session
    });
    
    // Fetch collection information
    const collectionResponse = await client.get({
      path: `collections/${collectionId}`,
    });
    
    // Fetch products in the collection
    const productsResponse = await client.get({
      path: `collections/${collectionId}/products`,
    });
    
    // Initialize variable parser
    const parser = new VariableParser();
    
    // Register collection variables
    parser.registerCollectionVariables(
      collectionResponse.body.collection,
      productsResponse.body.products
    );
    
    // Return collection data with discount variables
    res.json({
      collection: collectionResponse.body.collection,
      products: productsResponse.body.products,
      discountVariables: {
        maxDiscountPercentage: parser.resolveVariable('maxDiscountPercentage'),
        minDiscountPercentage: parser.resolveVariable('minDiscountPercentage'),
        discountRange: parser.resolveVariable('discountRange'),
        hasDiscount: parser.resolveVariable('hasDiscount'),
        discountedCount: parser.resolveVariable('discountedCount'),
      },
    });
  } catch (error) {
    console.error('Error fetching collection products:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;