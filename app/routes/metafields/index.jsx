import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  ButtonGroup,
  Button,
  TextField,
  Modal,
  Banner,
  BlockStack,
  Tabs,
  Badge,
  InlineStack,
  EmptyState
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import VariablePreview from "../../components/VariablePreview";

/**
 * Meta Fields page component
 */
export default function MetaFields() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mock data for products and collections
  const [products] = useState([
    {
      id: '1',
      title: 'Cotton T-Shirt',
      metaTitle: '{{productTitle}} - Summer {{year}} Fashion',
      metaDescription: 'Shop our premium {{productTitle}} for {{season}} {{year}}',
      handle: 'cotton-t-shirt',
      type: 'Apparel'
    },
    {
      id: '2',
      title: 'Wireless Headphones',
      metaTitle: '{{productTitle}} - Premium Audio',
      metaDescription: 'Experience premium sound with our {{productTitle}}',
      handle: 'wireless-headphones',
      type: 'Electronics'
    }
  ]);
  
  const [collections] = useState([
    {
      id: '1',
      title: 'Summer Essentials',
      metaTitle: '{{collectionTitle}} - {{season}} {{year}} Collection',
      metaDescription: '{{if hasDiscount}}Save up to {{maxDiscountPercentage}} on {{collectionTitle}}!{{else}}Shop our {{collectionTitle}} for {{season}} {{year}}{{endif}}',
      handle: 'summer-essentials',
      productCount: 15
    },
    {
      id: '2',
      title: 'Electronics',
      metaTitle: '{{collectionTitle}} - Latest Technology',
      metaDescription: 'Discover the latest technology in our {{collectionTitle}} collection',
      handle: 'electronics',
      productCount: 25
    }
  ]);
  
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
  
  // Tabs configuration
  const tabs = [
    {
      id: 'products',
      content: 'Products',
      accessibilityLabel: 'Products tab',
      panelID: 'products-panel',
    },
    {
      id: 'collections',
      content: 'Collections',
      accessibilityLabel: 'Collections tab',
      panelID: 'collections-panel',
    },
  ];
  
  // Handle tab change
  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
    setSelectedItems([]);
  }, []);
  
  // Handle resource item click
  const handleItemClick = useCallback((item) => {
    setCurrentItem(item);
    setMetaTitle(item.metaTitle || '');
    setMetaDescription(item.metaDescription || '');
    setModalOpen(true);
  }, []);
  
  // Handle item selection
  const handleSelectionChange = useCallback((selectedIds) => {
    setSelectedItems(selectedIds);
  }, []);
  
  // Handle search
  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
  }, []);
  
  // Filter items based on search
  const getFilteredItems = useCallback(() => {
    const items = selectedTab === 0 ? products : collections;
    
    if (!searchValue) {
      return items;
    }
    
    const lowerSearchValue = searchValue.toLowerCase();
    return items.filter(
      item => item.title.toLowerCase().includes(lowerSearchValue) || 
              item.handle.toLowerCase().includes(lowerSearchValue)
    );
  }, [products, collections, searchValue, selectedTab]);
  
  // Handle save meta fields
  const handleSaveMetaFields = useCallback(() => {
    setIsSaving(true);
    
    // In a real app, this would call your API
    setTimeout(() => {
      // Update the current item with new meta fields
      if (selectedTab === 0) {
        // Update product
        const updatedProducts = products.map(product => 
          product.id === currentItem.id 
            ? { ...product, metaTitle, metaDescription } 
            : product
        );
        // You would update state here in a real app
      } else {
        // Update collection
        const updatedCollections = collections.map(collection => 
          collection.id === currentItem.id 
            ? { ...collection, metaTitle, metaDescription } 
            : collection
        );
        // You would update state here in a real app
      }
      
      setIsSaving(false);
      setModalOpen(false);
    }, 1000);
  }, [currentItem, metaTitle, metaDescription, products, collections, selectedTab]);
  
  // Render resource list item
  const renderItem = (item) => {
    const { id, title, metaTitle, metaDescription, handle } = item;
    const url = selectedTab === 0 
      ? `/products/${handle}` 
      : `/collections/${handle}`;
    
    return (
      <ResourceItem
        id={id}
        url={url}
        accessibilityLabel={`View details for ${title}`}
        name={title}
        onClick={() => handleItemClick(item)}
      >
        <BlockStack gap="200">
          <Text variant="bodyMd" fontWeight="bold">
            {title}
          </Text>
          
          <InlineStack gap="200">
            <Badge>Meta Title</Badge>
            <Text variant="bodySm" as="span">
              {metaTitle || 'No meta title set'}
            </Text>
          </InlineStack>
          
          <InlineStack gap="200">
            <Badge>Meta Desc</Badge>
            <Text variant="bodySm" as="span">
              {metaDescription || 'No meta description set'}
            </Text>
          </InlineStack>
        </BlockStack>
      </ResourceItem>
    );
  };
  
  return (
    <Page>
      <TitleBar title="Meta Tags Manager" />
      
      <Tabs
        tabs={tabs}
        selected={selectedTab}
        onSelect={handleTabChange}
        fitted
      >
        <Card>
          <ResourceList
            resourceName={{
              singular: selectedTab === 0 ? 'product' : 'collection',
              plural: selectedTab === 0 ? 'products' : 'collections',
            }}
            items={getFilteredItems()}
            renderItem={renderItem}
            selectedItems={selectedItems}
            onSelectionChange={handleSelectionChange}
            selectable
            filterControl={
              <TextField
                label="Search"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder={`Search ${selectedTab === 0 ? 'products' : 'collections'}`}
                clearButton
                onClearButtonClick={() => setSearchValue('')}
              />
            }
            emptyState={
              <EmptyState
                heading={`No ${selectedTab === 0 ? 'products' : 'collections'} found`}
                action={{ content: 'Create new' }}
                image=""
              >
                <p>No items match your search criteria.</p>
              </EmptyState>
            }
          />
        </Card>
      </Tabs>
      
      {/* Meta Fields Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Edit Meta Tags - ${currentItem?.title || ''}`}
        primaryAction={{
          content: 'Save',
          onAction: handleSaveMetaFields,
          loading: isSaving,
        }}
        secondaryActions={[
          {
            content: 'Preview',
            onAction: () => setIsPreviewOpen(true),
          },
          {
            content: 'Cancel',
            onAction: () => setModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="Meta Title"
              value={metaTitle}
              onChange={setMetaTitle}
              helpText="Use variables like {{year}}, {{month}}, {{productTitle}}, etc."
              multiline={2}
              autoComplete="off"
            />
            
            <TextField
              label="Meta Description"
              value={metaDescription}
              onChange={setMetaDescription}
              helpText="Use variables and conditional logic for dynamic descriptions"
              multiline={4}
              autoComplete="off"
            />
            
            <Banner status="info">
              Variables will be automatically replaced with real values when displayed on your storefront.
            </Banner>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      {/* Variable Preview Modal */}
      <Modal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Preview Meta Tags"
        primaryAction={{
          content: 'Close',
          onAction: () => setIsPreviewOpen(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="headingSm">Meta Title Preview:</Text>
            <Card sectioned>
              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="bold">
                  Template: {metaTitle}
                </Text>
                <Text variant="bodyMd">
                  Preview: {/* This would call your variable parser */}
                </Text>
              </BlockStack>
            </Card>
            
            <Text variant="headingSm">Meta Description Preview:</Text>
            <Card sectioned>
              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="bold">
                  Template: {metaDescription}
                </Text>
                <Text variant="bodyMd">
                  Preview: {/* This would call your variable parser */}
                </Text>
              </BlockStack>
            </Card>
            
            <VariablePreview
              initialTemplate={metaTitle}
              sampleData={sampleData}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}