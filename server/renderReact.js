const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { StaticRouter } = require('react-router-dom/server');

// Import Polaris provider for styling
const { AppProvider } = require('@shopify/polaris');

// Import route components
const HomePageRoute = require('../app/routes/index.jsx').default;
const CollectionsRoute = require('../app/routes/collections/index.jsx').default;
const ProductsRoute = require('../app/routes/products/index.jsx').default;
const MetafieldsRoute = require('../app/routes/metafields/index.jsx').default;
const TemplatesRoute = require('../app/routes/templates/index.jsx').default;

/**
 * Renders a React component to HTML string
 * 
 * @param {React.Component} Component - The React component to render
 * @param {Object} props - Props to pass to the component
 * @param {string} url - Current URL for routing context
 * @returns {string} HTML string
 */
function renderToHTML(Component, props = {}, url = '/') {
  const html = ReactDOMServer.renderToString(
    React.createElement(
      StaticRouter,
      { location: url },
      React.createElement(
        AppProvider,
        { i18n: {} },
        React.createElement(Component, props)
      )
    )
  );

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meta Maximus</title>
      <link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@11.1.2/build/esm/styles.css" />
      <script src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
    </head>
    <body>
      <div id="app">${html}</div>
      <script>
        // Hydration would happen here in a real implementation
        document.addEventListener('DOMContentLoaded', () => {
          console.log('App mounted');
        });
      </script>
    </body>
    </html>
  `;
}

// Route-specific rendering functions
function renderHomePage(props = {}) {
  return renderToHTML(HomePageRoute, props, '/');
}

function renderCollectionsPage(props = {}) {
  return renderToHTML(CollectionsRoute, props, '/collections');
}

function renderProductsPage(props = {}) {
  return renderToHTML(ProductsRoute, props, '/products');
}

function renderMetafieldsPage(props = {}) {
  return renderToHTML(MetafieldsRoute, props, '/metafields');
}

function renderTemplatesPage(props = {}) {
  return renderToHTML(TemplatesRoute, props, '/templates');
}

module.exports = {
  renderHomePage,
  renderCollectionsPage,
  renderProductsPage,
  renderMetafieldsPage,
  renderTemplatesPage
};