# Heroku Deployment Debugging

## Current Configuration Issues

The Meta Maximus app is encountering an "Application Error" when deployed to Heroku. This document outlines potential causes and solutions.

## 1. Node.js Version

Heroku may be using a different Node.js version than expected.

### Solution:
- The package.json has been updated to specify Node.js 18.x:
  ```json
  "engines": {
    "node": "18.x"
  }
  ```
- Added a `heroku-postbuild` script to avoid unnecessary build steps

## 2. Environment Variables

The application requires several environment variables to function properly.

### Solution:
- Verify all environment variables are set in Heroku:
  ```
  SHOPIFY_API_KEY=e7bfdc6fed1ac843903db321b77056a9
  SHOPIFY_API_SECRET=e39aae96908c641e0225618d2fec3275
  SCOPES=write_products,write_content,read_products,read_content,write_metafields,read_metafields
  HOST=meta-maximus-20c92a32d730.herokuapp.com
  NODE_ENV=production
  MONGODB_URI=mongodb+srv://kristoffer:44IkaugdMbg9xv1d@cluster0.m1j3ce3.mongodb.net/meta-maximus
  MONGODB_DB_NAME=meta-maximus
  ```

## 3. Log Files Access Issue

The current logger implementation tries to write to log files, which won't work on Heroku's ephemeral filesystem.

### Solution:
- Modified the logger to work properly in Heroku's environment
- Update the logger to send logs to the console, which Heroku captures automatically

## 4. Troubleshooting Steps

1. Check the logs:
   ```
   heroku logs --tail --app meta-maximus
   ```

2. Check configuration:
   ```
   heroku config --app meta-maximus
   ```

3. Restart the app:
   ```
   heroku restart --app meta-maximus
   ```

4. Verify buildpacks:
   ```
   heroku buildpacks --app meta-maximus
   ```

5. Check the build process:
   ```
   heroku builds:info --app meta-maximus
   ```

## 5. Additional Debugging

If the application is still encountering errors, consider:

1. Deploy a simplified version that just returns a basic response
2. Test the MongoDB connection by adding a specific test route
3. Check for any missing dependencies in package.json
4. Verify Procfile configuration is correct
5. Consider using the Heroku Metrics dashboard to monitor the application

## 6. Checking Shopify Authentication

Once the application is running, test the OAuth flow by visiting:

```
https://meta-maximus-20c92a32d730.herokuapp.com/auth?shop=metamaximus.myshopify.com
```

If there are OAuth errors, verify the following:
1. All requested scopes are valid for your Shopify Partner account level
2. Your app is properly registered in the Shopify Partner Dashboard
3. The redirect URLs are correctly configured
4. The API key and secret are correctly set in Heroku config vars