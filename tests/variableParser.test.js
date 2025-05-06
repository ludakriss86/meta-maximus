const VariableParser = require('../src/services/variableParser');

describe('VariableParser', () => {
  let parser;

  beforeEach(() => {
    parser = new VariableParser();
  });

  describe('Basic Variables', () => {
    test('should replace year variable', () => {
      const template = 'The year is {{year}}';
      const result = parser.parse(template);
      expect(result).toBe(`The year is ${new Date().getFullYear()}`);
    });

    test('should replace month variable', () => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonth = months[new Date().getMonth()];
      
      const template = 'The month is {{month}}';
      const result = parser.parse(template);
      expect(result).toBe(`The month is ${currentMonth}`);
    });

    test('should replace multiple variables', () => {
      const template = 'Shop our {{season}} {{year}} collection!';
      const result = parser.parse(template);
      
      // Determine expected season
      const month = new Date().getMonth();
      let season;
      if (month >= 2 && month <= 4) season = 'Spring';
      else if (month >= 5 && month <= 7) season = 'Summer';
      else if (month >= 8 && month <= 10) season = 'Fall';
      else season = 'Winter';
      
      expect(result).toBe(`Shop our ${season} ${new Date().getFullYear()} collection!`);
    });

    test('should handle variables with spaces', () => {
      const template = 'The current date is {{ date }}';
      const result = parser.parse(template);
      expect(result).toContain('The current date is ');
      expect(result).not.toBe(template);
    });
  });

  describe('Product Variables', () => {
    test('should replace product variables', () => {
      // Create a mock product
      const product = {
        title: 'Test Product',
        product_type: 'Test Type',
        vendor: 'Test Vendor',
        variants: [
          {
            price: '29.99',
            compare_at_price: '39.99'
          }
        ]
      };
      
      // Register product variables
      parser.registerProductVariables(product);
      
      const template = '{{productTitle}} by {{productVendor}} - On Sale!';
      const result = parser.parse(template);
      expect(result).toBe('Test Product by Test Vendor - On Sale!');
    });

    test('should handle product price formatting', () => {
      const product = {
        title: 'Price Test Product',
        variants: [
          {
            price: '9.99',
            compare_at_price: '19.99'
          }
        ]
      };
      
      parser.registerProductVariables(product);
      
      const template = 'Now {{productPrice}} (was {{comparePrice}})';
      const result = parser.parse(template);
      expect(result).toBe('Now $9.99 (was $19.99)');
    });
  });

  describe('Collection Variables', () => {
    test('should replace collection variables', () => {
      const collection = {
        title: 'Summer Collection',
        body_html: '<p>Our best summer items</p>'
      };
      
      const products = [
        { title: 'Product 1', variants: [{ price: '10.00', compare_at_price: null }] },
        { title: 'Product 2', variants: [{ price: '20.00', compare_at_price: null }] }
      ];
      
      parser.registerCollectionVariables(collection, products);
      
      const template = '{{collectionTitle}} ({{collectionCount}} items)';
      const result = parser.parse(template);
      expect(result).toBe('Summer Collection (2 items)');
    });

    test('should calculate discount variables correctly', () => {
      const collection = { title: 'Sale Collection' };
      
      const products = [
        { variants: [{ price: '80.00', compare_at_price: '100.00' }] }, // 20% off
        { variants: [{ price: '60.00', compare_at_price: '120.00' }] }, // 50% off
        { variants: [{ price: '30.00', compare_at_price: '30.00' }] }   // 0% off (no discount)
      ];
      
      parser.registerCollectionVariables(collection, products);
      
      expect(parser.parse('{{maxDiscountPercentage}}')).toBe('50%');
      expect(parser.parse('{{minDiscountPercentage}}')).toBe('20%');
      expect(parser.parse('{{discountRange}}')).toBe('20-50%');
      expect(parser.parse('{{hasDiscount}}')).toBe('true');
      expect(parser.parse('{{discountedCount}}')).toBe('2');
    });

    test('should handle collections with no discounts', () => {
      const collection = { title: 'Regular Collection' };
      
      const products = [
        { variants: [{ price: '100.00', compare_at_price: null }] },
        { variants: [{ price: '50.00', compare_at_price: '50.00' }] }
      ];
      
      parser.registerCollectionVariables(collection, products);
      
      expect(parser.parse('{{maxDiscountPercentage}}')).toBe('0%');
      expect(parser.parse('{{hasDiscount}}')).toBe('');
      expect(parser.parse('{{discountRange}}')).toBe('0%');
    });
  });

  describe('Conditional Logic', () => {
    test('should handle simple if condition with hasDiscount', () => {
      const collection = { title: 'Sale Collection' };
      const products = [
        { variants: [{ price: '80.00', compare_at_price: '100.00' }] }
      ];
      
      parser.registerCollectionVariables(collection, products);
      
      const template = '{{if hasDiscount}}ON SALE!{{else}}Regular Price{{endif}}';
      expect(parser.parse(template)).toBe('ON SALE!');
    });
    
    test('should use else block when condition is false', () => {
      const collection = { title: 'Regular Collection' };
      const products = [
        { variants: [{ price: '100.00', compare_at_price: null }] }
      ];
      
      parser.registerCollectionVariables(collection, products);
      
      const template = '{{if hasDiscount}}ON SALE!{{else}}Regular Price{{endif}}';
      expect(parser.parse(template)).toBe('Regular Price');
    });
    
    test('should handle comparison operators', () => {
      const data = {
        testValue: '25'
      };
      
      expect(parser.parse('{{if testValue > 20}}Greater{{else}}Smaller{{endif}}', data)).toBe('Greater');
      expect(parser.parse('{{if testValue < 20}}Smaller{{else}}Greater{{endif}}', data)).toBe('Greater');
      expect(parser.parse('{{if testValue == 25}}Equal{{else}}Not Equal{{endif}}', data)).toBe('Equal');
    });
    
    test('should process nested variables within conditionals', () => {
      const collection = { title: 'Summer Sale' };
      const products = [
        { variants: [{ price: '60.00', compare_at_price: '100.00' }] }
      ];
      
      parser.registerCollectionVariables(collection, products);
      
      const template = '{{if hasDiscount}}Save up to {{maxDiscountPercentage}} on {{collectionTitle}}!{{else}}Shop our {{collectionTitle}}{{endif}}';
      expect(parser.parse(template)).toBe('Save up to 40% on Summer Sale!');
    });
    
    test('should handle multiple conditional blocks', () => {
      const data = {
        value: 15,
        category: 'electronics'
      };
      
      const template = 
        '{{if value > 10}}High value{{else}}Low value{{endif}} ' +
        '{{if category == "electronics"}}Electronics{{else}}Other category{{endif}}';
      
      expect(parser.parse(template, data)).toBe('High value Electronics');
    });
  });

  describe('Format Modifiers', () => {
    test('should apply lowercase modifier', () => {
      expect(parser.parse('{{month:lowercase}}')).toBe(new Date().toLocaleString('default', { month: 'long' }).toLowerCase());
    });
    
    test('should apply uppercase modifier', () => {
      expect(parser.parse('{{month:uppercase}}')).toBe(new Date().toLocaleString('default', { month: 'long' }).toUpperCase());
    });
    
    test('should apply modifiers to variables in conditional blocks', () => {
      const data = {
        productName: 'Premium Headphones'
      };
      
      const template = '{{if productName}}{{productName:uppercase}}{{else}}No product{{endif}}';
      expect(parser.parse(template, data)).toBe('PREMIUM HEADPHONES');
    });
  });

  describe('Data Override', () => {
    test('should override registered variables with provided data', () => {
      // Register a default variable
      parser.registerVariable('customVar', () => 'default value');
      
      // Parse with custom data
      const template = 'The value is {{customVar}}';
      const result = parser.parse(template, { customVar: 'custom value' });
      
      expect(result).toBe('The value is custom value');
    });
  });

  describe('Error Handling', () => {
    test('should return empty string for undefined variables', () => {
      const template = 'Unknown variable: {{unknownVar}}';
      const result = parser.parse(template);
      expect(result).toBe('Unknown variable: ');
    });

    test('should handle empty template', () => {
      expect(parser.parse('')).toBe('');
      expect(parser.parse(null)).toBe('');
      expect(parser.parse(undefined)).toBe('');
    });
    
    test('should handle malformed conditionals gracefully', () => {
      const template = '{{if hasDiscount}}Incomplete conditional';
      expect(parser.parse(template)).toBe('{{if hasDiscount}}Incomplete conditional');
    });
  });
  
  describe('Variable Name Extraction', () => {
    test('should extract variable names from a template', () => {
      const template = 'Shop our {{collectionTitle}} and save {{maxDiscountPercentage}}!';
      const variables = parser.getVariableNames(template);
      
      expect(variables).toContain('collectionTitle');
      expect(variables).toContain('maxDiscountPercentage');
      expect(variables.length).toBe(2);
    });
    
    test('should extract variable names from conditionals', () => {
      const template = '{{if hasDiscount}}Save up to {{maxDiscountPercentage}}{{endif}}';
      const variables = parser.getVariableNames(template);
      
      expect(variables).toContain('hasDiscount');
      expect(variables).toContain('maxDiscountPercentage');
      expect(variables.length).toBe(2);
    });
  });
});