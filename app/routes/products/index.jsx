import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  Text,
  BlockStack,
  Box,
  Spinner,
  Banner,
  InlineStack,
  Button,
  IndexTable,
  Badge,
  Filters,
  Tooltip,
  Icon,
  Modal,
  EmptySearchResult,
  Loading,
  Select
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { CalendarIcon, EditIcon, ResetIcon, ClockIcon, DeleteIcon } from '@shopify/polaris-icons';
import MetaFieldEditor from '../../components/MetaFieldEditor';
import VariablePreview from '../../components/VariablePreview/VariablePreview';

/**
 * Mock collection data for filters
 */
const COLLECTIONS = [
  { label: 'All collections', value: '' },
  { label: 'Summer Essentials', value: 'summer-essentials' },
  { label: 'Men\'s Apparel', value: 'mens-apparel' },
  { label: 'Women\'s Apparel', value: 'womens-apparel' },
  { label: 'Sale Items', value: 'sale-items' },
  { label: 'New Arrivals', value: 'new-arrivals' },
];

/**
 * Mock product data
 */
const MOCK_PRODUCTS = [
  {
    id: '1',
    title: 'Premium Cotton T-Shirt',
    handle: 'premium-cotton-t-shirt',
    collection: 'Summer Essentials',
    collectionId: 'summer-essentials',
    metaTitle: 'Premium Cotton T-Shirt - Summer 2025 | Your Store',
    metaDescription: 'Shop our premium Premium Cotton T-Shirt for Summer 2025. Now on sale with 30% off!',
    isOverridden: true,
    templateTitle: '{{productTitle}} - {{season}} {{year}} | Your Store',
    templateDescription: 'Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{endif}}'
  },
  {
    id: '2',
    title: 'Slim Fit Jeans',
    handle: 'slim-fit-jeans',
    collection: 'Men\'s Apparel',
    collectionId: 'mens-apparel',
    metaTitle: 'Slim Fit Jeans - Men\'s Apparel | Your Store',
    metaDescription: 'Shop our Slim Fit Jeans from our Men\'s Apparel collection. New styles for Summer 2025.',
    isOverridden: false,
    templateTitle: '{{productTitle}} - {{collectionTitle}} | Your Store',
    templateDescription: 'Shop our {{productTitle}} from our {{collectionTitle}} collection. New styles for {{season}} {{year}}.'
  },
  {
    id: '3',
    title: 'Floral Summer Dress',
    handle: 'floral-summer-dress',
    collection: 'Women\'s Apparel',
    collectionId: 'womens-apparel',
    metaTitle: 'Floral Summer Dress - Summer 2025 | Your Store',
    metaDescription: 'Shop our stylish Floral Summer Dress for Summer 2025. Perfect for beach days and summer parties.',
    isOverridden: true,
    templateTitle: '{{productTitle}} - {{season}} {{year}} | Your Store',
    templateDescription: 'Shop our stylish {{productTitle}} for {{season}} {{year}}. Perfect for beach days and summer parties.'
  },
  {
    id: '4',
    title: 'Leather Wallet',
    handle: 'leather-wallet',
    collection: 'Sale Items',
    collectionId: 'sale-items',
    metaTitle: 'Leather Wallet - 40% Off | Your Store',
    metaDescription: 'Premium Leather Wallet now available with 40% discount. Limited time offer!',
    isOverridden: true,
    templateTitle: '{{productTitle}} - {{maxDiscountPercentage}} Off | Your Store',
    templateDescription: 'Premium {{productTitle}} now available with {{maxDiscountPercentage}} discount. Limited time offer!'
  },
  {
    id: '5',
    title: 'Running Shoes',
    handle: 'running-shoes',
    collection: 'New Arrivals',
    collectionId: 'new-arrivals',
    metaTitle: 'Running Shoes - Summer 2025 | Your Store',
    metaDescription: 'Shop our new Running Shoes for Summer 2025. Designed for comfort and performance.',
    isOverridden: false,
    templateTitle: '{{productTitle}} - {{season}} {{year}} | Your Store',
    templateDescription: 'Shop our new {{productTitle}} for {{season}} {{year}}. Designed for comfort and performance.'
  },
  {
    id: '6',
    title: 'Wireless Headphones',
    handle: 'wireless-headphones',
    collection: 'New Arrivals',
    collectionId: 'new-arrivals',
    metaTitle: 'Wireless Headphones - Summer 2025 | Your Store',
    metaDescription: 'Discover our new Wireless Headphones for Summer 2025. Superior sound quality and comfort.',
    isOverridden: false,
    templateTitle: '{{productTitle}} - {{season}} {{year}} | Your Store',
    templateDescription: 'Discover our new {{productTitle}} for {{season}} {{year}}. Superior sound quality and comfort.'
  }
];

/**
 * Mock data for excluded products that don't use the global template
 */
const MOCK_EXCLUDED_PRODUCTS = [
  {
    id: '1',
    title: 'Premium Cotton T-Shirt',
    handle: 'premium-cotton-t-shirt',
    collection: 'Summer Essentials',
    excludedAt: new Date('2025-03-10')
  },
  {
    id: '3',
    title: 'Floral Summer Dress',
    handle: 'floral-summer-dress',
    collection: 'Women\'s Apparel',
    excludedAt: new Date('2025-03-15')
  },
  {
    id: '4',
    title: 'Leather Wallet',
    handle: 'leather-wallet',
    collection: 'Sale Items',
    excludedAt: new Date('2025-04-10')
  }
];

/**
 * Product Settings Page
 * 
 * Manages meta fields for products with global templates and exclusions
 */
export default function ProductsPage() {
  // Global product template state
  const [globalTemplate, setGlobalTemplate] = useState({
    title: "{{productTitle}} - {{season}} {{year}} | {{storeName}}",
    description: "Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{endif}}"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storeData, setStoreData] = useState({});
  
  // Product data state
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [excludedProducts, setExcludedProducts] = useState(MOCK_EXCLUDED_PRODUCTS);
  
  // Filter state for exclusions table
  const [queryValue, setQueryValue] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  
  // Modal states
  const [modalActive, setModalActive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editedMetaTitle, setEditedMetaTitle] = useState('');
  const [editedMetaDescription, setEditedMetaDescription] = useState('');
  const [isOverridden, setIsOverridden] = useState(false);
  
  // Reset confirmation modal
  const [resetModalActive, setResetModalActive] = useState(false);
  const [productToReset, setProductToReset] = useState(null);
  
  // Schedule modal
  const [scheduleModalActive, setScheduleModalActive] = useState(false);
  const [scheduledStartDate, setScheduledStartDate] = useState(new Date());
  const [scheduledEndDate, setScheduledEndDate] = useState(null);
  const [scheduledTemplate, setScheduledTemplate] = useState({
    title: "",
    description: ""
  });
  
  // Fetch global product template
  const fetchGlobalTemplate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // In a real app, we would fetch from API
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Set global template from mock data
      setGlobalTemplate({
        title: "{{productTitle}} - {{season}} {{year}} | {{storeName}}",
        description: "Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{endif}}"
      });
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Failed to load global template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch store data for variables
  const fetchStoreData = useCallback(async () => {
    try {
      // In a real app, we would fetch from API
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStoreData({
        storeName: 'Your Awesome Store',
        productTitle: 'Sample Product',
        productType: 'Apparel',
        productVendor: 'Fashion Brand',
        collectionTitle: 'Summer Collection',
        year: new Date().getFullYear().toString(),
        season: 'Summer',
        hasDiscount: 'true',
        maxDiscountPercentage: '40%',
        productPrice: '$29.99',
        comparePrice: '$49.99'
      });
    } catch (err) {
      console.error('Error fetching store data:', err);
    }
  }, []);
  
  // Save global template
  const handleSaveGlobalTemplate = useCallback(async () => {
    if (!globalTemplate) return;
    
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // In a real app, we would save to API
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSuccess('Global product template saved successfully!');
      
      // Dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.message || 'Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [globalTemplate]);
  
  // Handle global template update from preview component
  const handleGlobalTemplateUpdate = useCallback((updatedData) => {
    if (!globalTemplate) return;
    
    const field = updatedData.isTitle ? 'title' : 'description';
    setGlobalTemplate(prev => ({
      ...prev,
      [field]: updatedData.template
    }));
  }, [globalTemplate]);
  
  // Handle search query change
  const handleQueryValueChange = useCallback((value) => {
    setQueryValue(value);
  }, []);
  
  // Handle collection filter change
  const handleCollectionFilterChange = useCallback((value) => {
    setSelectedCollection(value);
  }, []);
  
  // Filter products based on search and collection
  const filteredExcludedProducts = excludedProducts.filter((product) => {
    // Filter by search query
    const matchesQuery = product.title.toLowerCase().includes(queryValue.toLowerCase()) ||
                       product.handle.toLowerCase().includes(queryValue.toLowerCase());
    
    // Filter by collection
    const matchesCollection = selectedCollection === '' || 
                             product.collection.toLowerCase().includes(selectedCollection.toLowerCase());
    
    return matchesQuery && matchesCollection;
  });
  
  // Open edit modal
  const handleEditClick = useCallback((product) => {
    setSelectedProduct(product);
    
    // Find full product data from main products array
    const fullProduct = products.find(p => p.id === product.id);
    
    if (fullProduct) {
      setEditedMetaTitle(fullProduct.templateTitle);
      setEditedMetaDescription(fullProduct.templateDescription);
      setIsOverridden(fullProduct.isOverridden);
    } else {
      // Default values if product not found
      setEditedMetaTitle('{{productTitle}} - {{season}} {{year}} | {{storeName}}');
      setEditedMetaDescription('Shop our {{productTitle}} for {{season}} {{year}}.');
      setIsOverridden(true);
    }
    
    setModalActive(true);
  }, [products]);
  
  // Open reset confirmation modal
  const handleResetClick = useCallback((product) => {
    setProductToReset(product);
    setResetModalActive(true);
  }, []);
  
  // Handle save in edit modal
  const handleSave = useCallback(async () => {
    if (!selectedProduct) return;
    
    setIsSaving(true);
    setError('');
    
    try {
      // Mock API call to save product meta fields
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update product in state
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === selectedProduct.id
            ? {
                ...product,
                templateTitle: editedMetaTitle,
                templateDescription: editedMetaDescription,
                isOverridden: isOverridden,
                // In a real app, you'd calculate these from the templates
                metaTitle: editedMetaTitle.replace(/\{\{([^}]+)\}\}/g, match => {
                  const variable = match.slice(2, -2).trim();
                  if (variable === 'productTitle') return product.title;
                  if (variable === 'season') return 'Summer';
                  if (variable === 'year') return '2025';
                  if (variable === 'storeName') return 'Your Store';
                  if (variable === 'collectionTitle') return product.collection;
                  if (variable === 'maxDiscountPercentage') return '40%';
                  return match;
                }),
                metaDescription: editedMetaDescription.replace(/\{\{if hasDiscount\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{endif\}\}/g, '$1')
                  .replace(/\{\{([^}]+)\}\}/g, match => {
                    const variable = match.slice(2, -2).trim();
                    if (variable === 'productTitle') return product.title;
                    if (variable === 'season') return 'Summer';
                    if (variable === 'year') return '2025';
                    if (variable === 'storeName') return 'Your Store';
                    if (variable === 'collectionTitle') return product.collection;
                    if (variable === 'maxDiscountPercentage') return '40%';
                    return match;
                  })
              }
            : product
        )
      );
      
      // If the product is now overridden and wasn't in the excluded list, add it
      if (isOverridden && !excludedProducts.some(p => p.id === selectedProduct.id)) {
        setExcludedProducts(prev => [
          ...prev,
          {
            id: selectedProduct.id,
            title: selectedProduct.title,
            handle: selectedProduct.handle,
            collection: selectedProduct.collection,
            excludedAt: new Date()
          }
        ]);
      }
      
      // If the product is no longer overridden, remove from excluded list
      if (!isOverridden) {
        setExcludedProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
      }
      
      // Close modal
      setModalActive(false);
    } catch (error) {
      console.error('Error saving meta fields:', error);
      setError('Failed to save meta fields. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedProduct, editedMetaTitle, editedMetaDescription, isOverridden, excludedProducts]);
  
  // Handle reset to global template
  const handleReset = useCallback(async () => {
    if (!productToReset) return;
    
    setIsLoading(true);
    
    try {
      // Mock API call to reset product to global template
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update product in state
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productToReset.id
            ? {
                ...product,
                isOverridden: false,
                // Use global template values
                templateTitle: globalTemplate.title,
                templateDescription: globalTemplate.description,
                metaTitle: product.title + ' - Summer 2025 | Your Store',
                metaDescription: 'Shop our ' + product.title + ' for Summer 2025.'
              }
            : product
        )
      );
      
      // Remove from excluded products
      setExcludedProducts(prev => prev.filter(p => p.id !== productToReset.id));
      
      // Close modal
      setResetModalActive(false);
    } catch (error) {
      console.error('Error resetting to global template:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productToReset, globalTemplate]);
  
  // Open schedule modal
  const handleScheduleClick = useCallback(() => {
    setScheduledTemplate({
      title: globalTemplate.title,
      description: globalTemplate.description
    });
    setScheduledStartDate(new Date());
    setScheduledEndDate(null);
    setScheduleModalActive(true);
  }, [globalTemplate]);
  
  // Handle schedule save
  const handleScheduleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Mock API call to save schedule
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSuccess('Schedule saved successfully!');
      
      // Dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // Close modal
      setScheduleModalActive(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError('Failed to save schedule. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [scheduledTemplate, scheduledStartDate, scheduledEndDate]);
  
  // Remove product from exclusions
  const handleRemoveExclusion = useCallback(async (productId) => {
    setIsLoading(true);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update product in products state
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId
            ? {
                ...product,
                isOverridden: false,
                // Use global template values
                templateTitle: globalTemplate.title,
                templateDescription: globalTemplate.description,
                metaTitle: product.title + ' - Summer 2025 | Your Store',
                metaDescription: 'Shop our ' + product.title + ' for Summer 2025.'
              }
            : product
        )
      );
      
      // Remove from excluded products
      setExcludedProducts(prev => prev.filter(p => p.id !== productId));
      
      setSuccess('Product removed from exclusions and reset to global template.');
      
      // Dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error removing exclusion:', error);
      setError('Failed to remove product from exclusions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [globalTemplate]);
  
  // Load data on mount
  useEffect(() => {
    fetchGlobalTemplate();
    fetchStoreData();
  }, [fetchGlobalTemplate, fetchStoreData]);
  
  // Handle rendering based on loading state
  if (isLoading && !products.length) {
    return (
      <Page>
        <TitleBar title="Product Settings" />
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="4" alignment="center">
                <Spinner size="large" />
                <Box paddingBlockStart="4">
                  <Text as="p" alignment="center">Loading products...</Text>
                </Box>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  return (
    <Page
      backAction={{ content: 'Home', url: '/' }}
      title="Product Settings"
      primaryAction={{
        content: 'Save Global Template',
        onAction: handleSaveGlobalTemplate,
        loading: isSaving,
      }}
      secondaryActions={[
        {
          content: 'Schedule Changes',
          onAction: handleScheduleClick,
          icon: CalendarIcon,
        },
      ]}
    >
      <TitleBar title="Product Settings" />
      
      <BlockStack gap="500">
        {error && (
          <Banner status="critical" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}
        
        {success && (
          <Banner status="success" onDismiss={() => setSuccess('')}>
            {success}
          </Banner>
        )}
        
        {isLoading && <Loading />}
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Global Product Meta Title Template
                </Text>
                
                <Text variant="bodyMd" color="subdued">
                  This template will be used to generate meta titles for all products that don't have custom settings.
                  Use variables like <code>{{'{{'}}productTitle{{'}}'}}</code> and <code>{{'{{'}}season{{'}}'}}</code> that will be automatically replaced.
                </Text>
                
                <VariablePreview
                  initialTemplate={globalTemplate?.title || ''}
                  onUpdate={(data) => handleGlobalTemplateUpdate({ ...data, isTitle: true })}
                  sampleData={storeData}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Global Product Meta Description Template
                </Text>
                
                <Text variant="bodyMd" color="subdued">
                  This template will be used to generate meta descriptions for all products that don't have custom settings.
                  You can use variables and conditional logic like <code>{{'{{'}}if hasDiscount{{'}}'}}</code> for dynamic content.
                </Text>
                
                <VariablePreview
                  initialTemplate={globalTemplate?.description || ''}
                  onUpdate={(data) => handleGlobalTemplateUpdate({ ...data, isTitle: false })}
                  sampleData={storeData}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        
        {/* Table of Excluded Products */}
        <Card>
          <BlockStack gap="400">
            <Box paddingBlockStart="400" paddingInlineStart="400" paddingInlineEnd="400">
              <Text variant="headingMd">
                Excluded Products
              </Text>
              <Text variant="bodyMd" color="subdued">
                These products have custom meta tags and don't use the global template.
                To add a product to this list, edit it and enable "Override global template".
              </Text>
            </Box>
            
            <IndexTable
              resourceName={{
                singular: 'excluded product',
                plural: 'excluded products',
              }}
              itemCount={filteredExcludedProducts.length}
              headings={[
                {title: 'Product'},
                {title: 'Collection'},
                {title: 'Excluded Since'},
                {title: 'Actions'},
              ]}
              selectable={false}
              lastColumnSticky
              loading={isLoading}
              filterControl={
                <Filters
                  queryValue={queryValue}
                  queryPlaceholder="Search products"
                  onQueryChange={handleQueryValueChange}
                  onQueryClear={() => setQueryValue('')}
                  filters={[
                    {
                      key: 'collection',
                      label: 'Collection',
                      filter: (
                        <Select
                          label="Collection"
                          options={COLLECTIONS}
                          onChange={handleCollectionFilterChange}
                          value={selectedCollection}
                        />
                      ),
                    }
                  ]}
                />
              }
              emptyState={
                <EmptySearchResult
                  title="No excluded products found"
                  description="All products are using the global template. To exclude a product, edit it and enable 'Override global template'."
                  withIllustration
                />
              }
            >
              {filteredExcludedProducts.map((product, index) => (
                <IndexTable.Row id={product.id} key={product.id} position={index}>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                      {product.title}
                    </Text>
                    <div>
                      <Text variant="bodySm" as="span" color="subdued">
                        {product.handle}
                      </Text>
                    </div>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">
                      {product.collection}
                    </Text>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">
                      {product.excludedAt.toLocaleDateString()}
                    </Text>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <InlineStack gap="200">
                      <Button
                        size="slim"
                        onClick={() => handleEditClick(product)}
                        icon={EditIcon}
                      >
                        Edit
                      </Button>
                      
                      <Button
                        size="slim"
                        destructive
                        onClick={() => handleRemoveExclusion(product.id)}
                        icon={DeleteIcon}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </BlockStack>
        </Card>
        
        {/* Scheduling Section */}
        <Card>
          <BlockStack gap="400">
            <Box paddingBlockStart="400" paddingInlineStart="400" paddingInlineEnd="400">
              <Text variant="headingMd">
                Scheduled Template Changes
              </Text>
              <Text variant="bodyMd" color="subdued">
                Schedule updates to your global product meta tags to automatically go live on a specific date.
                Perfect for seasonal promotions and sales events.
              </Text>
            </Box>
            
            <Box padding="400">
              <Banner status="info">
                <BlockStack gap="200">
                  <Text variant="bodyMd">
                    No scheduled changes for products.
                  </Text>
                  
                  <Button
                    size="slim"
                    onClick={handleScheduleClick}
                    icon={CalendarIcon}
                  >
                    Schedule a Template Change
                  </Button>
                </BlockStack>
              </Banner>
            </Box>
          </BlockStack>
        </Card>
        
        {/* Variable Reference */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd">
              Available Variables
            </Text>
            
            <BlockStack gap="200">
              <Text variant="headingSm">Basic Variables</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}storeName{{'}}'}}</code> - Your store's name<br />
                <code>{{'{{'}}year{{'}}'}}</code> - Current year (e.g., {new Date().getFullYear()})<br />
                <code>{{'{{'}}season{{'}}'}}</code> - Current season (Spring, Summer, Fall, Winter)
              </Text>
              
              <Text variant="headingSm">Product Variables</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}productTitle{{'}}'}}</code> - The product's title<br />
                <code>{{'{{'}}productType{{'}}'}}</code> - The product's type category<br />
                <code>{{'{{'}}productVendor{{'}}'}}</code> - The product's vendor/brand<br />
                <code>{{'{{'}}productPrice{{'}}'}}</code> - The product's current price<br />
                <code>{{'{{'}}comparePrice{{'}}'}}</code> - The product's compare-at price
              </Text>
              
              <Text variant="headingSm">Collection Variables</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}collectionTitle{{'}}'}}</code> - The product's primary collection title
              </Text>
              
              <Text variant="headingSm">Discount Variables</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}hasDiscount{{'}}'}}</code> - Boolean flag if product has discount<br />
                <code>{{'{{'}}maxDiscountPercentage{{'}}'}}</code> - Product's discount percentage
              </Text>
              
              <Text variant="headingSm">Conditional Logic</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}if hasDiscount{{'}}'}}</code> Sale text here <code>{{'{{'}}else{{'}}'}}</code> Regular text here <code>{{'{{'}}endif{{'}}'}}</code>
              </Text>
              
              <Text variant="headingSm">Format Modifiers</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}productTitle:uppercase{{'}}'}}</code> - Convert to uppercase<br />
                <code>{{'{{'}}productTitle:lowercase{{'}}'}}</code> - Convert to lowercase
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
        
        <InlineStack distribution="center">
          <Button primary onClick={handleSaveGlobalTemplate} loading={isSaving}>
            Save Global Template
          </Button>
        </InlineStack>
      </BlockStack>
      
      {/* Edit Modal */}
      <Modal
        open={modalActive}
        onClose={() => setModalActive(false)}
        title={`Edit Meta Fields - ${selectedProduct?.title || ''}`}
        primaryAction={{
          content: 'Save',
          onAction: handleSave,
          loading: isSaving,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setModalActive(false),
          },
        ]}
        large
      >
        <Modal.Section>
          {error && (
            <Box paddingBlockEnd="400">
              <Banner status="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            </Box>
          )}
          
          <MetaFieldEditor
            metaTitle={editedMetaTitle}
            metaDescription={editedMetaDescription}
            onMetaTitleChange={setEditedMetaTitle}
            onMetaDescriptionChange={setEditedMetaDescription}
            sampleData={storeData}
            isGlobal={false}
            isOverridden={isOverridden}
            onOverrideChange={setIsOverridden}
          />
        </Modal.Section>
      </Modal>
      
      {/* Reset Confirmation Modal */}
      <Modal
        open={resetModalActive}
        onClose={() => setResetModalActive(false)}
        title="Reset to Global Template"
        primaryAction={{
          content: 'Reset',
          onAction: handleReset,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setResetModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <Text variant="bodyMd">
            Are you sure you want to reset "{productToReset?.title}" to use the global template?
            This will remove any custom meta fields for this product.
          </Text>
        </Modal.Section>
      </Modal>
      
      {/* Schedule Modal */}
      <Modal
        open={scheduleModalActive}
        onClose={() => setScheduleModalActive(false)}
        title="Schedule Template Changes"
        primaryAction={{
          content: 'Save Schedule',
          onAction: handleScheduleSave,
          loading: isSaving,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setScheduleModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner status="info">
              <Text variant="bodyMd">
                Scheduling functionality allows you to set start and end dates for template changes.
                This is perfect for seasonal promotions or limited-time sales.
              </Text>
            </Banner>
            
            <MetaFieldEditor
              metaTitle={scheduledTemplate.title}
              metaDescription={scheduledTemplate.description}
              onMetaTitleChange={(value) => setScheduledTemplate(prev => ({ ...prev, title: value }))}
              onMetaDescriptionChange={(value) => setScheduledTemplate(prev => ({ ...prev, description: value }))}
              sampleData={storeData}
              isGlobal={true}
            />
            
            <Box paddingBlockStart="400">
              <Text variant="headingSm">Schedule Dates</Text>
              <Text variant="bodyMd" color="subdued">
                Select when these changes should take effect and optionally when they should revert.
              </Text>
              
              <BlockStack gap="300">
                <Box paddingBlockStart="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="bodyMd" as="span">Start Date:</Text>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      {scheduledStartDate.toLocaleDateString()}
                    </Text>
                    <Button size="slim">Change</Button>
                  </InlineStack>
                </Box>
                
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="bodyMd" as="span">End Date:</Text>
                  <Text variant="bodyMd" as="span" fontWeight="bold">
                    {scheduledEndDate ? scheduledEndDate.toLocaleDateString() : 'No end date (permanent change)'}
                  </Text>
                  <Button size="slim">
                    {scheduledEndDate ? 'Change' : 'Set End Date'}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}