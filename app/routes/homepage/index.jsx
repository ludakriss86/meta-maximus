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
import { HomeIcon, CalendarIcon, EditIcon, DeleteIcon } from '@shopify/polaris-icons';
import VariablePreview from '../../components/VariablePreview/VariablePreview';
import MetaFieldEditor from '../../components/MetaFieldEditor';

/**
 * Mock data for excluded pages
 */
const MOCK_EXCLUDED_PAGES = [
  {
    id: '1',
    title: 'Custom Home Page Layout',
    handle: 'custom-home',
    type: 'special_layout',
    excludedAt: new Date('2025-04-01')
  },
  {
    id: '2',
    title: 'Holiday Home Page',
    handle: 'holiday-home',
    type: 'seasonal',
    excludedAt: new Date('2025-03-15')
  }
];

/**
 * Home Page Meta Editor
 * 
 * Allows editing the meta title and description for the store's home page
 */
export default function HomePageEditor() {
  const [template, setTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storeData, setStoreData] = useState({});
  const [variables, setVariables] = useState({});

  // Excluded pages state
  const [excludedPages, setExcludedPages] = useState(MOCK_EXCLUDED_PAGES);
  const [queryValue, setQueryValue] = useState('');
  
  // Schedule modal
  const [scheduleModalActive, setScheduleModalActive] = useState(false);
  const [scheduledStartDate, setScheduledStartDate] = useState(new Date());
  const [scheduledEndDate, setScheduledEndDate] = useState(null);
  const [scheduledTemplate, setScheduledTemplate] = useState({
    title: "",
    description: ""
  });
  
  // Edit modal for excluded page
  const [modalActive, setModalActive] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [editedMetaTitle, setEditedMetaTitle] = useState('');
  const [editedMetaDescription, setEditedMetaDescription] = useState('');
  const [isOverridden, setIsOverridden] = useState(true);
  
  // Fetch home page template
  const fetchTemplate = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/homepage/template');
      
      if (!response.ok) {
        throw new Error('Failed to fetch home page template');
      }
      
      const data = await response.json();
      setTemplate(data.template);
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Failed to load template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch store data for variables
  const fetchStoreData = useCallback(async () => {
    try {
      const response = await fetch('/api/store/data');
      
      if (!response.ok) {
        throw new Error('Failed to fetch store data');
      }
      
      const data = await response.json();
      setStoreData({
        storeName: data.store.name,
        storeDomain: data.store.domain,
        ...data.basicVariables
      });
      setVariables(data.variables);
    } catch (err) {
      console.error('Error fetching store data:', err);
    }
  }, []);
  
  // Save template
  const handleSave = useCallback(async () => {
    if (!template) return;
    
    setIsSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/homepage/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }
      
      setSuccess('Home page meta tags saved successfully!');
      
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
  }, [template]);
  
  // Handle template update from preview component
  const handleTemplateUpdate = useCallback((updatedData) => {
    if (!template) return;
    
    const field = updatedData.isTitle ? 'title' : 'description';
    setTemplate(prev => ({
      ...prev,
      [field]: updatedData.template
    }));
  }, [template]);
  
  // Handle search query change
  const handleQueryValueChange = useCallback((value) => {
    setQueryValue(value);
  }, []);
  
  // Filter pages based on search
  const filteredExcludedPages = excludedPages.filter((page) => {
    // Filter by search query
    return page.title.toLowerCase().includes(queryValue.toLowerCase()) ||
           page.handle.toLowerCase().includes(queryValue.toLowerCase()) ||
           page.type.toLowerCase().includes(queryValue.toLowerCase());
  });
  
  // Open edit modal for a page
  const handleEditClick = useCallback((page) => {
    setSelectedPage(page);
    
    // Set default values
    setEditedMetaTitle(`${page.title} - {{season}} {{year}} | {{storeName}}`);
    setEditedMetaDescription(`Welcome to our ${page.title}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}Browse our latest collections.{{endif}}`);
    setIsOverridden(true);
    
    setModalActive(true);
  }, []);
  
  // Handle save in edit modal
  const handleEditSave = useCallback(async () => {
    if (!selectedPage) return;
    
    setIsSaving(true);
    setError('');
    
    try {
      // Mock API call to save page meta fields
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update page in state (in a real app, we would save to the API)
      // Here we're just updating the excludedPages list since these are mock data
      setExcludedPages(prev => prev.map(page => 
        page.id === selectedPage.id
          ? {
              ...page,
              titleTemplate: editedMetaTitle,
              descriptionTemplate: editedMetaDescription,
            }
          : page
      ));
      
      setSuccess(`Custom meta tags for "${selectedPage.title}" saved successfully!`);
      
      // Dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // Close modal
      setModalActive(false);
    } catch (error) {
      console.error('Error saving meta fields:', error);
      setError('Failed to save meta fields. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedPage, editedMetaTitle, editedMetaDescription]);
  
  // Remove page from exclusions
  const handleRemoveExclusion = useCallback(async (pageId) => {
    setIsLoading(true);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove from excluded pages
      setExcludedPages(prev => prev.filter(p => p.id !== pageId));
      
      setSuccess('Page removed from exclusions and reset to global template.');
      
      // Dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error removing exclusion:', error);
      setError('Failed to remove page from exclusions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Open schedule modal
  const handleScheduleClick = useCallback(() => {
    if (!template) return;
    
    setScheduledTemplate({
      title: template.title,
      description: template.description
    });
    setScheduledStartDate(new Date());
    setScheduledEndDate(null);
    setScheduleModalActive(true);
  }, [template]);
  
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
  
  // Load data on mount
  useEffect(() => {
    fetchTemplate();
    fetchStoreData();
  }, [fetchTemplate, fetchStoreData]);
  
  // Handle rendering based on loading state
  if (isLoading && !template) {
    return (
      <Page>
        <TitleBar title="Home Page Meta Tags" />
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="4" alignment="center">
                <Spinner size="large" />
                <Box paddingBlockStart="4">
                  <Text as="p" alignment="center">Loading template...</Text>
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
      title="Home Page Settings"
      primaryAction={{
        content: 'Save',
        onAction: handleSave,
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
      <TitleBar title="Home Page Settings" />
      
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
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Global Home Page Meta Title Template
                </Text>
                
                <Text variant="bodyMd" color="subdued">
                  This template will be used to generate the meta title for your store's home page.
                  Use variables like <code>{{'{{'}}storeName{{'}}'}}</code> and <code>{{'{{'}}season{{'}}'}}</code> that will be automatically replaced.
                </Text>
                
                <VariablePreview
                  initialTemplate={template?.title || ''}
                  onUpdate={(data) => handleTemplateUpdate({ ...data, isTitle: true })}
                  sampleData={storeData}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">
                  Global Home Page Meta Description Template
                </Text>
                
                <Text variant="bodyMd" color="subdued">
                  This template will be used to generate the meta description for your store's home page.
                  You can use variables and conditional logic like <code>{{'{{'}}if hasDiscount{{'}}'}}</code> for dynamic content.
                </Text>
                
                <VariablePreview
                  initialTemplate={template?.description || ''}
                  onUpdate={(data) => handleTemplateUpdate({ ...data, isTitle: false })}
                  sampleData={storeData}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
        
        {/* Table of Excluded Pages */}
        <Card>
          <BlockStack gap="400">
            <Box paddingBlockStart="400" paddingInlineStart="400" paddingInlineEnd="400">
              <Text variant="headingMd">
                Excluded Pages
              </Text>
              <Text variant="bodyMd" color="subdued">
                These special home page layouts have custom meta tags and don't use the global template.
                You can add alternative home page layouts for different purposes.
              </Text>
            </Box>
            
            <IndexTable
              resourceName={{
                singular: 'excluded page',
                plural: 'excluded pages',
              }}
              itemCount={filteredExcludedPages.length}
              headings={[
                {title: 'Page'},
                {title: 'Type'},
                {title: 'Excluded Since'},
                {title: 'Actions'},
              ]}
              selectable={false}
              lastColumnSticky
              loading={isLoading}
              filterControl={
                <Filters
                  queryValue={queryValue}
                  queryPlaceholder="Search pages"
                  onQueryChange={handleQueryValueChange}
                  onQueryClear={() => setQueryValue('')}
                />
              }
              emptyState={
                <EmptySearchResult
                  title="No excluded pages found"
                  description="All pages are using the global template. Add special home page layouts as needed."
                  withIllustration
                />
              }
            >
              {filteredExcludedPages.map((page, index) => (
                <IndexTable.Row id={page.id} key={page.id} position={index}>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                      {page.title}
                    </Text>
                    <div>
                      <Text variant="bodySm" as="span" color="subdued">
                        {page.handle}
                      </Text>
                    </div>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <Badge status="info">{page.type}</Badge>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">
                      {page.excludedAt.toLocaleDateString()}
                    </Text>
                  </IndexTable.Cell>
                  
                  <IndexTable.Cell>
                    <InlineStack gap="200">
                      <Button
                        size="slim"
                        onClick={() => handleEditClick(page)}
                        icon={EditIcon}
                      >
                        Edit
                      </Button>
                      
                      <Button
                        size="slim"
                        destructive
                        onClick={() => handleRemoveExclusion(page.id)}
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
                Schedule updates to your home page meta tags to automatically go live on a specific date.
                Perfect for seasonal promotions and sales events.
              </Text>
            </Box>
            
            <Box padding="400">
              <Banner status="info">
                <BlockStack gap="200">
                  <Text variant="bodyMd">
                    No scheduled changes for home page.
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
                <code>{{'{{'}}storeName:uppercase{{'}}'}}</code> - Convert to uppercase<br />
                <code>{{'{{'}}storeName:lowercase{{'}}'}}</code> - Convert to lowercase
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
        
        <InlineStack distribution="center">
          <Button primary onClick={handleSave} loading={isSaving}>
            Save Meta Tags
          </Button>
        </InlineStack>
      </BlockStack>
      
      {/* Edit Modal */}
      <Modal
        open={modalActive}
        onClose={() => setModalActive(false)}
        title={`Edit Meta Fields - ${selectedPage?.title || ''}`}
        primaryAction={{
          content: 'Save',
          onAction: handleEditSave,
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