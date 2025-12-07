import { Platform } from 'react-native';

export function initOneSignalNative() {
  if (Platform.OS === 'web') return;

  // Dynamically require the native OneSignal package so bundlers (web) don't try to
  // resolve/import it during web builds. Using `eval('require')` prevents static
  // analysis from picking up the dependency.
  try {
    // eslint-disable-next-line no-eval
    const r: any = eval('require');
    const mod = r('react-native-onesignal');
    const OneSignal = mod && mod.default ? mod.default : mod;
    OneSignal.initialize('b04c3e41-0909-471e-8c99-b4ce6b83466a');
    OneSignal.Notifications.requestPermission(true);
  } catch (e) {
    // If the native package isn't installed (or cannot be required), just warn
    // and continue — this is expected when running the web build.
    // eslint-disable-next-line no-console
    console.warn('react-native-onesignal is not available:', e);
  }
}
