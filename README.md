# Meta Maximus

Meta Maximus is a Shopify app that automates the management of SEO meta fields for products and collections using dynamic variables. The app allows merchants to set up meta titles and descriptions that automatically update based on variables like dates, discounts, and seasonal factors.

## Features

- **Dynamic Variables**: Insert variables like `{{year}}`, `{{season}}`, `{{productTitle}}` that automatically resolve to current values
- **Conditional Logic**: Create conditional content based on product/collection state with `{{if}}` / `{{else}}` / `{{endif}}` syntax
- **Discount Calculations**: Automatically calculate and display discount information with variables like `{{maxDiscountPercentage}}`
- **Format Modifiers**: Apply formatting to variables with modifiers like `:lowercase` and `:uppercase`
- **Scheduling**: Set start and end dates for meta tag changes that automatically revert when they expire
- **Bulk Editing**: Update multiple products or collections at once with the same template

## Getting Started

### Prerequisites

- Node.js 18 or later
- Shopify Partner account
- Development store for testing
- MongoDB (optional - for storing templates and schedules)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/meta-maximus.git
   cd meta-maximus
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and update with your values:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Shopify API credentials:
   ```
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   SHOP=your-dev-store.myshopify.com
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Visit `http://localhost:3000` to see the app running locally.

### Setting Up Your Shopify App

1. Go to the [Shopify Partner Dashboard](https://partners.shopify.com)
2. Create a new app
3. Set the App URL to your development URL
4. Configure the necessary app scopes (read_products, write_products, read_metafields, write_metafields)
5. Install the app on your development store

## Usage Guide

### Creating Meta Tag Templates

1. Navigate to the **Meta Tags Manager** page
2. Select a product or collection to edit
3. Enter a template using variables:
   - Basic: `{{year}}`, `{{month}}`, `{{season}}`
   - Product: `{{productTitle}}`, `{{productType}}`, `{{productPrice}}`
   - Collection: `{{collectionTitle}}`, `{{collectionCount}}`
   - Discount: `{{maxDiscountPercentage}}`, `{{discountRange}}`, `{{hasDiscount}}`

4. Preview how the template will look when rendered
5. Save your changes

### Using Conditional Logic

Use the if/else/endif syntax to show different content based on conditions:

```
{{if hasDiscount}}
  Save up to {{maxDiscountPercentage}} on {{collectionTitle}}!
{{else}}
  Shop our {{collectionTitle}} - New Items for {{season}} {{year}}
{{endif}}
```

### Scheduling Meta Tag Changes

1. Navigate to the **Scheduling** page
2. Click "Create Schedule"
3. Select the product or collection to update
4. Enter the meta title and description templates
5. Set the start and end dates for the change
6. Save the schedule

## Development

### Project Structure

- `/app` - Frontend React components and routes
  - `/components` - Reusable React components
  - `/routes` - Remix routes
- `/src` - Backend services and utilities
  - `/services` - Business logic services
- `/server` - Express server setup
- `/tests` - Jest tests

### Key Components

- **VariableParser**: Core service that processes templates and resolves variables
- **VariablePreview**: React component for previewing template results

### Running Tests

```bash
npm test
```

## Deployment

### Deploying to Heroku

1. Create a new Heroku app
2. Connect your GitHub repository
3. Add environment variables in the Heroku dashboard
4. Deploy the app

### Deploying to Shopify App Store

1. Implement OAuth authentication
2. Set up billing
3. Prepare privacy policy and terms of service
4. Create App Store listing assets
5. Submit for review

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Shopify Partner Program
- Shopify Polaris Design System