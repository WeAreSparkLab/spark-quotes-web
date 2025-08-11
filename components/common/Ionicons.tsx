// components/common/Ionicons.tsx
import React from 'react';
// Import the actual Ionicons component from @expo/vector-icons
import { Ionicons as ExpoIonicons } from '@expo/vector-icons'; 
import { Text } from 'react-native'; 

interface IoniconsProps {
  name: string;
  color?: string;
  size?: number;
}

export const Ionicons = ({ name, color, size = 24 }: IoniconsProps) => {
  const mappedName: any = { 
    sparkles: 'sparkles',        
    list: 'list',         
    add: 'add',            
    settings: 'settings',
    'arrow-back': 'arrow-back',
    checkbox: 'checkbox',
    'square-outline': 'square-outline',
  }[name] || name; 

  return (
    <ExpoIonicons name={mappedName} size={size} color={color} />
  );
};
