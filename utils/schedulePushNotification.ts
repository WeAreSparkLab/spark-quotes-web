import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { quotes } from '../data/data';

// Helper function to get a random quote
const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  return quotes[randomIndex];
};

// Helper function to map day strings to numbers (Sun=1, Mon=2, ...)
const dayMapping: { [key: string]: number } = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

export const schedulePushNotification = async (
  frequency: string,
  days: string[],
  times: string[]
) => {
  if (Platform.OS === 'web') {
    console.log("Skipping notification scheduling on web.");
    return;
  }

  // Ensure we have notification permissions before scheduling.
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted. Skipping schedule.');
      return;
    }
  } catch (e) {
    console.error('Failed to get/request notification permissions:', e);
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Previous notifications cancelled.');

  const frequencyNum = parseInt(frequency, 10);

  for (const day of days) {
    const weekday = dayMapping[day];
    if (!weekday) continue;

    for (const time of times) {
      let hours: number[] = [];
      if (time === 'Morning') hours = [8, 9, 10];
      if (time === 'Afternoon') hours = [13, 14, 15, 16];
      if (time === 'Night') hours = [19, 20, 21];
      
      for (let i = 0; i < frequencyNum; i++) {
        const randomHour = hours[Math.floor(Math.random() * hours.length)];
        const randomMinute = Math.floor(Math.random() * 60);
        const quote = getRandomQuote();

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "✨ Spark of Inspiration",
              body: `"${quote.text}" - ${quote.author}`,
              data: { quoteId: quote.id },
            },
            trigger: {
              type: "weekly",
              weekday: weekday as number,
              hour: randomHour as number, 
              minute: randomMinute as number, 
            },
          });
        } catch (error) {
            console.error("Error scheduling notification:", error);
        }
      }
    }
  }
  console.log('New notifications scheduled successfully.');
};
