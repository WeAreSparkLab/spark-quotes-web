import { Platform, Alert, Share as RNShare } from "react-native";
import * as Clipboard from "expo-clipboard";

const APP_URL = "https://quotes.wearesparklab.com/";

export async function shareApp() {
  try {
    // Native share sheet (Android/iOS). On web, RNShare uses navigator.share if available.
    const res = await RNShare.share({
      message: `Fresh quote anytime you open it → ${APP_URL}`,
      url: APP_URL, // iOS prefers url field
      title: "Spark Quotes",
    });
    // No need to handle result; user either shared or canceled.
  } catch {
    // Fallback: copy to clipboard + toast
    try {
      await Clipboard.setStringAsync(APP_URL);
      Alert.alert("Link copied", "App link copied to clipboard.");
    } catch {
      Alert.alert("Share failed", "Couldn’t open share sheet.");
    }
  }
}
