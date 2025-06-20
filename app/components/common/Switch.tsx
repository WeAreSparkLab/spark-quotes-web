// components/common/Switch.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native'; // Removed Text as it's not needed directly here

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  trackColor: {
    false: string;
    true: string;
  };
  thumbColor: string;
}

export const Switch = ({ value, onValueChange, trackColor, thumbColor }: SwitchProps) => (
  <TouchableOpacity
    style={[
      styles.switch,
      { backgroundColor: value ? trackColor.true : trackColor.false }
    ]}
    onPress={() => onValueChange(!value)} // Use onPress for TouchableOpacity
    activeOpacity={0.8} // Standard touch feedback
  >
    <View
      style={[
        styles.switchThumb,
        { backgroundColor: thumbColor, transform: [{ translateX: value ? 20 : 0 }] } // Adjusted translateX for smaller switch
      ]}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  switch: {
    width: 44, // Adjusted width
    height: 24, // Adjusted height
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'flex-start', // Align thumb to start when false
  },
  switchThumb: {
    width: 20, // Adjusted thumb size
    height: 20, // Adjusted thumb size
    borderRadius: 10,
    shadowColor: '#000', // Basic shadow for thumb
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2, // Android shadow
  },
});
