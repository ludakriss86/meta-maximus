import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Card,
  Stack,
  Button,
  Box,
  Text,
  InlineStack,
  Badge,
  Banner,
  BlockStack
} from '@shopify/polaris';
import VariableSelector from '../VariableSelector';
import VariablePreview from '../VariablePreview';

/**
 * Meta Field Editor Component
 * 
 * Provides an editor for meta fields with variable support and live preview
 * 
 * @param {Object} props
 * @param {string} props.metaTitle - Current meta title template
 * @param {string} props.metaDescription - Current meta description template
 * @param {Function} props.onMetaTitleChange - Called when meta title changes
 * @param {Function} props.onMetaDescriptionChange - Called when meta description changes
 * @param {Object} props.sampleData - Sample data for previewing variables
 * @param {boolean} props.isGlobal - Whether this is a global template
 * @param {boolean} props.isOverridden - Whether global template is being overridden
 * @param {Function} props.onOverrideChange - Called when override toggle changes
 */
function MetaFieldEditor({
  metaTitle = '',
  metaDescription = '',
  onMetaTitleChange,
  onMetaDescriptionChange,
  sampleData = {},
  isGlobal = false,
  isOverridden = false,
  onOverrideChange
}) {
  const [title, setTitle] = useState(metaTitle);
  const [description, setDescription] = useState(metaDescription);
  const [titlePreview, setTitlePreview] = useState('');
  const [descriptionPreview, setDescriptionPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Update local state when props change
  useEffect(() => {
    setTitle(metaTitle);
    setDescription(metaDescription);
  }, [metaTitle, metaDescription]);
  
  // Handle title change
  const handleTitleChange = useCallback((value) => {
    setTitle(value);
    if (onMetaTitleChange) {
      onMetaTitleChange(value);
    }
  }, [onMetaTitleChange]);
  
  // Handle description change
  const handleDescriptionChange = useCallback((value) => {
    setDescription(value);
    if (onMetaDescriptionChange) {
      onMetaDescriptionChange(value);
    }
  }, [onMetaDescriptionChange]);
  
  // Insert variable into title
  const insertVariableIntoTitle = useCallback((variable) => {
    const newTitle = title + variable;
    handleTitleChange(newTitle);
  }, [title, handleTitleChange]);
  
  // Insert variable into description
  const insertVariableIntoDescription = useCallback((variable) => {
    const newDescription = description + variable;
    handleDescriptionChange(newDescription);
  }, [description, handleDescriptionChange]);
  
  // Preview meta fields
  const handlePreview = useCallback(async () => {
    try {
      // Call the API preview endpoint for both title and description
      const previewAPI = async (template) => {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template,
            data: sampleData
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to preview template');
        }
        
        return await response.json();
      };
      
      const titleResponse = await previewAPI(title);
      const descriptionResponse = await previewAPI(description);
      
      setTitlePreview(titleResponse.parsed);
      setDescriptionPreview(descriptionResponse.parsed);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  }, [title, description, sampleData]);
  
  // Determine title length warning
  const getTitleLengthStatus = () => {
    const length = title.length;
    if (length > 70) return 'critical';
    if (length > 60) return 'warning';
    if (length < 30) return 'warning';
    return 'success';
  };
  
  // Determine description length warning
  const getDescriptionLengthStatus = () => {
    const length = description.length;
    if (length > 160) return 'critical';
    if (length > 150) return 'warning';
    if (length < 70) return 'warning';
    return 'success';
  };
  
  return (
    <BlockStack gap="400">
      {!isGlobal && (
        <Card>
          <InlineStack gap="200" align="center">
            <Text as="span" variant="bodyMd">
              Override global template:
            </Text>
            <Button
              onClick={() => onOverrideChange && onOverrideChange(!isOverridden)}
              monochrome
              outline={!isOverridden}
            >
              {isOverridden ? 'Yes (using custom)' : 'No (using global)'}
            </Button>
          </InlineStack>
        </Card>
      )}
      
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingMd">
            Meta Title
          </Text>
          
          <BlockStack gap="200">
            <TextField
              label=""
              value={title}
              onChange={handleTitleChange}
              autoComplete="off"
              disabled={!isGlobal && !isOverridden}
              placeholder="Enter meta title template..."
              multiline={3}
              helpText={
                <InlineStack gap="200" align="start">
                  <Badge status={getTitleLengthStatus()}>
                    {title.length} characters
                  </Badge>
                  {title.length > 70 && (
                    <Text as="span" variant="bodySm" color="critical">
                      Title too long! Recommended: 50-70 characters
                    </Text>
                  )}
                  {title.length < 30 && title.length > 0 && (
                    <Text as="span" variant="bodySm" color="warning">
                      Title too short! Recommended: 50-70 characters
                    </Text>
                  )}
                </InlineStack>
              }
            />
            
            <Box paddingBlockStart="200">
              <InlineStack gap="200" wrap>
                <Button size="slim" onClick={() => insertVariableIntoTitle("{{year}}")}>YEAR</Button>
                <Button size="slim" onClick={() => insertVariableIntoTitle("{{month}}")}>MONTH</Button>
                <Button size="slim" onClick={() => insertVariableIntoTitle("{{season}}")}>SEASON</Button>
                <Button size="slim" onClick={() => insertVariableIntoTitle("{{date}}")}>DATE</Button>
                {/* Dropdown for additional variables */}
                <VariableSelector
                  onSelect={insertVariableIntoTitle}
                  buttonText="More Variables..."
                />
              </InlineStack>
            </Box>
          </BlockStack>
          
          <Text as="h3" variant="headingMd">
            Meta Description
          </Text>
          
          <BlockStack gap="200">
            <TextField
              label=""
              value={description}
              onChange={handleDescriptionChange}
              autoComplete="off"
              disabled={!isGlobal && !isOverridden}
              placeholder="Enter meta description template..."
              multiline={4}
              helpText={
                <InlineStack gap="200" align="start">
                  <Badge status={getDescriptionLengthStatus()}>
                    {description.length} characters
                  </Badge>
                  {description.length > 160 && (
                    <Text as="span" variant="bodySm" color="critical">
                      Description too long! Recommended: 110-160 characters
                    </Text>
                  )}
                  {description.length < 70 && description.length > 0 && (
                    <Text as="span" variant="bodySm" color="warning">
                      Description too short! Recommended: 110-160 characters
                    </Text>
                  )}
                </InlineStack>
              }
            />
            
            <Box paddingBlockStart="200">
              <InlineStack gap="200" wrap>
                <Button size="slim" onClick={() => insertVariableIntoDescription("{{year}}")}>YEAR</Button>
                <Button size="slim" onClick={() => insertVariableIntoDescription("{{month}}")}>MONTH</Button>
                <Button size="slim" onClick={() => insertVariableIntoDescription("{{season}}")}>SEASON</Button>
                <Button size="slim" onClick={() => insertVariableIntoDescription("{{date}}")}>DATE</Button>
                <Button size="slim" onClick={() => insertVariableIntoDescription("{{productTitle}}")}>PRODUCT</Button>
                <Button size="slim" onClick={() => insertVariableIntoDescription("{{collectionTitle}}")}>COLLECTION</Button>
                {/* Dropdown for additional variables */}
                <VariableSelector
                  onSelect={insertVariableIntoDescription}
                  buttonText="More Variables..."
                />
              </InlineStack>
            </Box>
          </BlockStack>
          
          <Box paddingBlockStart="300">
            <Button
              onClick={handlePreview}
              primary
              disabled={!isGlobal && !isOverridden}
            >
              Preview
            </Button>
          </Box>
        </BlockStack>
      </Card>
      
      {showPreview && (
        <Card sectioned title="Search Result Preview">
          <BlockStack gap="300">
            <Text as="h3" fontWeight="bold" variant="headingXs" color="success">
              {titlePreview || "Your Site Title"}
            </Text>
            
            <Text as="p" variant="bodySm" color="subdued">
              https://your-store.myshopify.com/
            </Text>
            
            <Text as="p" variant="bodyMd">
              {descriptionPreview || "Your meta description will appear here. Make sure it's engaging and contains relevant keywords for better SEO."}
            </Text>
          </BlockStack>
        </Card>
      )}
      
      {/* For a full implementation, replace the static preview with VariablePreview component */}
      {false && (
        <VariablePreview
          initialTemplate={title}
          sampleData={sampleData}
          onUpdate={() => {}}
        />
      )}
    </BlockStack>
  );
}

export default MetaFieldEditor;