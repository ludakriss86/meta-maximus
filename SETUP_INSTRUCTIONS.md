# Meta Maximus Setup Instructions

Follow these steps to set up and use your Meta Maximus app with Shopify.

## Option 1: Using the Deployed Heroku App (Recommended)

The app is already deployed to Heroku at:
https://meta-maximus-20c92a32d730.herokuapp.com/

This is the easiest way to use the app, as everything is already set up and running.

## Option 2: Local Development

If you need to run the app locally, you'll need:

- Node.js (v18 or newer)
- MongoDB Atlas account set up
- Shopify Partner account
- ngrok or similar tool for creating a public URL

## Step 1: Environment Setup

1. Make sure MongoDB is connected properly:
   - Your MongoDB connection string should be in the `.env` file
   - The app should be configured to use MongoDB (not in-memory storage)

2. Update your `.env` file with your Shopify app credentials:
   ```
   SHOPIFY_API_KEY=e7bfdc6fed1ac843903db321b77056a9
   SHOPIFY_API_SECRET=e39aae96908c641e0225618d2fec3275
   SCOPES=write_products,write_content,read_products,read_content,write_metafields,read_metafields
   ```

3. Set up your test store:
   - Update the SHOP variable in .env with your test store's URL:
   ```
   SHOP=your-store.myshopify.com
   ```

## Step 2: Create a Public URL

1. Install ngrok:
   ```
   npm install -g ngrok
   ```

2. Start ngrok on the same port as your app:
   ```
   ngrok http 3001
   ```

3. Copy the HTTPS URL provided by ngrok (e.g., https://1a2b3c4d.ngrok.io)

4. Update your `.env` file with the ngrok URL (without https://):
   ```
   HOST=1a2b3c4d.ngrok.io
   ```

5. Update your Shopify app's URLs in the Shopify Partner Dashboard:
   - App URL: https://your-ngrok-url.ngrok.io
   - Allowed redirection URLs: https://your-ngrok-url.ngrok.io/auth/callback

## Step 3: Start the App

1. Make sure MongoDB is running

2. Start your application:
   ```
   npm start
   ```

3. Visit your app at the ngrok URL:
   ```
   https://your-ngrok-url.ngrok.io
   ```

## Step 4: Install the App on Your Test Store

### Using the Heroku Deployment

1. Install the app on your test store by visiting:
   ```
   https://meta-maximus-20c92a32d730.herokuapp.com/auth?shop=your-store.myshopify.com
   ```

2. Complete the OAuth process by allowing the requested permissions

3. You should be redirected to the app's dashboard

### Using Local Development

1. Install the app on your test store by visiting:
   ```
   https://your-ngrok-url.ngrok.io/auth?shop=your-store.myshopify.com
   ```

2. Complete the OAuth process by allowing the requested permissions

3. You should be redirected to the app's dashboard

## Troubleshooting

- If you encounter MongoDB connection issues, check your MongoDB Atlas network settings to ensure your IP is allowed
- If authentication fails, verify your app credentials and redirect URLs in the Shopify Partner Dashboard
- For local development, you may need to refresh your ngrok URL frequently as free plans expire every few hours

## Next Steps

1. Create meta templates for your products and collections
2. Set up scheduled changes for seasonal promotions
3. Configure global templates for your store

## Need Help?

If you need assistance, reach out to:
- [Shopify Partner Help Center](https://help.shopify.com/en/partners)
- [MongoDB Atlas Support](https://www.mongodb.com/cloud/atlas/support)