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
  Loading
} from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { CalendarIcon, EditIcon, ResetIcon, ClockIcon, DeleteIcon } from '@shopify/polaris-icons';
import MetaFieldEditor from '../../components/MetaFieldEditor';
import VariablePreview from '../../components/VariablePreview/VariablePreview';

/**
 * Mock collection data
 */
const MOCK_COLLECTIONS = [
  {
    id: '1',
    title: 'Summer Essentials',
    handle: 'summer-essentials',
    productsCount: 24,
    metaTitle: 'Summer Essentials - Summer 2025 Collection | Your Store',
    metaDescription: 'Explore our Summer Essentials for Summer 2025. Save up to 40% on selected items!',
    isOverridden: true,
    templateTitle: '{{collectionTitle}} - {{season}} {{year}} Collection | Your Store',
    templateDescription: 'Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}'
  },
  {
    id: '2',
    title: 'Men\'s Apparel',
    handle: 'mens-apparel',
    productsCount: 42,
    metaTitle: 'Men\'s Apparel - Summer 2025 | Your Store',
    metaDescription: 'Shop our Men\'s Apparel collection for Summer 2025. New arrivals now available.',
    isOverridden: false,
    templateTitle: '{{collectionTitle}} - {{season}} {{year}} | Your Store',
    templateDescription: 'Shop our {{collectionTitle}} collection for {{season}} {{year}}. {{if hasDiscount}}Now on sale with up to {{maxDiscountPercentage}} off!{{else}}New arrivals now available.{{endif}}'
  },
  {
    id: '3',
    title: 'Women\'s Apparel',
    handle: 'womens-apparel',
    productsCount: 56,
    metaTitle: 'Women\'s Apparel - Summer 2025 | Your Store',
    metaDescription: 'Shop our Women\'s Apparel collection for Summer 2025. New styles added weekly!',
    isOverridden: false,
    templateTitle: '{{collectionTitle}} - {{season}} {{year}} | Your Store',
    templateDescription: 'Shop our {{collectionTitle}} collection for {{season}} {{year}}. {{if hasDiscount}}Now on sale with up to {{maxDiscountPercentage}} off!{{else}}New arrivals now available.{{endif}}'
  },
  {
    id: '4',
    title: 'Sale Items',
    handle: 'sale-items',
    productsCount: 18,
    metaTitle: 'Sale Items - Save up to 50% | Your Store',
    metaDescription: 'Shop our Sale Items and save up to 50% on selected products. Limited time offer!',
    isOverridden: true,
    templateTitle: '{{collectionTitle}} - Save up to {{maxDiscountPercentage}} | Your Store',
    templateDescription: 'Shop our {{collectionTitle}} and save up to {{maxDiscountPercentage}} on selected products. Limited time offer!'
  },
  {
    id: '5',
    title: 'New Arrivals',
    handle: 'new-arrivals',
    productsCount: 12,
    metaTitle: 'New Arrivals - Summer 2025 | Your Store',
    metaDescription: 'Discover our latest New Arrivals for Summer 2025. Be the first to shop our newest styles!',
    isOverridden: false,
    templateTitle: '{{collectionTitle}} - {{season}} {{year}} | Your Store',
    templateDescription: 'Shop our {{collectionTitle}} collection for {{season}} {{year}}. {{if hasDiscount}}Now on sale with up to {{maxDiscountPercentage}} off!{{else}}New arrivals now available.{{endif}}'
  }
];

/**
 * Mock data for excluded collections that don't use the global template
 */
const MOCK_EXCLUDED_COLLECTIONS = [
  {
    id: '1',
    title: 'Summer Essentials',
    handle: 'summer-essentials',
    productsCount: 24,
    excludedAt: new Date('2025-03-15')
  },
  {
    id: '4',
    title: 'Sale Items',
    handle: 'sale-items',
    productsCount: 18,
    excludedAt: new Date('2025-04-10')
  }
];

/**
 * Collection Settings Page
 * 
 * Manages meta fields for collections with global templates and exclusions
 */
export default function CollectionsPage() {
  // Global collection template state
  const [globalTemplate, setGlobalTemplate] = useState({
    title: "{{collectionTitle}} - {{season}} {{year}} Collection | {{storeName}}",
    description: "Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storeData, setStoreData] = useState({});
  
  // Collection data state
  const [collections, setCollections] = useState(MOCK_COLLECTIONS);
  const [excludedCollections, setExcludedCollections] = useState(MOCK_EXCLUDED_COLLECTIONS);
  
  // Filter state for exclusions table
  const [queryValue, setQueryValue] = useState('');
  
  // Modal states
  const [modalActive, setModalActive] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [editedMetaTitle, setEditedMetaTitle] = useState('');
  const [editedMetaDescription, setEditedMetaDescription] = useState('');
  const [isOverridden, setIsOverridden] = useState(false);
  
  // Reset confirmation modal
  const [resetModalActive, setResetModalActive] = useState(false);
  const [collectionToReset, setCollectionToReset] = useState(null);
  
  // Schedule modal
  const [scheduleModalActive, setScheduleModalActive] = useState(false);
  const [scheduledStartDate, setScheduledStartDate] = useState(new Date());
  const [scheduledEndDate, setScheduledEndDate] = useState(null);
  const [scheduledTemplate, setScheduledTemplate] = useState({
    title: "",
    description: ""
  });
  
  // Fetch global collection template
  const fetchGlobalTemplate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // In a real app, we would fetch from API
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Set global template from mock data
      setGlobalTemplate({
        title: "{{collectionTitle}} - {{season}} {{year}} Collection | {{storeName}}",
        description: "Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}"
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
        collectionTitle: 'Sample Collection',
        year: new Date().getFullYear().toString(),
        season: 'Summer',
        hasDiscount: 'true',
        maxDiscountPercentage: '40%',
        minDiscountPercentage: '20%',
        discountRange: '20-40%'
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
      
      setSuccess('Global collection template saved successfully!');
      
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
  
  // Filter collections based on search
  const filteredExcludedCollections = excludedCollections.filter((collection) => {
    // Filter by search query
    return collection.title.toLowerCase().includes(queryValue.toLowerCase()) ||
           collection.handle.toLowerCase().includes(queryValue.toLowerCase());
  });
  
  // Open edit modal
  const handleEditClick = useCallback((collection) => {
    setSelectedCollection(collection);
    setEditedMetaTitle(collection.templateTitle);
    setEditedMetaDescription(collection.templateDescription);
    setIsOverridden(collection.isOverridden);
    setModalActive(true);
  }, []);
  
  // Open reset confirmation modal
  const handleResetClick = useCallback((collection) => {
    setCollectionToReset(collection);
    setResetModalActive(true);
  }, []);
  
  // Handle save in edit modal
  const handleSave = useCallback(async () => {
    if (!selectedCollection) return;
    
    setIsSaving(true);
    setError('');
    
    try {
      // Mock API call to save collection meta fields
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update collection in state
      setCollections(prevCollections => 
        prevCollections.map(collection => 
          collection.id === selectedCollection.id
            ? {
                ...collection,
                templateTitle: editedMetaTitle,
                templateDescription: editedMetaDescription,
                isOverridden: isOverridden,
                // In a real app, you'd calculate these from the templates
                metaTitle: editedMetaTitle.replace(/\{\{([^}]+)\}\}/g, 'DEMO'),
                metaDescription: editedMetaDescription.replace(/\{\{([^}]+)\}\}/g, 'DEMO')
              }
            : collection
        )
      );
      
      // If the collection is now overridden and wasn't in the excluded list, add it
      if (isOverridden && !excludedCollections.some(c => c.id === selectedCollection.id)) {
        setExcludedCollections(prev => [
          ...prev,
          {
            id: selectedCollection.id,
            title: selectedCollection.title,
            handle: selectedCollection.handle,
            productsCount: selectedCollection.productsCount,
            excludedAt: new Date()
          }
        ]);
      }
      
      // If the collection is no longer overridden, remove from excluded list
      if (!isOverridden) {
        setExcludedCollections(prev => prev.filter(c => c.id !== selectedCollection.id));
      }
      
      // Close modal
      setModalActive(false);
    } catch (error) {
      console.error('Error saving meta fields:', error);
      setError('Failed to save meta fields. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedCollection, editedMetaTitle, editedMetaDescription, isOverridden, excludedCollections]);
  
  // Handle reset to global template
  const handleReset = useCallback(async () => {
    if (!collectionToReset) return;
    
    setIsLoading(true);
    
    try {
      // Mock API call to reset collection to global template
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update collection in state
      setCollections(prevCollections => 
        prevCollections.map(collection => 
          collection.id === collectionToReset.id
            ? {
                ...collection,
                isOverridden: false,
                // Use global template values
                templateTitle: globalTemplate.title,
                templateDescription: globalTemplate.description,
                metaTitle: collection.title + ' - Summer 2025 Collection | Your Store',
                metaDescription: 'Explore our ' + collection.title + ' for Summer 2025. New arrivals now available.'
              }
            : collection
        )
      );
      
      // Remove from excluded collections
      setExcludedCollections(prev => prev.filter(c => c.id !== collectionToReset.id));
      
      // Close modal
      setResetModalActive(false);
    } catch (error) {
      console.error('Error resetting to global template:', error);
    } finally {
      setIsLoading(false);
    }
  }, [collectionToReset, globalTemplate]);
  
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
  
  // Remove collection from exclusions
  const handleRemoveExclusion = useCallback(async (collectionId) => {
    setIsLoading(true);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update collection in collections state
      setCollections(prevCollections => 
        prevCollections.map(collection => 
          collection.id === collectionId
            ? {
                ...collection,
                isOverridden: false,
                // Use global template values
                templateTitle: globalTemplate.title,
                templateDescription: globalTemplate.description,
                metaTitle: collection.title + ' - Summer 2025 Collection | Your Store',
                metaDescription: 'Explore our ' + collection.title + ' for Summer 2025. New arrivals now available.'
              }
            : collection
        )
      );
      
      // Remove from excluded collections
      setExcludedCollections(prev => prev.filter(c => c.id !== collectionId));
      
      setSuccess('Collection removed from exclusions and reset to global template.');
      
      // Dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error removing exclusion:', error);
      setError('Failed to remove collection from exclusions. Please try again.');
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
  if (isLoading && !collections.length) {
    return (
      <Page>
        <TitleBar title="Collection Settings" />
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="4" alignment="center">
                <Spinner size="large" />
                <Box paddingBlockStart="4">
                  <Text as="p" alignment="center">Loading collections...</Text>
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
      title="Collection Settings"
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
      <TitleBar title="Collection Settings" />
      
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
                  Global Collection Meta Title Template
                </Text>
                
                <Text variant="bodyMd" color="subdued">
                  This template will be used to generate meta titles for all collections that don't have custom settings.
                  Use variables like <code>{{'{{'}}collectionTitle{{'}}'}}</code> and <code>{{'{{'}}season{{'}}'}}</code> that will be automatically replaced.
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
                  Global Collection Meta Description Template
                </Text>
                
                <Text variant="bodyMd" color="subdued">
                  This template will be used to generate meta descriptions for all collections that don't have custom settings.
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
        
        {/* Table of Excluded Collections */}
        <Card>
          <BlockStack gap="400">
            <Box paddingBlockStart="400" paddingInlineStart="400" paddingInlineEnd="400">
              <Text variant="headingMd">
                Excluded Collections
              </Text>
              <Text variant="bodyMd" color="subdued">
                These collections have custom meta tags and don't use the global template.
                To add a collection to this list, edit it and enable "Override global template".
              </Text>
            </Box>
            
            <IndexTable
              resourceName={{
                singular: 'excluded collection',
                plural: 'excluded collections',
              }}
              itemCount={filteredExcludedCollections.length}
              headings={[
                {title: 'Collection'},
                {title: 'Products'},
                {title: 'Excluded Since'},
                {title: 'Actions'},
              ]}
              selectable={false}
              lastColumnSticky
              loading={isLoading}
              filterControl={
                <Filters
                  queryValue={queryValue}
                  queryPlaceholder="Search collections"
                  onQueryChange={handleQueryValueChange}
                  onQueryClear={() => setQueryValue('')}
                />
              }
              emptyState={
                <EmptySearchResult
                  title="No excluded collections found"
                  description="All collections are using the global template. To exclude a collection, edit it and enable 'Override global template'."
                  withIllustration
                />
              }
            >
              {filteredExcludedCollections.map((collection, index) => (
                <IndexTable.Row id={collection.id} key={collection.id} position={index}>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                      {collection.title}
                    </Text>
                    <div>
                      <Text variant="bodySm" as="span" color="subdued">
                        {collection.handle}
                      </Text>
                    </div>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">
                      {collection.productsCount}
                    </Text>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">
                      {collection.excludedAt.toLocaleDateString()}
                    </Text>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <InlineStack gap="200">
                      <Button
                        size="slim"
                        onClick={() => {
                          const fullCollection = collections.find(c => c.id === collection.id);
                          if (fullCollection) handleEditClick(fullCollection);
                        }}
                        icon={EditIcon}
                      >
                        Edit
                      </Button>
                      
                      <Button
                        size="slim"
                        destructive
                        onClick={() => handleRemoveExclusion(collection.id)}
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
                Schedule updates to your global collection meta tags to automatically go live on a specific date.
                Perfect for seasonal promotions and sales events.
              </Text>
            </Box>
            
            <Box padding="400">
              <Banner status="info">
                <BlockStack gap="200">
                  <Text variant="bodyMd">
                    No scheduled changes for collections.
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
              
              <Text variant="headingSm">Collection Variables</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}collectionTitle{{'}}'}}</code> - The collection's title<br />
                <code>{{'{{'}}collectionDescription{{'}}'}}</code> - Short excerpt from collection description<br />
                <code>{{'{{'}}productsCount{{'}}'}}</code> - Number of products in the collection
              </Text>
              
              <Text variant="headingSm">Discount Variables</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}hasDiscount{{'}}'}}</code> - Boolean flag if any products have discounts<br />
                <code>{{'{{'}}maxDiscountPercentage{{'}}'}}</code> - Highest discount percentage<br />
                <code>{{'{{'}}discountRange{{'}}'}}</code> - Range of discounts (e.g., "10-30%")<br />
                <code>{{'{{'}}discountedCount{{'}}'}}</code> - Number of discounted products
              </Text>
              
              <Text variant="headingSm">Conditional Logic</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}if hasDiscount{{'}}'}}</code> Sale text here <code>{{'{{'}}else{{'}}'}}</code> Regular text here <code>{{'{{'}}endif{{'}}'}}</code>
              </Text>
              
              <Text variant="headingSm">Format Modifiers</Text>
              <Text variant="bodyMd">
                <code>{{'{{'}}collectionTitle:uppercase{{'}}'}}</code> - Convert to uppercase<br />
                <code>{{'{{'}}collectionTitle:lowercase{{'}}'}}</code> - Convert to lowercase
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
        title={`Edit Meta Fields - ${selectedCollection?.title || ''}`}
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
            Are you sure you want to reset "{collectionToReset?.title}" to use the global template?
            This will remove any custom meta fields for this collection.
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