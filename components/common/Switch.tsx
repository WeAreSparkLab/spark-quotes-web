import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  trackColor: {
    false: string;
    true: string;
  };
  thumbColor: string;
}

// FIX: Changed from "export const Switch" to "export default function Switch"
export default function Switch({ value, onValueChange, trackColor, thumbColor }: SwitchProps) {
  return (
    <TouchableOpacity
      style={[
        styles.switch,
        { backgroundColor: value ? trackColor.true : trackColor.false }
      ]}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.switchThumb,
          { backgroundColor: thumbColor, transform: [{ translateX: value ? 20 : 0 }] }
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    // Using shadow props is correct for native, but may warn on web.
    // This is a common issue with cross-platform styling.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
});
