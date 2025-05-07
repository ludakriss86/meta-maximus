import React, { useState } from 'react';
import {
  Popover,
  ActionList,
  Button,
  Stack,
  Text,
  Icon,
  Tooltip
} from '@shopify/polaris';
import { ChevronDownMinor, PlusMinor } from '@shopify/polaris-icons';

/**
 * Variable categories and their variables
 */
const VARIABLE_CATEGORIES = [
  {
    title: 'Basic',
    items: [
      { name: 'year', description: 'Current year (e.g., 2025)' },
      { name: 'month', description: 'Current month name (e.g., May)' },
      { name: 'season', description: 'Current season (Spring, Summer, Fall, Winter)' },
      { name: 'date', description: 'Formatted date (e.g., May 5, 2025)' }
    ]
  },
  {
    title: 'Product',
    items: [
      { name: 'productTitle', description: 'Product title' },
      { name: 'productType', description: 'Product type' },
      { name: 'productVendor', description: 'Product vendor' },
      { name: 'productPrice', description: 'Current product price' },
      { name: 'comparePrice', description: 'Compare-at price' }
    ]
  },
  {
    title: 'Collection',
    items: [
      { name: 'collectionTitle', description: 'Collection title' },
      { name: 'collectionDescription', description: 'Collection description excerpt' },
      { name: 'collectionCount', description: 'Number of products in collection' }
    ]
  },
  {
    title: 'Discount',
    items: [
      { name: 'maxDiscountPercentage', description: 'Highest discount percentage in collection' },
      { name: 'minDiscountPercentage', description: 'Lowest discount percentage in collection' },
      { name: 'discountRange', description: 'Range of discounts in collection (e.g., "20-50%")' },
      { name: 'hasDiscount', description: 'Boolean flag if any products have discounts' },
      { name: 'discountedCount', description: 'Number of discounted products in collection' }
    ]
  },
  {
    title: 'Conditional Logic',
    items: [
      { name: 'if hasDiscount', description: 'Content shown only if collection has discounts', 
        isTag: true, tag: '{{if hasDiscount}}...{{endif}}' },
      { name: 'if/else hasDiscount', description: 'Alternative content based on discounts', 
        isTag: true, tag: '{{if hasDiscount}}...{{else}}...{{endif}}' },
      { name: 'if maxDiscountPercentage > X', description: 'Content shown if max discount exceeds X%', 
        isTag: true, tag: '{{if maxDiscountPercentage > X}}...{{endif}}' }
    ]
  },
  {
    title: 'Format Modifiers',
    items: [
      { name: 'lowercase', description: 'Convert to lowercase', 
        isModifier: true, example: '{{variable:lowercase}}' },
      { name: 'uppercase', description: 'Convert to uppercase', 
        isModifier: true, example: '{{variable:uppercase}}' },
      { name: 'number', description: 'Format as number', 
        isModifier: true, example: '{{variable:number}}' }
    ]
  }
];

/**
 * Variable Selector Component
 * 
 * Allows users to select variables from a categorized dropdown
 * 
 * @param {Object} props
 * @param {Function} props.onSelect - Function called when a variable is selected
 * @param {string} props.buttonText - Optional custom button text
 */
function VariableSelector({ onSelect, buttonText = 'Insert Variable' }) {
  const [popoverActive, setPopoverActive] = useState(false);
  
  // Toggle popover
  const togglePopover = () => {
    setPopoverActive((active) => !active);
  };
  
  // Handle variable selection
  const handleVariableSelect = (variable) => {
    // If it's a regular variable
    if (!variable.isTag && !variable.isModifier) {
      onSelect(`{{${variable.name}}}`);
    }
    // If it's a tag (like conditional logic)
    else if (variable.isTag) {
      onSelect(variable.tag);
    }
    // If it's a modifier
    else if (variable.isModifier) {
      onSelect(variable.example);
    }
    
    // Close the popover
    setPopoverActive(false);
  };
  
  // Create a Section for each category
  const sections = VARIABLE_CATEGORIES.map((category) => {
    return {
      title: category.title,
      items: category.items.map((variable) => ({
        content: variable.name,
        helpText: variable.description,
        onAction: () => handleVariableSelect(variable)
      }))
    };
  });
  
  // Create the popover activator
  const activator = (
    <Button
      onClick={togglePopover}
      icon={PlusMinor}
      disclosure={ChevronDownMinor}
    >
      {buttonText}
    </Button>
  );

  return (
    <Popover
      active={popoverActive}
      activator={activator}
      onClose={togglePopover}
      sectioned
      preferredAlignment="left"
    >
      <Popover.Pane>
        <ActionList
          actionRole="menuitem"
          sections={sections}
        />
      </Popover.Pane>
    </Popover>
  );
}

export default VariableSelector;