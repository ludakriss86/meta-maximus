import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  TextField,
  Button,
  Text,
  Badge,
  Box,
  Banner,
  Select,
  Tabs
} from '@shopify/polaris';

/**
 * VariablePreview Component
 * 
 * A component that allows users to preview meta tags with variables
 * 
 * @param {Object} props
 * @param {string} props.initialTemplate - Initial template to display
 * @param {Function} props.onUpdate - Callback when template is updated and previewed
 * @param {Object} props.sampleData - Sample data for preview
 */
export default function VariablePreview({ 
  initialTemplate = '', 
  onUpdate = () => {}, 
  sampleData = {} 
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [previewResult, setPreviewResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [customData, setCustomData] = useState({});
  const [dataSource, setDataSource] = useState('sample');
  
  // Combine sample data with custom data based on selected source
  const getPreviewData = useCallback(() => {
    return dataSource === 'custom' ? customData : sampleData;
  }, [dataSource, customData, sampleData]);
  
  // Preview the template with current data
  const handlePreview = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const previewData = getPreviewData();
      
      // Call the API to preview the template
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          data: previewData
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to preview template: ${errorText}`);
      }
      
      const data = await response.json();
      setPreviewResult(data.parsed);
      
      // Call onUpdate callback with the result
      onUpdate({
        template,
        parsed: data.parsed,
        data: previewData
      });
    } catch (error) {
      console.error('Preview error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [template, getPreviewData, onUpdate]);
  
  // Handle custom data changes
  const handleCustomDataChange = useCallback((key, value) => {
    setCustomData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  // Handle data source change
  const handleDataSourceChange = useCallback((value) => {
    setDataSource(value);
  }, []);
  
  // Tabs configuration
  const tabs = [
    {
      id: 'preview',
      content: 'Preview',
      accessibilityLabel: 'Preview tab',
      panelID: 'preview-panel',
    },
    {
      id: 'data',
      content: 'Data',
      accessibilityLabel: 'Data tab',
      panelID: 'data-panel',
    },
    {
      id: 'help',
      content: 'Help',
      accessibilityLabel: 'Help tab',
      panelID: 'help-panel',
    },
  ];
  
  // Generate form fields for custom data
  const renderCustomDataFields = () => {
    // Start with sample data keys as a base
    const allKeys = Object.keys(sampleData);
    
    // Add any custom keys not in sample data
    Object.keys(customData).forEach(key => {
      if (!allKeys.includes(key)) {
        allKeys.push(key);
      }
    });
    
    return (
      <BlockStack gap="200">
        {allKeys.map(key => (
          <TextField
            key={key}
            label={key}
            value={customData[key] || ''}
            onChange={(value) => handleCustomDataChange(key, value)}
            autoComplete="off"
          />
        ))}
        
        <TextField
          label="New Variable"
          placeholder="Enter variable name"
          value=""
          onChange={(value) => {
            if (value) handleCustomDataChange(value, '');
          }}
          helpText="Type a variable name and press Enter to add it"
          onBlur={(e) => {
            if (e.target.value) {
              handleCustomDataChange(e.target.value, '');
              e.target.value = '';
            }
          }}
          connectedRight={
            <Button onClick={() => {
              const input = document.querySelector('input[placeholder="Enter variable name"]');
              if (input && input.value) {
                handleCustomDataChange(input.value, '');
                input.value = '';
              }
            }}>
              Add
            </Button>
          }
        />
      </BlockStack>
    );
  };
  
  // Effect to preview on mount
  useEffect(() => {
    if (initialTemplate) {
      setTemplate(initialTemplate);
      handlePreview();
    }
  }, [initialTemplate]);
  
  return (
    <Card>
      <Tabs
        tabs={tabs}
        selected={selectedTab}
        onSelect={setSelectedTab}
        fitted
      >
        <Card.Section>
          {selectedTab === 0 && (
            <BlockStack gap="400">
              <TextField
                label="Template"
                value={template}
                onChange={setTemplate}
                multiline={3}
                autoComplete="off"
                helpText="Enter your template with variables in {{variable}} format"
              />
              
              <Box paddingBlockStart="200">
                <Text variant="bodySm" color="subdued">Common Variables:</Text>
                <InlineStack gap="200" wrap>
                  <Button size="slim" onClick={() => setTemplate(prev => prev + "{{year}}")}>YEAR</Button>
                  <Button size="slim" onClick={() => setTemplate(prev => prev + "{{month}}")}>MONTH</Button>
                  <Button size="slim" onClick={() => setTemplate(prev => prev + "{{season}}")}>SEASON</Button>
                  <Button size="slim" onClick={() => setTemplate(prev => prev + "{{date}}")}>DATE</Button>
                  <Button size="slim" onClick={() => setTemplate(prev => prev + "{{productTitle}}")}>PRODUCT</Button>
                  <Button size="slim" onClick={() => setTemplate(prev => prev + "{{collectionTitle}}")}>COLLECTION</Button>
                  <Button size="slim" onClick={() => setTemplate(prev => prev + "{{storeName}}")}>STORE</Button>
                </InlineStack>
                
                <Box paddingBlockStart="300">
                  <Text variant="bodySm" color="subdued">Conditional Logic:</Text>
                  <InlineStack gap="200" wrap>
                    <Button size="slim" onClick={() => setTemplate(prev => prev + "{{if hasDiscount}}...{{endif}}")}>IF DISCOUNT</Button>
                    <Button size="slim" onClick={() => setTemplate(prev => prev + "{{if hasDiscount}}...{{else}}...{{endif}}")}>IF/ELSE</Button>
                  </InlineStack>
                </Box>
                
                <Box paddingBlockStart="300">
                  <Text variant="bodySm" color="subdued">Format Modifiers:</Text>
                  <InlineStack gap="200" wrap>
                    <Button size="slim" onClick={() => setTemplate(prev => prev + ":uppercase")}>UPPERCASE</Button>
                    <Button size="slim" onClick={() => setTemplate(prev => prev + ":lowercase")}>LOWERCASE</Button>
                  </InlineStack>
                </Box>
              </Box>
              
              <Select
                label="Data Source"
                options={[
                  {label: 'Sample Data', value: 'sample'},
                  {label: 'Custom Data', value: 'custom'}
                ]}
                value={dataSource}
                onChange={handleDataSourceChange}
              />
              
              <Box paddingBlockStart="300">
                <Button
                  onClick={handlePreview}
                  primary
                  loading={isLoading}
                >
                  Preview
                </Button>
              </Box>
              
              {error && (
                <Banner status="critical">
                  {error}
                </Banner>
              )}
              
              {previewResult && (
                <Card sectioned>
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="start">
                      <Badge>Result</Badge>
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        {previewResult}
                      </Text>
                    </InlineStack>
                    
                    <Text as="p" variant="bodySm" color="subdued">
                      Length: {previewResult.length} characters
                      {previewResult.length > 60 && (
                        <Badge status="warning">Too long for meta title</Badge>
                      )}
                    </Text>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          )}
          
          {selectedTab === 1 && (
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">
                {dataSource === 'sample' ? 'Sample Data' : 'Custom Data'}
              </Text>
              
              {dataSource === 'sample' ? (
                <Card sectioned>
                  <BlockStack gap="200">
                    {Object.entries(sampleData).map(([key, value]) => (
                      <InlineStack key={key} gap="200" align="start">
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          {key}:
                        </Text>
                        <Text as="span" variant="bodyMd">
                          {value}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </Card>
              ) : (
                renderCustomDataFields()
              )}
            </BlockStack>
          )}
          
          {selectedTab === 2 && (
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">
                Variable Reference
              </Text>
              
              <BlockStack gap="200">
                <Text as="h4" variant="headingSm">
                  Basic Variables:
                </Text>
                <Text as="p" variant="bodyMd">
                  <code>{{'{{'}}year{{'}}'}}</code> - Current year (e.g., 2025)<br />
                  <code>{{'{{'}}month{{'}}'}}</code> - Current month name (e.g., May)<br />
                  <code>{{'{{'}}season{{'}}'}}</code> - Current season (Spring, Summer, Fall, Winter)
                </Text>
                
                <Text as="h4" variant="headingSm">
                  Conditional Logic:
                </Text>
                <Text as="p" variant="bodyMd">
                  <code>{{'{{'}}if hasDiscount{{'}}'}}</code> - Condition start<br />
                  <code>{{'{{'}}else{{'}}'}}</code> - Else statement<br />
                  <code>{{'{{'}}endif{{'}}'}}</code> - End condition<br />
                  <br />
                  Example: <code>{{'{{'}}if hasDiscount{{'}}'}}</code>On Sale!<code>{{'{{'}}else{{'}}'}}</code>Regular Price<code>{{'{{'}}endif{{'}}'}}</code>
                </Text>
                
                <Text as="h4" variant="headingSm">
                  Format Modifiers:
                </Text>
                <Text as="p" variant="bodyMd">
                  <code>{{'{{'}}variable:lowercase{{'}}'}}</code> - Convert to lowercase<br />
                  <code>{{'{{'}}variable:uppercase{{'}}'}}</code> - Convert to uppercase
                </Text>
                
                <Text as="h4" variant="headingSm">
                  Examples:
                </Text>
                <Text as="p" variant="bodyMd">
                  <code>Shop our {{'{{'}}collectionTitle{{'}}'}} - {{'{{'}}season{{'}}'}} {{'{{'}}year{{'}}'}}</code><br /><br />
                  <code>{{'{{'}}if hasDiscount{{'}}'}}Save up to {{'{{'}}maxDiscountPercentage{{'}}'}} on {{'{{'}}collectionTitle{{'}}'}}!{{'{{'}}else{{'}}'}}Shop our {{'{{'}}collectionTitle{{'}}'}} - New Items for {{'{{'}}season{{'}}'}} {{'{{'}}year{{'}}'}}{{'{{'}}endif{{'}}'}}</code>
                </Text>
              </BlockStack>
            </BlockStack>
          )}
        </Card.Section>
      </Tabs>
    </Card>
  );
}