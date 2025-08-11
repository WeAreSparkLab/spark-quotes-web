// services/notificationService.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { quotes } from "../data/data";

interface NotificationHandlerResult {
  shouldShowAlert?: boolean;
  shouldPlaySound?: boolean;
  shouldSetBadge?: boolean;
}

interface NotificationTriggerInput {
  hour: number;
  minute: number;
  repeats: boolean;
}

// This handler tells the app how to behave when a notification is received while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as any), // Type assertion to bypass persistent type error
});

export async function schedulePushNotification() {
  // 1. Get Permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    alert("Failed to get push token for push notification!");
    return;
  }

  // 2. Set Up Android Channel (if on Android)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // 3. Prepare Notification Content
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const content = {
    title: "Your Daily Motivation ✨",
    body: `"${quote.text}" - ${quote.author}`,
  };

  // 4. Prepare Notification Trigger for 9 AM daily
  const trigger: NotificationTriggerInput = {
    hour: 9,
    minute: 0,
    repeats: true,
  };

  // 5. Cancel old notifications and schedule the new one
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: content,
    trigger: trigger as any,
  });

  console.log("Daily notification scheduled for 9:00 AM!");
}
