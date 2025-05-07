#!/bin/bash
# Script to deploy Meta Maximus to Heroku with proper environment variables

echo "Preparing to deploy Meta Maximus to Heroku..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
  echo "Error: Heroku CLI is not installed. Please install it first."
  echo "Visit: https://devcenter.heroku.com/articles/heroku-cli"
  exit 1
fi

# Check if logged in to Heroku
heroku whoami &> /dev/null
if [ $? -ne 0 ]; then
  echo "You are not logged in to Heroku. Please run 'heroku login' first."
  exit 1
fi

# Get the Heroku app name
read -p "Enter your Heroku app name: " APP_NAME

if [ -z "$APP_NAME" ]; then
  echo "Error: App name cannot be empty."
  exit 1
fi

echo "Deploying to Heroku app: $APP_NAME"

# Set environment variables
echo "Setting up environment variables..."

# Function to prompt for sensitive values
function prompt_for_value() {
  local var_name=$1
  local description=$2
  local default_value=$3
  local value=""
  
  if [ -z "$default_value" ]; then
    read -p "$description: " value
  else
    read -p "$description [$default_value]: " value
    value=${value:-$default_value}
  fi
  
  echo "$value"
}

# Shopify API credentials
SHOPIFY_API_KEY=$(prompt_for_value "SHOPIFY_API_KEY" "Enter your Shopify API Key")
SHOPIFY_API_SECRET=$(prompt_for_value "SHOPIFY_API_SECRET" "Enter your Shopify API Secret")

# MongoDB credentials
MONGODB_URI=$(prompt_for_value "MONGODB_URI" "Enter your MongoDB connection string (mongodb+srv://...)")
MONGODB_DB_NAME=$(prompt_for_value "MONGODB_DB_NAME" "Enter your MongoDB database name" "meta-maximus")

# Scopes
SCOPES=$(prompt_for_value "SCOPES" "Enter your Shopify API scopes" "write_products,read_products,read_content,write_content")

# Set the environment variables on Heroku
echo "Setting environment variables on Heroku..."
heroku config:set \
  SHOPIFY_API_KEY="$SHOPIFY_API_KEY" \
  SHOPIFY_API_SECRET="$SHOPIFY_API_SECRET" \
  MONGODB_URI="$MONGODB_URI" \
  MONGODB_DB_NAME="$MONGODB_DB_NAME" \
  NODE_ENV="production" \
  HOST="$APP_NAME.herokuapp.com" \
  SCOPES="$SCOPES" \
  DEBUG_LEVEL="info" \
  --app "$APP_NAME"

# Verify the variables were set
echo "Verifying environment variables..."
heroku config --app "$APP_NAME"

# Push to Heroku
echo "Deploying application to Heroku..."
git push heroku main

# Open the app
echo "Deployment complete! Opening the app..."
heroku open --app "$APP_NAME"

echo "===================================================="
echo "Setup Instructions:"
echo "1. Visit your Shopify Partner Dashboard"
echo "2. Update your app's URL to: https://$APP_NAME.herokuapp.com"
echo "3. Update your app's redirect URL to: https://$APP_NAME.herokuapp.com/auth/callback"
echo "4. Update your app's API scopes to: $SCOPES"
echo "5. Test the OAuth flow by visiting: https://$APP_NAME.herokuapp.com/auth?shop=your-store.myshopify.com"
echo "===================================================="
echo "For troubleshooting, check the logs with: heroku logs --tail --app $APP_NAME"