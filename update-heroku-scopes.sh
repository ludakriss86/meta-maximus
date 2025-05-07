#!/bin/bash
# Script to update Shopify API scopes on Heroku

echo "Updating Shopify API scopes on Heroku..."

# Get the current Heroku app name
APP_NAME=$(heroku apps:info --json | jq -r '.app.name')

if [ -z "$APP_NAME" ]; then
  echo "Error: Could not determine Heroku app name. Make sure you're logged in and in a Heroku app directory."
  exit 1
fi

echo "Detected Heroku app: $APP_NAME"

# Set the corrected scopes without metafields
heroku config:set SCOPES="write_products,read_products,read_content,write_content" --app $APP_NAME

# Verify the API configuration
echo "Verifying the updated configuration..."
heroku config:get SCOPES --app $APP_NAME

echo "Shopify API scopes updated successfully!"
echo "For the changes to take effect, you may need to restart the app:"
echo "heroku restart --app $APP_NAME"