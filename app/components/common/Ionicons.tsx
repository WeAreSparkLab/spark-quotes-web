// components/common/Ionicons.tsx
import React from 'react';
// Import the actual Ionicons component from @expo/vector-icons
import { Ionicons as ExpoIonicons } from '@expo/vector-icons'; 
import { Text } from 'react-native'; // Keep Text for general styling if needed

interface IoniconsProps {
  name: string;
  color?: string;
  size?: number;
}

export const Ionicons = ({ name, color, size = 24 }: IoniconsProps) => {
  // Map your simplified names to actual Ionicons names.
  // Using common Ionicons v5/v6 names which are typically without the 'ios-' prefix
  // for the default filled/outline variants unless a specific style is needed.
  const mappedName: any = { // Use 'any' to allow string literals for names that aren't strict.
    sparkles: 'sparkles',        // Standard filled sparkles
    list: 'list',                // Standard list icon
    add: 'add',                  // Standard add icon
    settings: 'settings',        // Standard settings icon
    'arrow-back': 'arrow-back',  // Standard arrow-back
    checkbox: 'checkbox',        // Standard filled checkbox
    'square-outline': 'square-outline', // Standard outlined square
    // Add other mappings if your 'name' props don't directly match Ionicons names
  }[name] || name; // Fallback to original name if no specific mapping

  return (
    // Use the ExpoIonicons component directly
    <ExpoIonicons name={mappedName} size={size} color={color} />
  );
};
