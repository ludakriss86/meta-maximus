import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Button,
  TextField,
  DatePicker,
  Modal,
  Banner,
  BlockStack,
  Box,
  Badge,
  InlineStack,
  EmptyState
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

/**
 * Scheduling page component for managing scheduled meta tag changes
 */
export default function Scheduling() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newScheduleModalOpen, setNewScheduleModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  
  // Date picker state
  const [{ month, year }, setDate] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 1 week later
  
  // Mock data for scheduled changes
  const [scheduledChanges, setScheduledChanges] = useState([
    {
      id: '1',
      resourceId: '1001',
      resourceType: 'product',
      resourceTitle: 'Summer T-Shirt',
      metaTitle: '{{season}} Sale - {{productTitle}} now {{maxDiscountPercentage}} off!',
      metaDescription: 'Limited time offer on our {{productTitle}}. Shop now before the {{season}} sale ends!',
      startDate: new Date(2025, 5, 1), // June 1, 2025
      endDate: new Date(2025, 7, 31), // August 31, 2025
      status: 'pending'
    },
    {
      id: '2',
      resourceId: '2001',
      resourceType: 'collection',
      resourceTitle: 'Summer Collection',
      metaTitle: '{{season}} {{year}} - {{collectionTitle}} with up to {{maxDiscountPercentage}} off',
      metaDescription: 'Shop our {{collectionTitle}} for {{season}} {{year}} with discounts up to {{maxDiscountPercentage}}',
      startDate: new Date(2025, 5, 1), // June 1, 2025
      endDate: new Date(2025, 7, 31), // August 31, 2025
      status: 'active'
    }
  ]);
  
  // Handle search
  const handleSearchChange = useCallback((value) => {
    setSearchValue(value);
  }, []);
  
  // Filter items based on search
  const getFilteredItems = useCallback(() => {
    if (!searchValue) {
      return scheduledChanges;
    }
    
    const lowerSearchValue = searchValue.toLowerCase();
    return scheduledChanges.filter(
      item => item.resourceTitle.toLowerCase().includes(lowerSearchValue) || 
              item.metaTitle.toLowerCase().includes(lowerSearchValue)
    );
  }, [scheduledChanges, searchValue]);
  
  // Handle resource item click
  const handleItemClick = useCallback((item) => {
    setCurrentItem(item);
    setSelectedStartDate(new Date(item.startDate));
    setSelectedEndDate(new Date(item.endDate));
    setModalOpen(true);
  }, []);
  
  // Handle item selection
  const handleSelectionChange = useCallback((selectedIds) => {
    setSelectedItems(selectedIds);
  }, []);
  
  // Handle month change in date picker
  const handleMonthChange = useCallback((month, year) => {
    setDate({ month, year });
  }, []);
  
  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Render resource list item
  const renderItem = (item) => {
    const { id, resourceTitle, resourceType, metaTitle, startDate, endDate, status } = item;
    
    // Determine badge status
    let badgeStatus = 'info';
    if (status === 'active') badgeStatus = 'success';
    if (status === 'completed') badgeStatus = 'attention';
    if (status === 'failed') badgeStatus = 'critical';
    
    return (
      <ResourceItem
        id={id}
        accessibilityLabel={`View details for ${resourceTitle}`}
        name={resourceTitle}
        onClick={() => handleItemClick(item)}
      >
        <BlockStack gap="200">
          <InlineStack align="space-between">
            <Text variant="bodyMd" fontWeight="bold">
              {resourceTitle}
            </Text>
            <Badge status={badgeStatus}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
          </InlineStack>
          
          <InlineStack gap="200">
            <Badge>{resourceType === 'product' ? 'Product' : 'Collection'}</Badge>
            <Text variant="bodySm" as="span">
              {metaTitle}
            </Text>
          </InlineStack>
          
          <InlineStack gap="200">
            <Text variant="bodySm" as="span">
              {formatDate(startDate)} - {formatDate(endDate)}
            </Text>
          </InlineStack>
        </BlockStack>
      </ResourceItem>
    );
  };
  
  return (
    <Page
      title="Scheduled Meta Tags"
      primaryAction={{
        content: 'Create Schedule',
        onAction: () => setNewScheduleModalOpen(true),
      }}
    >
      <TitleBar title="Scheduled Meta Tags" />
      
      <BlockStack gap="500">
        <Card>
          <ResourceList
            resourceName={{
              singular: 'scheduled change',
              plural: 'scheduled changes',
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
                placeholder="Search scheduled changes"
                clearButton
                onClearButtonClick={() => setSearchValue('')}
              />
            }
            emptyState={
              <EmptyState
                heading="No scheduled changes"
                action={{ content: 'Create schedule', onAction: () => setNewScheduleModalOpen(true) }}
                image=""
              >
                <p>Create scheduled meta tag changes for your products and collections.</p>
              </EmptyState>
            }
          />
        </Card>
        
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              About Scheduled Meta Tags
            </Text>
            
            <Text as="p" variant="bodyMd">
              Scheduled meta tags allow you to:
            </Text>
            
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                • Set start and end dates for meta tag changes
              </Text>
              <Text as="p" variant="bodyMd">
                • Automatically update meta tags for seasonal promotions
              </Text>
              <Text as="p" variant="bodyMd">
                • Create time-limited sale messaging
              </Text>
              <Text as="p" variant="bodyMd">
                • Revert back to original meta tags when the schedule ends
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
      
      {/* View/Edit Schedule Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Edit Scheduled Change - ${currentItem?.resourceTitle || ''}`}
        primaryAction={{
          content: 'Save',
          onAction: () => setModalOpen(false),
        }}
        secondaryActions={[
          {
            content: 'Delete',
            destructive: true,
            onAction: () => {
              // Delete logic would go here
              setModalOpen(false);
            },
          },
          {
            content: 'Cancel',
            onAction: () => setModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text variant="bodyMd">
              Resource: <strong>{currentItem?.resourceTitle}</strong> ({currentItem?.resourceType})
            </Text>
            
            <TextField
              label="Meta Title Template"
              value={currentItem?.metaTitle || ''}
              readOnly
              multiline={2}
            />
            
            <TextField
              label="Meta Description Template"
              value={currentItem?.metaDescription || ''}
              readOnly
              multiline={3}
            />
            
            <Text variant="bodyMd">Schedule Period:</Text>
            <Card sectioned>
              <BlockStack gap="400">
                <DatePicker
                  month={month}
                  year={year}
                  onChange={({ start, end }) => {
                    setSelectedStartDate(start);
                    setSelectedEndDate(end);
                  }}
                  onMonthChange={handleMonthChange}
                  selected={{
                    start: selectedStartDate,
                    end: selectedEndDate,
                  }}
                  allowRange
                />
                
                <InlineStack gap="200">
                  <Text variant="bodyMd">
                    Start: <strong>{formatDate(selectedStartDate)}</strong>
                  </Text>
                  <Text variant="bodyMd">
                    End: <strong>{formatDate(selectedEndDate)}</strong>
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>
            
            <Banner status="info">
              When the scheduled period ends, meta tags will automatically revert to their previous values.
            </Banner>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      {/* New Schedule Modal */}
      <Modal
        open={newScheduleModalOpen}
        onClose={() => setNewScheduleModalOpen(false)}
        title="Create New Scheduled Change"
        primaryAction={{
          content: 'Create',
          onAction: () => setNewScheduleModalOpen(false),
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setNewScheduleModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner status="info">
              This is a placeholder for the new schedule creation form.
              In a real implementation, this would include:
              <ul>
                <li>Product/collection selector</li>
                <li>Meta title/description template fields</li>
                <li>Date range selection</li>
              </ul>
            </Banner>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}