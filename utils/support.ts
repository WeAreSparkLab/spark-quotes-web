// utils/support.ts
import { Platform, Alert, ActionSheetIOS, Linking } from "react-native";

export const LINKS = {
  BMC_URL: process.env.EXPO_PUBLIC_BMC_URL || "",
  TIP_ANY: process.env.EXPO_PUBLIC_TIP_ANY || "",
  TIP_5: process.env.EXPO_PUBLIC_TIP_5 || "",
  TIP_10: process.env.EXPO_PUBLIC_TIP_10 || "",
};

function normalizeUrl(u: string) {
  const s = u.trim();
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

export function openCoffee() {
  const raw = LINKS.BMC_URL;
  if (!raw) {
    Alert.alert("Missing link", "Set EXPO_PUBLIC_BMC_URL in your env.");
    return;
  }
  const url = normalizeUrl(raw);
  if (Platform.OS === "web") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    Linking.openURL(url);
  }
}

export function getStripeCTA() {
  // Button label adapts to what you’ve set
  return LINKS.TIP_5 || LINKS.TIP_10 ? "Tip via Stripe" : "Tip any amount";
}

export function openTipChooser() {
  const { TIP_ANY, TIP_5, TIP_10 } = LINKS;

  // Web: just open the best available page
  if (Platform.OS === "web") {
    const url = TIP_ANY || TIP_5 || TIP_10;
    if (!url) {
      Alert.alert("Donation links missing", "Set your Stripe links in .env");
      return;
    }
    Linking.openURL(url);
    return;
  }

  // iOS: ActionSheet with only the options you actually have
  if (Platform.OS === "ios") {
    const options: string[] = [];
    if (TIP_5) options.push("£5");
    if (TIP_10) options.push("£10");
    if (TIP_ANY) options.push("Choose amount");
    options.push("Cancel");
    const cancelButtonIndex = options.length - 1;

    if (options.length === 1) {
      Alert.alert("Donation links missing", "Set your Stripe links in .env");
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      { title: "Support Spark", options, cancelButtonIndex },
      (i) => {
        const picked = options[i];
        if (picked === "£5" && TIP_5) Linking.openURL(TIP_5);
        if (picked === "£10" && TIP_10) Linking.openURL(TIP_10);
        if (picked === "Choose amount" && TIP_ANY) Linking.openURL(TIP_ANY);
      }
    );
    return;
  }

  // Android (& others): Alert with only available buttons
  const buttons: any[] = [];
  if (TIP_5) buttons.push({ text: "£5", onPress: () => Linking.openURL(TIP_5) });
  if (TIP_10) buttons.push({ text: "£10", onPress: () => Linking.openURL(TIP_10) });
  if (TIP_ANY) buttons.push({ text: "Choose amount", onPress: () => Linking.openURL(TIP_ANY) });
  buttons.push({ text: "Cancel", style: "cancel" });

  if (buttons.length === 1) {
    Alert.alert("Donation links missing", "Set your Stripe links in .env");
    return;
  }
  Alert.alert("Support Spark", "Choose a tip amount", buttons);
}
