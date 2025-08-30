import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { openLink } from '../utils/openLink';

export default function SupportSection({
  showHeader = true,
}: { showHeader?: boolean }) {
  return (
    <View style={{ gap: 12, marginTop: 24 }}>
      {showHeader && (
        <Text style={{ color: '#E0E0E0', fontSize: 18, fontWeight: '700' }}>
          Support Spark
        </Text>
      )}

      <Text style={{ color: '#BFC4D6', lineHeight: 20 }}>
        We’re a tiny, independent studio in the UK. If Spark Quotes brightens your day,
        you can keep it going with a tip or Spark+ 💛
      </Text>

      <TouchableOpacity
        onPress={() => openLink('https://buymeacoffee.com/WEARESPARKLAB')}
        style={{ backgroundColor: '#F7BE38', borderRadius: 10, padding: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#1a1a1a', fontWeight: '800' }}>Buy us a coffee ☕</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => openLink('https://donate.stripe.com/REPLACE_WITH_ONE_TIME')}
        style={{ backgroundColor: '#6672E7', borderRadius: 10, padding: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>Tip via Stripe</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => openLink('https://billing.stripe.com/REPLACE_WITH_MONTHLY')}
        style={{ backgroundColor: '#2ecc71', borderRadius: 10, padding: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>Get Spark+ (Ad-free)</Text>
      </TouchableOpacity>
    </View>
  );
}
