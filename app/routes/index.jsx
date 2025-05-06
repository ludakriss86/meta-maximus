import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  Box,
  InlineStack,
  Badge
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import VariablePreview from "../components/VariablePreview";

/**
 * Main dashboard component for Meta Maximus app
 */
export default function Index() {
  const [savedTemplates, setSavedTemplates] = useState([]);
  
  // Sample data for preview
  const sampleData = {
    collectionTitle: 'Summer Essentials',
    season: 'Summer',
    year: new Date().getFullYear().toString(),
    hasDiscount: 'true',
    maxDiscountPercentage: '40%',
    minDiscountPercentage: '20%',
    discountRange: '20-40%',
    discountedCount: '15',
    productTitle: 'Cotton T-Shirt',
    productType: 'Apparel',
    productVendor: 'Fashion Brand',
    productPrice: '$29.99',
    comparePrice: '$39.99'
  };
  
  /**
   * Handle template update from the VariablePreview component
   */
  const handleTemplateUpdate = (templateData) => {
    // In a real app, you might save this to a database
    console.log('Template updated:', templateData);
  };
  
  return (
    <Page>
      <TitleBar title="Meta Maximus" primaryAction={null} />
      
      <BlockStack gap="500">
        {/* Welcome Card */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Welcome to Meta Maximus
            </Text>
            <Text as="p" variant="bodyMd">
              Create dynamic meta tags that automatically update based on variables like dates, discounts, and seasonal factors.
            </Text>
          </BlockStack>
        </Card>
        
        {/* Variable Preview Component */}
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Template Editor
          </Text>
          
          <VariablePreview 
            initialTemplate="Shop our {{collectionTitle}} - {{season}} {{year}} Collection"
            onUpdate={handleTemplateUpdate}
            sampleData={sampleData}
          />
        </BlockStack>
        
        {/* Example Use Cases */}
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Example Use Cases
            </Text>
            
            <BlockStack gap="300">
              <InlineStack gap="200" align="start">
                <Badge>Discounts</Badge>
                <Text as="span" variant="bodyMd">
                  {{'{{'}}if hasDiscount{{'}}'}}Save up to {{'{{'}}maxDiscountPercentage{{'}}'}} on {{'{{'}}collectionTitle{{'}}'}}!{{'{{'}}else{{'}}'}}Shop our {{'{{'}}collectionTitle{{'}}'}}{{'{{'}}endif{{'}}'}}
                </Text>
              </InlineStack>
              
              <InlineStack gap="200" align="start">
                <Badge>Seasonal</Badge>
                <Text as="span" variant="bodyMd">
                  {{'{{'}}season{{'}}'}} {{'{{'}}year{{'}}'}} {{'{{'}}collectionTitle{{'}}'}} - New Arrivals
                </Text>
              </InlineStack>
              
              <InlineStack gap="200" align="start">
                <Badge>Products</Badge>
                <Text as="span" variant="bodyMd">
                  {{'{{'}}productTitle{{'}}'}} | {{'{{'}}productType{{'}}'}} | {{'{{'}}if hasDiscount{{'}}'}}Sale Price{{'{{'}}else{{'}}'}}Regular Price{{'{{'}}endif{{'}}'}}
                </Text>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>
        
        {/* Next Steps */}
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Next Steps
            </Text>
            
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                1. Create templates for your products and collections
              </Text>
              <Text as="p" variant="bodyMd">
                2. Schedule meta tag updates for seasonal promotions
              </Text>
              <Text as="p" variant="bodyMd">
                3. Set up conditional logic for sales and discounts
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}