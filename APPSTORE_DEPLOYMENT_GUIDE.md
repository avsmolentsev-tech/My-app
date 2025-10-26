# 📱 Инструкция по публикации CycleWise в App Store

## Что нужно для публикации:

### 1. Apple Developer Account
- Стоимость: $99/год
- Регистрация: https://developer.apple.com/programs/
- Время оформления: 1-2 дня

### 2. Expo Account
- Бесплатно
- Регистрация: https://expo.dev/signup

---

## Шаг 1: Подготовка проекта (✅ ГОТОВО)

Я уже подготовил ваш проект:
- ✅ Создан `eas.json` с конфигурацией сборки
- ✅ Обновлён `app.json` с правильными настройками iOS
- ✅ Bundle ID: `com.cyclewise.app`
- ✅ Добавлены разрешения для календаря, уведомлений, Health

---

## Шаг 2: Установка EAS CLI

На вашем компьютере (Mac) выполните:

```bash
npm install -g eas-cli
```

---

## Шаг 3: Вход в Expo

```bash
cd /path/to/your/project/frontend
eas login
```

Введите логин и пароль от вашего Expo аккаунта.

---

## Шаг 4: Настройка проекта

```bash
eas build:configure
```

Эта команда создаст/обновит конфигурацию. Выберите:
- Platform: `iOS`
- Build type: `production`

---

## Шаг 5: Создание iOS билда

```bash
eas build --platform ios --profile production
```

Вам будет предложено:

1. **Войти в Apple Developer Account**
   - Введите Apple ID
   - Введите пароль
   
2. **Создать Bundle Identifier**
   - EAS автоматически создаст `com.cyclewise.app`
   
3. **Создать Distribution Certificate**
   - EAS создаст сертификаты автоматически
   - Выберите: `Yes, let Expo handle the certificates`

4. **Дождитесь сборки**
   - Процесс займёт 10-20 минут
   - Вы можете следить за прогрессом на https://expo.dev

---

## Шаг 6: Загрузка в App Store Connect

### Вариант A: Автоматическая загрузка (рекомендуется)

```bash
eas submit --platform ios
```

EAS автоматически загрузит билд в App Store Connect.

### Вариант Б: Ручная загрузка

1. Скачайте `.ipa` файл из Expo Dashboard
2. Откройте Xcode → Window → Organizer
3. Загрузите `.ipa` файл

---

## Шаг 7: Настройка в App Store Connect

1. Откройте https://appstoreconnect.apple.com
2. Перейдите в **My Apps** → **+** → **New App**
3. Заполните информацию:
   - **Name**: CycleWise
   - **Primary Language**: Russian
   - **Bundle ID**: com.cyclewise.app
   - **SKU**: cyclewise-app
   - **User Access**: Full Access

4. **App Information**:
   - Категория: Health & Fitness
   - Подкатегория: Women's Health
   
5. **Pricing and Availability**:
   - Price: Free
   - Availability: All countries

6. **App Privacy**:
   - Укажите какие данные собираете (цикл, здоровье, календарь)
   - Privacy Policy URL (обязательно)

7. **Screenshots**:
   - iPhone 6.7": 5-10 скриншотов (1290 x 2796 px)
   - iPhone 6.5": 5-10 скриншотов (1242 x 2688 px)
   
8. **App Description** (на русском):

```
CycleWise — ваш персональный трекер менструального цикла и овуляции.

ОСНОВНЫЕ ФУНКЦИИ:
• Трекинг цикла и прогноз овуляции
• AI-советы о здоровье 2 раза в день
• Трекер воды с напоминаниями
• Отслеживание привычек
• Дневник благодарности
• Красивый календарь цикла
• Синхронизация с Google Calendar и Sheets

ПРЕИМУЩЕСТВА:
✓ Минималистичный дизайн
✓ Персонализированные советы
✓ Удобные свайпы
✓ Приватность данных

ВАЖНО:
Приложение носит информационный характер и не является медицинским изделием или методом контрацепции.
```

9. **Keywords** (на русском):
   ```
   цикл, овуляция, месячные, здоровье, женщины, трекер, календарь, привычки
   ```

10. **Support URL**: Ваш сайт или email
11. **Marketing URL**: (опционально)

---

## Шаг 8: Отправка на ревью

1. Выберите билд который загрузили
2. Заполните **What's New in This Version**:
   ```
   Первый релиз CycleWise! 
   - Трекинг цикла и овуляции
   - AI-советы о здоровье
   - Трекер воды и привычек
   - Дневник благодарности
   ```

3. Нажмите **Submit for Review**

---

## Шаг 9: Ожидание ревью

- **Время ревью**: 24-48 часов
- **Статус**: Можно отслеживать в App Store Connect
- **Rejection**: Если приложение отклонят, исправьте замечания и отправьте снова

---

## 🎯 Быстрая команда (всё в одном)

На вашем Mac:

```bash
# 1. Установить EAS CLI
npm install -g eas-cli

# 2. Перейти в папку проекта
cd /path/to/cyclewise/frontend

# 3. Войти в Expo
eas login

# 4. Создать билд
eas build --platform ios --profile production

# 5. Загрузить в App Store
eas submit --platform ios
```

---

## 📋 Checklist перед публикацией

- [ ] Apple Developer Account активирован ($99/год)
- [ ] Expo Account создан
- [ ] Privacy Policy создан (обязательно)
- [ ] Support Email настроен
- [ ] Скриншоты приложения готовы (5-10 штук)
- [ ] Icon 1024x1024 готов
- [ ] Описание на русском языке
- [ ] Ключевые слова выбраны

---

## 🚀 Альтернатива: TestFlight (для тестирования)

Перед публикацией в App Store, можно протестировать через TestFlight:

```bash
# Создать preview билд
eas build --platform ios --profile preview

# Загрузить в TestFlight
eas submit --platform ios --profile preview
```

Затем:
1. Откройте App Store Connect
2. Перейдите в TestFlight
3. Добавьте тестеров (до 10,000 человек)
4. Они получат приглашение и смогут скачать через TestFlight

---

## ❓ Частые вопросы

**Q: Нужен ли Mac для публикации?**
A: Да, для работы с Apple Developer нужен Mac, но EAS Build может собрать приложение на облаке без Mac.

**Q: Сколько времени занимает публикация?**
A: Сборка: 10-20 мин, ревью Apple: 24-48 часов, итого: 1-3 дня.

**Q: Можно ли обновить приложение после публикации?**
A: Да, просто создайте новый билд с увеличенной версией и загрузите через `eas submit`.

**Q: Что делать если Apple отклонит?**
A: Прочитайте причину отклонения, исправьте замечания и отправьте снова.

---

## 📞 Поддержка

- Expo Documentation: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/

---

**Удачи с публикацией! 🎉**
