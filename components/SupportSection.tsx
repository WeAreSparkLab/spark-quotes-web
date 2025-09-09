import React from 'react';
import { View, Text, TouchableOpacity, Platform, Linking } from 'react-native';
import { openLink } from '../utils/openLink';
import { LINKS, openCoffee, openTipChooser, getStripeCTA } from "../utils/support";


export default function SupportSection({
  showHeader = true,
}: { showHeader?: boolean }) {
  const hasStripe = !!(LINKS.TIP_ANY || LINKS.TIP_5 || LINKS.TIP_10);
  const hasCoffee = !!LINKS.BMC_URL;

  if (!hasStripe && !hasCoffee) return null;

  return (
    <View style={{ gap: 12, marginTop: 24 }}>
      {showHeader && (
        <Text style={{ color: '#E0E0E0', fontSize: 18, fontWeight: '700' }}>
          Support Spark
        </Text>
      )}

      <Text style={{ color: '#BFC4D6', lineHeight: 20 }}>
        We’re a tiny, family business in the UK. If Spark Quotes brightens your day,
        you can keep it going with a tip 💛
      </Text>

      {hasCoffee && (
        <TouchableOpacity
          onPress={openCoffee}
          style={{ backgroundColor: "#F7BE38", borderRadius: 10, padding: 12, alignItems: "center" }}
        >
          <Text style={{ color: "#1a1a1a", fontWeight: "800" }}>Buy us a coffee ☕</Text>
        </TouchableOpacity>
      )}

      {hasStripe && (
        <>
          <TouchableOpacity
            onPress={openTipChooser}
            style={{ backgroundColor: "#6672E7", borderRadius: 10, padding: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>{getStripeCTA()}</Text>
          </TouchableOpacity>

          {Platform.OS === "web" && (LINKS.TIP_5 || LINKS.TIP_10 || LINKS.TIP_ANY) ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {LINKS.TIP_5 && (
                <TouchableOpacity onPress={() => Linking.openURL(LINKS.TIP_5)} style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ color: "#E6E7F2", fontWeight: "700" }}>Tip £5</Text>
                </TouchableOpacity>
              )}
              {LINKS.TIP_10 && (
                <TouchableOpacity onPress={() => Linking.openURL(LINKS.TIP_10)} style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ color: "#E6E7F2", fontWeight: "700" }}>Tip £10</Text>
                </TouchableOpacity>
              )}
              {LINKS.TIP_ANY && (
                <TouchableOpacity onPress={() => Linking.openURL(LINKS.TIP_ANY)} style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ color: "#E6E7F2", fontWeight: "700" }}>Custom</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </>
      )}
    </View>
  )
}
