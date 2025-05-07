# Meta Maximus

Meta Maximus is a Shopify app that automates the management of SEO meta fields for products and collections using dynamic variables. The app allows merchants to set up meta titles and descriptions that automatically update based on variables like dates, discounts, and seasonal factors.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Features

- **Dynamic Variables**: Insert variables like `{{year}}`, `{{season}}`, `{{productTitle}}` that automatically resolve to current values
- **Conditional Logic**: Create conditional content based on product/collection state with `{{if}}` / `{{else}}` / `{{endif}}` syntax
- **Discount Calculations**: Automatically calculate and display discount information with variables like `{{maxDiscountPercentage}}`
- **Format Modifiers**: Apply formatting to variables with modifiers like `:lowercase` and `:uppercase`
- **Scheduling**: Set start and end dates for meta tag changes that automatically revert when they expire
- **Custom Rules**: Create conditional rules for specific products/collections based on tags, types, vendors, etc.
- **Status Management**: Pause, resume, and delete scheduled changes or rules as needed
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

1. Navigate to the **Global Templates** page to set up default templates
2. Enter templates using variables, modifiers, and conditional logic
3. Available variables:

   #### Basic Variables
   - `{{year}}` - Current year (e.g., 2025)
   - `{{month}}` - Current month name (e.g., May)
   - `{{day}}` - Current day of month (e.g., 6)
   - `{{date}}` - Formatted date (e.g., May 6, 2025)
   - `{{season}}` - Current season (Spring, Summer, Fall, Winter)

   #### Product Variables
   - `{{productTitle}}` - Product title
   - `{{productType}}` - Product type
   - `{{productVendor}}` - Product vendor
   - `{{productPrice}}` - Current product price (e.g., $29.99)
   - `{{comparePrice}}` - Compare-at price (e.g., $39.99)

   #### Collection Variables
   - `{{collectionTitle}}` - Collection title
   - `{{collectionDescription}}` - Collection description (truncated to 100 chars)
   - `{{collectionCount}}` - Number of products in collection

   #### Discount Variables
   - `{{maxDiscountPercentage}}` - Highest discount percentage in collection (e.g., 30%)
   - `{{minDiscountPercentage}}` - Lowest discount percentage in collection (e.g., 10%)
   - `{{discountRange}}` - Range of discounts (e.g., "10-30%")
   - `{{hasDiscount}}` - Boolean flag if any products have discounts
   - `{{discountedCount}}` - Number of discounted products in collection

   #### Format Modifiers
   - `{{variable:lowercase}}` - Convert to lowercase
   - `{{variable:uppercase}}` - Convert to uppercase
   - `{{variable:number}}` - Format as number

4. Preview how the template will look when rendered with the "Preview" button
5. Save your changes

### Managing Global Settings

1. Navigate to the Home Page, Collections, or Products Settings pages
2. Update the global templates at the top of each page
3. These templates will override the defaults from Shopify
4. Preview how they will look in search results
5. Save your changes

### Custom Templates and Rules

1. Navigate to the Custom Rules section on Collections or Products pages
2. Create rules to override global settings for specific items
3. Use conditions like tags, types, or specific collection names
4. Set custom meta templates for matching items
5. Schedule rules with start/end dates
6. Manage rule status (active, scheduled, paused) as needed

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

1. Navigate to the scheduling section on Home Page, Collections, or Products pages
2. Click "Schedule a Template Change"
3. Enter a name for your schedule
4. Enter the meta title and description templates
5. Set the start and end dates for the change (or leave end date empty for no expiration)
6. Preview how it will look in search results
7. Save the schedule

### Managing Custom Rules

1. Navigate to the Custom Rules section on Collections or Products pages
2. Click "Create Custom Rule"
3. For Collections:
   - Search for specific collections to customize
   - Set custom meta templates
   - Set schedule dates
4. For Products:
   - Create rules based on product tags, types, vendors, etc.
   - Apply to matching products
   - Set schedule dates
5. Use the actions buttons to edit, pause/resume, or delete rules as needed

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
- **MetaFieldEditor**: Component for editing meta fields with variable support
- **VariableSelector**: Component for selecting available variables
- **Database Service**: Handles database operations for templates and scheduling
- **Scheduler Service**: Manages scheduled meta tag changes
- **Custom Rules System**: Manages conditional rules for products and collections

### Running Tests

```bash
npm test
```

## Deployment

### Development with Ngrok

For local development with a public URL:

1. Install ngrok: https://ngrok.com/download
2. Start your development server:
   ```bash
   npm run dev
   ```
3. In a separate terminal, start ngrok:
   ```bash
   ngrok http 3001
   ```
4. Update your `.env` file with the ngrok URL:
   ```
   HOST=your-ngrok-url.ngrok.io
   ```
5. Update your Shopify app settings with the ngrok URL
6. Restart your development server

### Deploying to Heroku

1. Create a new Heroku app
2. Connect your GitHub repository
3. Add environment variables in the Heroku dashboard
4. Deploy the app

### Deploying to Shopify App Store

1. Implement OAuth authentication (already included in this app)
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