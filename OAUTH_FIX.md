# Fixing the OAuth "invalid_scope" Error

## Changes Made Locally

1. Updated the scopes in the `.env` file to include all required scopes:
   ```
   SCOPES=write_products,write_content,read_products,read_content,write_metafields,read_metafields
   ```

2. Updated the HOST environment variable to match the Heroku app URL:
   ```
   HOST=meta-maximus-20c92a32d730.herokuapp.com
   ```

3. Set NODE_ENV to production:
   ```
   NODE_ENV=production
   ```

## Required Changes on Heroku

To fix the OAuth "invalid_scope" error, you need to update the environment variables on Heroku:

1. Go to the Heroku dashboard for your app: https://dashboard.heroku.com/apps/meta-maximus-20c92a32d730
2. Navigate to the "Settings" tab
3. Click on "Reveal Config Vars"
4. Update the following environment variables:
   - `SCOPES`: write_products,write_content,read_products,read_content,write_metafields,read_metafields
   - `HOST`: meta-maximus-20c92a32d730.herokuapp.com
   - `NODE_ENV`: production

## Required Changes in Shopify Partner Dashboard

You also need to ensure your app's configuration in the Shopify Partner Dashboard matches:

1. Log in to your [Shopify Partner Dashboard](https://partners.shopify.com)
2. Navigate to your app (Meta Maximus)
3. Go to "App Setup" > "Configuration"
4. Under "App URL", ensure it's set to:
   ```
   https://meta-maximus-20c92a32d730.herokuapp.com
   ```
5. Under "Allowed redirection URL(s)", ensure it includes:
   ```
   https://meta-maximus-20c92a32d730.herokuapp.com/auth/callback
   ```
6. Check the "API scopes" section to ensure all these scopes are requested:
   - write_products
   - write_content
   - read_products
   - read_content
   - write_metafields
   - read_metafields

7. Save your changes

## Deploying the Updated Configuration

After making these changes locally, commit and push them to Heroku:

```bash
git add .env
git commit -m "Update OAuth scopes and configuration"
git push heroku main
```

## Testing the Fix

Test the OAuth flow by visiting:
```
https://meta-maximus-20c92a32d730.herokuapp.com/auth?shop=metamaximus.myshopify.com
```

This should now complete the OAuth flow without the "invalid_scope" error.

## Troubleshooting

If you still encounter scope errors:

1. Double-check the spelling of all scopes (they are case-sensitive)
2. Verify that all scopes are allowed for your Shopify Partner account level
3. Check the Shopify app logs for detailed error messages:
   ```
   heroku logs --tail --app meta-maximus-20c92a32d730
   ```
4. Consider temporarily removing the `write_metafields` scope and then adding it back after a successful authentication