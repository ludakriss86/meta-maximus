/**
 * Meta Maximus Variable Parser
 * 
 * This service handles parsing and resolving variable templates for meta tags.
 * It supports basic variable substitution, conditional logic, and format modifiers.
 */

class VariableParser {
  constructor(options = {}) {
    this.options = options;
    this.variableResolvers = {};
    
    // Register default variables
    this.registerDefaultVariables();
  }
  
  /**
   * Register built-in variables
   */
  registerDefaultVariables() {
    // Basic variables - season and year are retained as they're still useful
    this.registerVariable('year', () => new Date().getFullYear());
    this.registerVariable('season', () => {
      const month = new Date().getMonth();
      if (month >= 2 && month <= 4) return 'Spring';
      if (month >= 5 && month <= 7) return 'Summer';
      if (month >= 8 && month <= 10) return 'Fall';
      return 'Winter';
    });
    
    // Store information
    this.registerVariable('storeName', () => this.options.storeName || 'Your Store');
  }
  
  /**
   * Register a custom variable with a resolver function
   * 
   * @param {string} name - Variable name
   * @param {Function} resolver - Function that returns the variable value
   */
  registerVariable(name, resolver) {
    this.variableResolvers[name] = resolver;
  }
  
  /**
   * Register product-specific variables
   * 
   * @param {Object} product - Shopify product object
   */
  registerProductVariables(product) {
    if (!product) return;
    
    this.registerVariable('productTitle', () => product.title);
    this.registerVariable('productType', () => product.product_type);
    this.registerVariable('productVendor', () => product.vendor);
    this.registerVariable('productPrice', () => {
      const variant = product.variants[0];
      return variant && variant.price ? `$${parseFloat(variant.price).toFixed(2)}` : '';
    });
    this.registerVariable('comparePrice', () => {
      const variant = product.variants[0];
      if (!variant || !variant.compare_at_price) return '';
      return `$${parseFloat(variant.compare_at_price).toFixed(2)}`;
    });
  }
  
  /**
   * Register store-level variables
   * 
   * @param {Object} storeData - Shopify shop object and stats
   */
  registerStoreVariables(storeData = {}) {
    const { shop, products = [], collections = [] } = storeData;
    
    if (shop) {
      this.registerVariable('storeName', () => shop.name);
      this.registerVariable('storeDomain', () => shop.domain);
      this.registerVariable('storeEmail', () => shop.email);
    }
    
    // Store stats
    this.registerVariable('totalProducts', () => String(products.length));
    this.registerVariable('collectionsCount', () => String(collections.length));
    
    // Calculate discount variables across all products
    this.registerDiscountVariables(products);
  }
  
  /**
   * Register collection-specific variables
   * 
   * @param {Object} collection - Shopify collection object
   * @param {Array} products - Products in the collection
   */
  registerCollectionVariables(collection, products = []) {
    if (!collection) return;
    
    this.registerVariable('collectionTitle', () => collection.title);
    this.registerVariable('collectionDescription', () => {
      if (!collection.body_html) return '';
      // Strip HTML and limit to first 100 chars
      const description = collection.body_html.replace(/<[^>]*>/g, '');
      return description.length > 100 ? description.substring(0, 97) + '...' : description;
    });
    this.registerVariable('collectionCount', () => String(products.length));
    
    // Calculate discount variables if products are provided
    this.registerDiscountVariables(products);
  }
  
  /**
   * Calculate and register discount-related variables
   * 
   * @param {Array} products - Array of product objects
   */
  registerDiscountVariables(products = []) {
    if (!products || products.length === 0) {
      this.registerVariable('maxDiscountPercentage', () => '0%');
      this.registerVariable('minDiscountPercentage', () => '0%');
      this.registerVariable('discountRange', () => '0%');
      this.registerVariable('hasDiscount', () => '');
      this.registerVariable('discountedCount', () => '0');
      this.registerVariable('avgDiscount', () => '0%');
      return;
    }
    
    // Calculate discount percentages for each product
    const discounts = products.map(product => {
      const variant = product.variants[0];
      if (!variant.compare_at_price || parseFloat(variant.compare_at_price) <= 0) {
        return 0;
      }
      const regularPrice = parseFloat(variant.compare_at_price);
      const salePrice = parseFloat(variant.price);
      return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
    });
    
    // Filter out zero discounts
    const nonZeroDiscounts = discounts.filter(discount => discount > 0);
    
    // Calculate discount variables
    const hasDiscounts = nonZeroDiscounts.length > 0;
    const maxDiscount = hasDiscounts ? Math.max(...nonZeroDiscounts) : 0;
    const minDiscount = hasDiscounts ? Math.min(...nonZeroDiscounts) : 0;
    const avgDiscount = hasDiscounts 
      ? Math.round(nonZeroDiscounts.reduce((sum, val) => sum + val, 0) / nonZeroDiscounts.length) 
      : 0;
    
    this.registerVariable('maxDiscountPercentage', () => hasDiscounts ? `${maxDiscount}%` : '0%');
    this.registerVariable('minDiscountPercentage', () => hasDiscounts ? `${minDiscount}%` : '0%');
    this.registerVariable('discountRange', () => {
      if (!hasDiscounts) return '0%';
      if (minDiscount === maxDiscount) return `${minDiscount}%`;
      return `${minDiscount}-${maxDiscount}%`;
    });
    this.registerVariable('hasDiscount', () => hasDiscounts ? 'true' : '');
    this.registerVariable('discountedCount', () => String(nonZeroDiscounts.length));
    this.registerVariable('avgDiscount', () => `${avgDiscount}%`);
  }
  
  /**
   * Resolve a variable's value
   * 
   * @param {string} name - Variable name
   * @param {Object} data - Optional data to override registered variables
   * @returns {string} - Resolved value
   */
  resolveVariable(name, data = {}) {
    // Check if variable exists in provided data
    if (data.hasOwnProperty(name)) {
      return data[name];
    }
    
    // Check if variable has a registered resolver
    if (this.variableResolvers.hasOwnProperty(name)) {
      return this.variableResolvers[name]();
    }
    
    // Variable not found
    return '';
  }
  
  /**
   * Parse a template string and replace variables with their values
   * 
   * @param {string} template - Template string with variables in {{name}} format
   * @param {Object} data - Optional data to override registered variables
   * @returns {string} - Parsed string with variables replaced
   */
  parse(template, data = {}) {
    if (!template) return '';
    
    // Use the advanced parser for all parsing to handle both simple variables and conditionals
    return this.advancedParse(template, data);
  }
  
  /**
   * Evaluate a condition based on variable values
   * 
   * @param {string} condition - Condition string (e.g., "hasDiscount", "maxDiscountPercentage > 30")
   * @param {Object} data - Variable data
   * @returns {boolean} - Whether condition is true
   */
  evaluateCondition(condition, data) {
    // Simple boolean variable (e.g., "hasDiscount")
    if (!condition.includes('>') && !condition.includes('<') && !condition.includes('==')) {
      return Boolean(this.resolveVariable(condition.trim(), data));
    }
    
    // Comparison operations
    if (condition.includes('>')) {
      const [varName, valueStr] = condition.split('>').map(part => part.trim());
      const varValue = parseFloat(this.resolveVariable(varName, data));
      const compareValue = parseFloat(valueStr);
      return varValue > compareValue;
    }
    
    if (condition.includes('<')) {
      const [varName, valueStr] = condition.split('<').map(part => part.trim());
      const varValue = parseFloat(this.resolveVariable(varName, data));
      const compareValue = parseFloat(valueStr);
      return varValue < compareValue;
    }
    
    if (condition.includes('==')) {
      const [varName, valueStr] = condition.split('==').map(part => part.trim());
      const varValue = this.resolveVariable(varName, data);
      // Strip quotes if present
      const compareValue = valueStr.replace(/^["'](.*)["']$/, '$1');
      return String(varValue) === String(compareValue);
    }
    
    // Default fallback
    return false;
  }
  
  /**
   * Format a variable value using modifiers
   * 
   * @param {string} value - The raw variable value
   * @param {string} modifier - The modifier name (e.g., "lowercase", "uppercase")
   * @returns {string} - The formatted value
   */
  applyFormatModifier(value, modifier) {
    if (!modifier) return value;
    
    switch (modifier) {
      case 'lowercase':
        return String(value).toLowerCase();
      case 'uppercase':
        return String(value).toUpperCase();
      case 'number':
        return String(parseFloat(value));
      default:
        // Check for date format modifiers
        if (modifier.startsWith('date(') && modifier.endsWith(')')) {
          // Custom date formatting would be implemented here
          // For MVP, we'll just return the basic formatted date
          return value;
        }
        return value;
    }
  }
  
  /**
   * Advanced parse method with support for conditionals and format modifiers
   * 
   * @param {string} template - Template string
   * @param {Object} data - Variable data
   * @returns {string} - Processed template
   */
  advancedParse(template, data = {}) {
    if (!template) return '';
    
    let result = template;
    
    // Process conditional blocks first (if/else/endif)
    result = this.processConditionals(result, data);
    
    // Process variables with potential format modifiers
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
      // Check for modifiers (format: "varName:modifier")
      const parts = content.trim().split(':');
      const varName = parts[0].trim();
      const modifier = parts.length > 1 ? parts[1].trim() : null;
      
      // Get the raw value
      const value = this.resolveVariable(varName, data);
      
      // Apply modifier if present
      return modifier ? this.applyFormatModifier(value, modifier) : value;
    });
    
    return result;
  }
  
  /**
   * Process conditional blocks in the template
   * 
   * @param {string} template - Template string
   * @param {Object} data - Variable data
   * @returns {string} - Processed template with conditionals resolved
   */
  processConditionals(template, data = {}) {
    let result = template;
    
    // Pattern to match conditional blocks: {{if condition}}...{{else}}...{{endif}}
    const conditionalPattern = /\{\{if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{endif\}\}/g;
    
    // Replace all conditional blocks
    result = result.replace(conditionalPattern, (match, condition, ifContent, elseContent = '') => {
      const conditionMet = this.evaluateCondition(condition, data);
      return conditionMet ? ifContent : elseContent;
    });
    
    return result;
  }
  
  /**
   * Extract all variable names used in a template
   * 
   * @param {string} template - Template string
   * @returns {Array} - List of variable names
   */
  getVariableNames(template) {
    if (!template) return [];
    
    const variablePattern = /\{\{([^}:]+)(?::([^}]+))?\}\}/g;
    const variables = new Set();
    let match;
    
    while ((match = variablePattern.exec(template)) !== null) {
      variables.add(match[1].trim());
    }
    
    // Also extract variables from conditional statements
    const conditionalPattern = /\{\{if\s+([^}><=]+)(?:[><=]+([^}]+))?\}\}/g;
    while ((match = conditionalPattern.exec(template)) !== null) {
      variables.add(match[1].trim());
    }
    
    return Array.from(variables);
  }
  
  /**
   * Get all available variables organized by category
   * 
   * @returns {Object} - Categorized variable names
   */
  getAllVariablesByCategory() {
    return {
      basic: ['year', 'season'],
      store: ['storeName', 'storeDomain', 'storeEmail', 'totalProducts', 'collectionsCount'],
      product: ['productTitle', 'productType', 'productVendor', 'productPrice', 'comparePrice'],
      collection: ['collectionTitle', 'collectionDescription', 'collectionCount'],
      discount: [
        'maxDiscountPercentage', 
        'minDiscountPercentage', 
        'discountRange', 
        'hasDiscount', 
        'discountedCount',
        'avgDiscount'
      ],
      conditionals: ['if', 'else', 'endif'],
      modifiers: ['lowercase', 'uppercase']
    };
  }
}

module.exports = VariableParser;

// Example usage:
/*
const parser = new VariableParser();

// Register product data
parser.registerProductVariables({
  title: "Men's Cotton T-Shirt",
  product_type: "T-Shirt",
  vendor: "Brand Name",
  variants: [{
    price: "29.99",
    compare_at_price: "39.99"
  }]
});

// Parse a template with conditional logic
const template = "{{if hasDiscount}}Save up to {{maxDiscountPercentage}} on {{productTitle}}!{{else}}Shop our {{productTitle}} - New Items for {{season}} {{year}}{{endif}}";
console.log(parser.parse(template));
*/