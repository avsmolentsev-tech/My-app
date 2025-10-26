import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { format, addDays, setHours, setMinutes } from 'date-fns';

// Настройка поведения уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8B4D4',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Не удалось получить разрешения на уведомления!');
      return;
    }
  } else {
    console.log('Push notifications work only on physical devices');
  }

  return token;
}

// Запланировать уведомления об овуляции
export async function scheduleOvulationReminders(ovulationDate: Date) {
  // Отменяем все предыдущие уведомления об овуляции
  const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existingNotifications) {
    if (notification.content.data?.type === 'ovulation') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  const reminders = [
    { days: -3, message: 'Через 3 дня возможна овуляция. Проверь календарь и самочувствие.' },
    { days: -2, message: 'Через 2 дня возможна овуляция. Проверь календарь и самочувствие.' },
    { days: -1, message: 'Завтра возможна овуляция. Проверь календарь и самочувствие.' },
    { days: 0, message: 'Сегодня возможна овуляция (ориентировочно).' },
  ];

  for (const reminder of reminders) {
    const notificationDate = addDays(ovulationDate, reminder.days);
    const triggerDate = setMinutes(setHours(notificationDate, 9), 0); // 9:00

    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Напоминание об овуляции 🌸',
          body: reminder.message,
          data: { type: 'ovulation', screen: 'calendar' },
          sound: true,
        },
        trigger: triggerDate,
      });
    }
  }
}

// Запланировать ежедневные советы
export async function scheduleDailyTips() {
  // Отменяем предыдущие советы
  const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existingNotifications) {
    if (notification.content.data?.type === 'daily_tip') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  // Утренний совет (9:00)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Доброе утро! ☀️',
      body: 'Время для утреннего совета о здоровье',
      data: { type: 'daily_tip', time: 'morning' },
      sound: true,
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });

  // Вечерний совет и дневник (21:00)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Как прошёл твой день? 🌙',
      body: 'Давай запишем, что было хорошего и за что можешь себя похвалить',
      data: { type: 'evening_journal', screen: 'journal' },
      sound: true,
    },
    trigger: {
      hour: 21,
      minute: 0,
      repeats: true,
    },
  });
}

// Запланировать напоминания о воде
export async function scheduleWaterReminders() {
  // Отменяем предыдущие напоминания о воде
  const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of existingNotifications) {
    if (notification.content.data?.type === 'water') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  // Напоминания каждые 2 часа с 10:00 до 20:00
  const hours = [10, 12, 14, 16, 18, 20];
  
  for (const hour of hours) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Время пить воду! 💧',
        body: 'Не забудь выпить стакан воды',
        data: { type: 'water', screen: 'home' },
        sound: true,
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      },
    });
  }
}

// Отменить все уведомления
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Получить все запланированные уведомления
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}
