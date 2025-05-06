const express = require('express');
const { Shopify } = require('@shopify/shopify-api');
const VariableParser = require('../../src/services/variableParser');

const router = express.Router();

/**
 * API endpoint to get product meta fields
 */
router.get('/products/:id/metafields', async (req, res) => {
  try {
    const productId = req.params.id;
    const session = await getShopifySession(req);
    
    // Create a new client
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    
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
    const session = await getShopifySession(req);
    
    // Create a new client
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    
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
 * API endpoint to get product data with discount calculations
 */
router.get('/collections/:id/products', async (req, res) => {
  try {
    const collectionId = req.params.id;
    const session = await getShopifySession(req);
    
    // Create a new client
    const client = new Shopify.Clients.Rest(session.shop, session.accessToken);
    
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

/**
 * Get a Shopify session
 */
async function getShopifySession(req) {
  // For custom apps, we would normally use API key/password authentication
  // but for development purposes, we'll create a mock session
  
  // In a real implementation, you would use proper authentication methods
  // based on whether this is a custom app or a public app
  
  return {
    shop: process.env.SHOP,
    accessToken: process.env.SHOPIFY_API_SECRET,
  };
}

module.exports = router;