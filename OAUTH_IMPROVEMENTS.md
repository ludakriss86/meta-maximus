# Shopify OAuth Improvements

## Summary of Changes

We've made significant improvements to the Shopify OAuth flow and API authentication to fix the "invalid_scope" error and enhance the overall authentication experience. This document outlines the key changes and explains how to deploy and test them.

## Key Improvements

### 1. Fixed OAuth Scope Issues

- Updated the default scopes to use Shopify's current API scopes:
  ```
  write_products,read_products,read_content,write_content
  ```
- Removed metafields scopes that were causing the "invalid_scope" error
- Added fallback to ensure scopes are always present even if not configured

### 2. Enhanced Shop Parameter Handling

- Added robust shop parameter validation and normalization
- Properly handles various shop parameter formats (with or without protocol, with or without trailing slashes)
- Added automatic myshopify.com domain suffix if not provided
- Improved error handling for invalid shop parameters

### 3. Improved Session Management

- Enhanced cookie security with proper secure flags in production
- Added session expiration validation
- Improved MongoDB session storage with connection verification
- Added better fallback to in-memory storage when MongoDB is unavailable
- Enhanced session retrieval from multiple sources (MongoDB, in-memory)

### 4. Better API Authentication

- Added proper session validation before API access
- Improved API route protection with detailed error messages
- Added support for shop parameter in query string and headers
- Public endpoints allowlist for easier development and testing
- Enhanced error responses with proper HTTP status codes and redirect URLs

### 5. Improved Error Handling

- Added detailed error messages with clear instructions
- Better error categorization for proper user guidance
- Enhanced logging for easier debugging
- User-friendly error pages with helpful information

## Deployment Instructions

To deploy these improvements to Heroku:

1. Update your Heroku environment variables:

```bash
# Run the included deployment script
./deploy-to-heroku.sh
```

Or manually set these variables:
```bash
heroku config:set \
  SCOPES="write_products,read_products,read_content,write_content" \
  HOST="your-app-name.herokuapp.com" \
  NODE_ENV="production" \
  --app your-app-name
```

2. Ensure your Shopify Partner Dashboard is updated:
   - Update the App URL to match your Heroku app URL
   - Update the Redirect URL to include /auth/callback
   - Verify the API scopes match: write_products, read_products, read_content, write_content

3. Deploy the code to Heroku:
```bash
git push heroku main
```

## Testing the OAuth Flow

To test the OAuth flow after deployment:

1. Visit your app's auth URL with a shop parameter:
```
https://your-app-name.herokuapp.com/auth?shop=your-store.myshopify.com
```

2. You should be redirected to Shopify's authorization page
3. After authorizing, you should be redirected back to your app's home page
4. Check the Heroku logs for detailed information about the authentication process:
```bash
heroku logs --tail --app your-app-name
```

## Troubleshooting

If you still encounter OAuth errors:

1. Verify your API key and secret are correct in your Heroku config
2. Check that your app URLs in the Shopify Partner Dashboard are correct
3. Make sure the scopes in Heroku match those allowed in your Shopify Partner account
4. Check the Heroku logs for detailed error messages:
```bash
heroku logs --tail --app your-app-name | grep "Error"
```

## API Authentication Testing

To test API authentication after deployment:

1. Create a test request to an API endpoint, adding the shop parameter:
```
https://your-app-name.herokuapp.com/api/store/data?shop=your-store.myshopify.com
```

2. If you're not authenticated, you should receive a 401 response with a redirect URL
3. After authentication, the same request should return valid data

## Local Development

For local development and testing:

1. Create a .env file based on the .env.example template
2. Set development-specific values:
```
NODE_ENV=development
HOST=localhost:3000
ALLOW_UNAUTHENTICATED_API=true
```

3. Start the server normally and use the /status endpoint to verify configuration