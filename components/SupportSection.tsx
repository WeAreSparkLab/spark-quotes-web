// components/SupportSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { openLink } from '../utils/openLink';

export default function SupportSection() {
  return (
    <View style={{ gap: 12, marginTop: 24 }}>
      <Text style={{ color: '#E0E0E0', fontSize: 18, fontWeight: '700' }}>
        Support Spark
      </Text>

      <TouchableOpacity
        onPress={() => openLink('https://buymeacoffee.com/WEARESPARKLAB')} // replace
        style={{ backgroundColor: '#F7BE38', borderRadius: 10, padding: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Buy me a coffee ☕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => openLink('https://donate.stripe.com/your_checkout_link')} // replace
        style={{ backgroundColor: '#6672E7', borderRadius: 10, padding: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>Tip via Stripe</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => openLink('https://billing.stripe.com/your_monthly_link')} // replace
        style={{ backgroundColor: '#2ecc71', borderRadius: 10, padding: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>Get Spark+ (Ad-free)</Text>
      </TouchableOpacity>
    </View>
  );
}
