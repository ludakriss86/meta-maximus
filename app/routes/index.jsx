import React from 'react';
import {
  Page,
  Card,
  Layout,
  Text,
  BlockStack,
  Link,
  Box,
  InlineStack,
  Icon,
  Button,
  Image
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import {
  HomeIcon,
  CollectionsIcon,
  ProductsIcon,
  TemplateIcon,
  CalendarIcon
} from '@shopify/polaris-icons';

/**
 * Home Page / Dashboard for Meta Maximus
 */
export default function HomePage() {
  const appVersion = '1.0.0';
  
  return (
    <Page
      title="Meta Maximus"
      subtitle="Dynamic SEO meta tag management for Shopify"
      fullWidth
    >
      <TitleBar title="Dashboard" />
      
      <BlockStack gap="500">
        <Layout>
          <Layout.Section oneHalf>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Welcome to Meta Maximus
                </Text>
                
                <Text variant="bodyMd">
                  Meta Maximus helps you automate SEO meta fields for your products and collections.
                  Create dynamic meta titles and descriptions that automatically update based on variables
                  like dates, discounts, and seasonal factors.
                </Text>
                
                <Box paddingBlockStart="300">
                  <Button primary url="/templates">
                    Get Started
                  </Button>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section oneHalf>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Quick Navigation
                </Text>
                
                <BlockStack gap="300">
                  <Link url="/homepage" monochrome removeUnderline>
                    <InlineStack gap="300" blockAlign="center">
                      <Icon source={HomeIcon} color="highlight" />
                      <Text variant="bodyMd" fontWeight="semibold">
                        Home Page
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Manage meta tags for your store's home page
                      </Text>
                    </InlineStack>
                  </Link>

                  <Link url="/templates" monochrome removeUnderline>
                    <InlineStack gap="300" blockAlign="center">
                      <Icon source={TemplateIcon} color="highlight" />
                      <Text variant="bodyMd" fontWeight="semibold">
                        Global Templates
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Set up default templates for all items
                      </Text>
                    </InlineStack>
                  </Link>
                  
                  <Link url="/collections" monochrome removeUnderline>
                    <InlineStack gap="300" blockAlign="center">
                      <Icon source={CollectionsIcon} color="highlight" />
                      <Text variant="bodyMd" fontWeight="semibold">
                        Collections Manager
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Manage meta tags for collections
                      </Text>
                    </InlineStack>
                  </Link>
                  
                  <Link url="/products" monochrome removeUnderline>
                    <InlineStack gap="300" blockAlign="center">
                      <Icon source={ProductsIcon} color="highlight" />
                      <Text variant="bodyMd" fontWeight="semibold">
                        Products Manager
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Manage meta tags for individual products
                      </Text>
                    </InlineStack>
                  </Link>
                  
                  <Link url="/scheduling" monochrome removeUnderline>
                    <InlineStack gap="300" blockAlign="center">
                      <Icon source={CalendarIcon} color="highlight" />
                      <Text variant="bodyMd" fontWeight="semibold">
                        Scheduling (Coming Soon)
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        Schedule meta tag changes for specific dates
                      </Text>
                    </InlineStack>
                  </Link>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        
        <Layout>
          <Layout.Section oneThird>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Getting Started
                </Text>
                
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold">
                    1. Set up Home Page Meta Tags
                  </Text>
                  <Text variant="bodyMd">
                    Configure meta tags for your store's home page using dynamic variables.
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    2. Set up Global Templates
                  </Text>
                  <Text variant="bodyMd">
                    Create default templates that will be used for all your products and collections.
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    3. Customize Collection Meta Tags
                  </Text>
                  <Text variant="bodyMd">
                    Override global templates for specific collections if needed.
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    4. Customize Product Meta Tags
                  </Text>
                  <Text variant="bodyMd">
                    Fine-tune meta tags for individual products when necessary.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section oneThird>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Variable System
                </Text>
                
                <Text variant="bodyMd">
                  Use variables in your templates that automatically update based on your store's data.
                </Text>
                
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Basic Variables
                  </Text>
                  <Text variant="bodyMd">
                    <code>{{'{{'}}year{{'}}'}}</code>, <code>{{'{{'}}month{{'}}'}}</code>, <code>{{'{{'}}season{{'}}'}}</code>
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    Product Variables
                  </Text>
                  <Text variant="bodyMd">
                    <code>{{'{{'}}productTitle{{'}}'}}</code>, <code>{{'{{'}}productType{{'}}'}}</code>, <code>{{'{{'}}productVendor{{'}}'}}</code>
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    Discount Variables
                  </Text>
                  <Text variant="bodyMd">
                    <code>{{'{{'}}maxDiscountPercentage{{'}}'}}</code>, <code>{{'{{'}}hasDiscount{{'}}'}}</code>
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section oneThird>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Advanced Features
                </Text>
                
                <BlockStack gap="200">
                  <Text variant="bodyMd" fontWeight="semibold">
                    Conditional Logic
                  </Text>
                  <Text variant="bodyMd">
                    Use <code>{{'{{'}}if hasDiscount{{'}}'}}...{{'{{'}}else{{'}}'}}...{{'{{'}}endif{{'}}'}}</code> to show different content based on conditions.
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    Format Modifiers
                  </Text>
                  <Text variant="bodyMd">
                    Use <code>{{'{{'}}variable:modifier{{'}}'}}</code> to format variables (e.g., <code>{{'{{'}}month:uppercase{{'}}'}}</code>).
                  </Text>
                  
                  <Text variant="bodyMd" fontWeight="semibold">
                    Scheduling (Coming Soon)
                  </Text>
                  <Text variant="bodyMd">
                    Schedule meta tag changes to automatically activate and deactivate on specific dates.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        
        <Card>
          <BlockStack gap="200" align="center">
            <Text variant="bodySm" color="subdued">
              Meta Maximus v{appVersion} | Created by Your Company
            </Text>
            <Text variant="bodySm" color="subdued">
              Need help? Contact support@example.com
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}