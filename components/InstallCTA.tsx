// components/InstallCTA.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function InstallCTA() {
  const { canInstall, install, isStandalone } = usePWAInstall();

  if (Platform.OS !== 'web') return null;

  // Show real install button if we have the saved prompt
  if (canInstall) {
    return (
      <TouchableOpacity
        onPress={install}
        style={{ backgroundColor: '#6672E7', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Install Spark Quotes</Text>
      </TouchableOpacity>
    );
  }

  // iOS has no beforeinstallprompt; give simple instructions instead (when not already installed)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isStandalone && isIOS) {
    return (
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: '#E0E0E0', textAlign: 'center' }}>
          On iPhone: tap <Text style={{ fontWeight: '700' }}>Share</Text> → <Text style={{ fontWeight: '700' }}>Add to Home Screen</Text>.
        </Text>
      </View>
    );
  }

  return null;
}
