// utils/openLink.ts
import * as WebBrowser from 'expo-web-browser';
import { Platform, Linking } from 'react-native';

export async function openLink(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url);
  }
}
