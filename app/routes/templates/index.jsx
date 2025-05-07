import React, { useState, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  Text,
  Tabs,
  BlockStack,
  Box,
  Button,
  Banner,
  InlineStack
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import MetaFieldEditor from '../../components/MetaFieldEditor';

/**
 * Global Templates Page
 * 
 * This page allows users to set up global templates for meta fields
 */
export default function TemplatesPage() {
  // Tab management
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Template states
  const [productMetaTitle, setProductMetaTitle] = useState('{{productTitle}} - {{season}} {{year}} | Your Store');
  const [productMetaDescription, setProductMetaDescription] = useState('Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{endif}}');
  
  const [collectionMetaTitle, setCollectionMetaTitle] = useState('{{collectionTitle}} - {{season}} {{year}} Collection | Your Store');
  const [collectionMetaDescription, setCollectionMetaDescription] = useState('Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}');
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  // Handle tab change
  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
  }, []);
  
  // Sample data for preview
  const sampleData = {
    productTitle: 'Premium Cotton T-Shirt',
    productType: 'Apparel',
    productVendor: 'Fashion Brand',
    collectionTitle: 'Summer Essentials',
    year: new Date().getFullYear().toString(),
    season: 'Summer',
    hasDiscount: 'true',
    maxDiscountPercentage: '40%',
    minDiscountPercentage: '20%',
    discountRange: '20-40%'
  };
  
  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    
    try {
      // Mock API call to save templates
      // In a real implementation, you would call your backend API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulating successful save
      setSaveSuccess(true);
      
      // Clear success message after a delay
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving templates:', error);
      setSaveError('Failed to save templates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [productMetaTitle, productMetaDescription, collectionMetaTitle, collectionMetaDescription]);
  
  // Tabs content
  const tabs = [
    {
      id: 'products',
      content: 'Product Templates',
      panelID: 'products-panel',
    },
    {
      id: 'collections',
      content: 'Collection Templates',
      panelID: 'collections-panel',
    }
  ];
  
  return (
    <Page
      title="Global Templates"
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
        loading: isSaving,
        disabled: isSaving
      }}
    >
      <TitleBar title="Global Templates" />
      
      <BlockStack gap="500">
        <Card>
          <Text variant="bodyMd">
            Set up default templates for all your products and collections. 
            These templates will be used unless overridden by custom settings for specific items.
            Use variables like <code>{{"{{"}}variable{{"}}"}}</code> that will be automatically replaced with real values.
          </Text>
        </Card>
        
        {saveSuccess && (
          <Banner status="success" onDismiss={() => setSaveSuccess(false)}>
            Templates saved successfully!
          </Banner>
        )}
        
        {saveError && (
          <Banner status="critical" onDismiss={() => setSaveError(null)}>
            {saveError}
          </Banner>
        )}
        
        <Card>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange} fitted>
            <Box padding="400">
              {selectedTab === 0 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">Product Meta Fields</Text>
                  <Text variant="bodyMd">
                    These templates will be applied to all products unless overridden.
                  </Text>
                  
                  <MetaFieldEditor
                    metaTitle={productMetaTitle}
                    metaDescription={productMetaDescription}
                    onMetaTitleChange={setProductMetaTitle}
                    onMetaDescriptionChange={setProductMetaDescription}
                    sampleData={sampleData}
                    isGlobal={true}
                  />
                </BlockStack>
              )}
              
              {selectedTab === 1 && (
                <BlockStack gap="400">
                  <Text variant="headingMd">Collection Meta Fields</Text>
                  <Text variant="bodyMd">
                    These templates will be applied to all collections unless overridden.
                  </Text>
                  
                  <MetaFieldEditor
                    metaTitle={collectionMetaTitle}
                    metaDescription={collectionMetaDescription}
                    onMetaTitleChange={setCollectionMetaTitle}
                    onMetaDescriptionChange={setCollectionMetaDescription}
                    sampleData={sampleData}
                    isGlobal={true}
                  />
                </BlockStack>
              )}
            </Box>
          </Tabs>
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">Available Variables</Text>
            
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Basic Variables:
              </Text>
              <Text as="p" variant="bodyMd">
                <code>{{'{{'}}year{{'}}'}}</code> - Current year (e.g., 2025)<br />
                <code>{{'{{'}}month{{'}}'}}</code> - Current month name (e.g., May)<br />
                <code>{{'{{'}}season{{'}}'}}</code> - Current season (Spring, Summer, Fall, Winter)
              </Text>
              
              <Text as="h3" variant="headingSm">
                Product Variables:
              </Text>
              <Text as="p" variant="bodyMd">
                <code>{{'{{'}}productTitle{{'}}'}}</code> - Product title<br />
                <code>{{'{{'}}productType{{'}}'}}</code> - Product type<br />
                <code>{{'{{'}}productVendor{{'}}'}}</code> - Product vendor<br />
                <code>{{'{{'}}productPrice{{'}}'}}</code> - Current product price
              </Text>
              
              <Text as="h3" variant="headingSm">
                Collection Variables:
              </Text>
              <Text as="p" variant="bodyMd">
                <code>{{'{{'}}collectionTitle{{'}}'}}</code> - Collection title<br />
                <code>{{'{{'}}collectionCount{{'}}'}}</code> - Number of products in collection
              </Text>
              
              <Text as="h3" variant="headingSm">
                Discount Variables:
              </Text>
              <Text as="p" variant="bodyMd">
                <code>{{'{{'}}maxDiscountPercentage{{'}}'}}</code> - Highest discount percentage<br />
                <code>{{'{{'}}minDiscountPercentage{{'}}'}}</code> - Lowest discount percentage<br />
                <code>{{'{{'}}discountRange{{'}}'}}</code> - Range of discounts (e.g., "20-50%")<br />
                <code>{{'{{'}}hasDiscount{{'}}'}}</code> - Boolean flag if discounts are present
              </Text>
              
              <Text as="h3" variant="headingSm">
                Conditional Logic:
              </Text>
              <Text as="p" variant="bodyMd">
                <code>{{'{{'}}if hasDiscount{{'}}'}}</code> - Condition start<br />
                <code>{{'{{'}}else{{'}}'}}</code> - Else statement<br />
                <code>{{'{{'}}endif{{'}}'}}</code> - End condition<br />
                <br />
                Example: <code>{{'{{'}}if hasDiscount{{'}}'}}On Sale!{{'{{'}}else{{'}}'}}Regular Price{{'{{'}}endif{{'}}'}}</code>
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}