import { Platform, Alert, Share as RNShare } from "react-native";
import * as Clipboard from "expo-clipboard";

const APP_URL = "https://quotes.wearesparklab.com/";

export async function shareApp() {
  try {
    await RNShare.share({
      message: `Fresh quote anytime you open it → ${APP_URL}`,
      url: APP_URL,
      title: "Spark Quotes",
    });
  } catch {
    try {
      if (Platform.OS === "web" && "clipboard" in navigator) {
        // @ts-ignore
        await navigator.clipboard.writeText(APP_URL);
      } else {
        await Clipboard.setStringAsync(APP_URL);
      }
      Alert.alert("Link copied", "App link copied to clipboard.");
    } catch {
      Alert.alert("Share failed", "Couldn’t open share sheet.");
    }
  }
}
