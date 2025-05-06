// Simple test version of the React renderer
// This doesn't depend on actual components, just returns HTML strings

/**
 * Test rendering functions that return sample HTML
 * Once the basic setup is working, we'll replace these with actual React components
 */

function renderHomePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meta Maximus - Home</title>
      <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@11.1.2/build/esm/styles.css" />
    </head>
    <body>
      <div id="app">
        <h1>Home Page - React Version</h1>
        <p>This is the home page rendered from the React renderer.</p>
        <p>Variable buttons should appear here in the final version.</p>
        
        <h2>Quick Insert Variables:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">YEAR</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">MONTH</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">SEASON</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">DATE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">PRODUCT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">COLLECTION</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">STORE</button>
        </div>
        
        <h2>Conditional Logic:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF DISCOUNT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF/ELSE</button>
        </div>
        
        <h2>Format Modifiers:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">UPPERCASE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">LOWERCASE</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

function renderCollectionsPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meta Maximus - Collections</title>
      <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@11.1.2/build/esm/styles.css" />
    </head>
    <body>
      <div id="app">
        <h1>Collections Page - React Version</h1>
        <p>This is the collections page rendered from the React renderer.</p>
        <p>Variable buttons should appear here in the final version.</p>
        
        <h2>Quick Insert Variables:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">YEAR</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">MONTH</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">SEASON</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">DATE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">PRODUCT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">COLLECTION</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">STORE</button>
        </div>
        
        <h2>Conditional Logic:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF DISCOUNT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF/ELSE</button>
        </div>
        
        <h2>Format Modifiers:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">UPPERCASE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">LOWERCASE</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

function renderProductsPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meta Maximus - Products</title>
      <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@11.1.2/build/esm/styles.css" />
    </head>
    <body>
      <div id="app">
        <h1>Products Page - React Version</h1>
        <p>This is the products page rendered from the React renderer.</p>
        <p>Variable buttons should appear here in the final version.</p>
        
        <h2>Quick Insert Variables:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">YEAR</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">MONTH</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">SEASON</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">DATE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">PRODUCT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">COLLECTION</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">STORE</button>
        </div>
        
        <h2>Conditional Logic:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF DISCOUNT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF/ELSE</button>
        </div>
        
        <h2>Format Modifiers:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">UPPERCASE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">LOWERCASE</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

function renderMetafieldsPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meta Maximus - Metafields</title>
      <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@11.1.2/build/esm/styles.css" />
    </head>
    <body>
      <div id="app">
        <h1>Metafields Page - React Version</h1>
        <p>This is the metafields page rendered from the React renderer.</p>
        <p>Variable buttons should appear here in the final version.</p>
        
        <h2>Quick Insert Variables:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">YEAR</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">MONTH</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">SEASON</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">DATE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">PRODUCT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">COLLECTION</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">STORE</button>
        </div>
        
        <h2>Conditional Logic:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF DISCOUNT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF/ELSE</button>
        </div>
        
        <h2>Format Modifiers:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">UPPERCASE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">LOWERCASE</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

function renderTemplatesPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meta Maximus - Templates</title>
      <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@11.1.2/build/esm/styles.css" />
    </head>
    <body>
      <div id="app">
        <h1>Templates Page - React Version</h1>
        <p>This is the templates page rendered from the React renderer.</p>
        <p>Variable buttons should appear here in the final version.</p>
        
        <h2>Quick Insert Variables:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">YEAR</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">MONTH</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">SEASON</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">DATE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">PRODUCT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">COLLECTION</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">STORE</button>
        </div>
        
        <h2>Conditional Logic:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF DISCOUNT</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">IF/ELSE</button>
        </div>
        
        <h2>Format Modifiers:</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">UPPERCASE</button>
          <button style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;">LOWERCASE</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  renderHomePage,
  renderCollectionsPage,
  renderProductsPage,
  renderMetafieldsPage,
  renderTemplatesPage
};