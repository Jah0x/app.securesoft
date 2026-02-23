# Невыполненные и частично выполненные пункты ТЗ

Документ фиксирует задачи из последнего расширенного ТЗ, которые в этом репозитории сейчас **не реализованы** или реализованы **частично**.

## 1) Нативный VPN‑мост и SecureStore

### Не выполнено
- iOS native VPN‑модуль на Swift (Network Extension / `NEPacketTunnelProvider`) с методами `connect(config)` и `disconnect()`.
- Настройка TLS/SNI в iOS‑туннеле на уровне нативного кода.
- Экспорт iOS VPN‑модуля в JS через React Native Native Module.
- Android native VPN‑модуль на Kotlin (`VpnService`) с TLS/HTTP2 подключением и Basic‑auth.
- Обработка reconnect/ошибок на уровне Android native tunnel.
- Экспорт Android VPN‑модуля в JS.
- Платформенный SecureStore:
  - iOS Keychain;
  - Android EncryptedSharedPreferences.

### Частично выполнено
- Есть только TS‑абстракции и core‑логика безопасного хранения (без нативной привязки к Keychain/EncryptedSharedPreferences).

## 2) Базовый UI (Core MVP)

### Не выполнено
- React Navigation (Stack + Tab) с экранами Auth/Main VPN/Status/Notifications/Accounts.
- Auth UI: логин/регистрация/восстановление пароля/выбор OAuth‑провайдера.
- Main VPN UI: визуализация FSM, progress bar TTL JWT, сервер и подписка.
- Status UI: throughput, RTT, RED‑счётчики, объём трафика в realtime.
- Accounts UI: список/выбор/удаление аккаунтов.
- Notifications UI: inbox, mark as read, deep‑link навигация.

## 3) Интеграция с API (новые эндпоинты)

### Выполнено
- Поддержка `/push/inbox` и `markNotificationRead` в HTTP‑клиенте.
- Поддержка `/auth/oauth`, `/devices/register`, `/vpn/token`, `/api/v1/metrics/client` в HTTP‑клиенте/core‑модулях.

### Частично выполнено
- В текущем репозитории невозможно подтвердить серверную реализацию маршрутов (это вне scope данного кода).

## 4) RED‑метрики и ресурсные метрики

### Частично выполнено
- Есть очереди/батчинг/ретраи для отправки метрик через `MetricsModule`.

### Не выполнено
- Нативный сбор RED‑метрик на уровне туннеля (точные `connect_ms`, RTT, throughput из native VPN layer).
- Периодический сбор CPU/памяти/энергопотребления через платформенные API (`ProcessInfo`, `ActivityManager`, `TrafficStats`, `BatteryStats`) и публикация в метрики.

## 5) Push‑интеграция

### Частично выполнено
- Core‑уровень `PushModule` и API‑вызовы inbox/read/register.

### Не выполнено
- FCM интеграция в Android приложении (`@react-native-firebase/messaging` или аналог), foreground/background обработка.
- APNS интеграция в iOS приложении (разрешения, device token, `UNUserNotificationCenter` delegate).
- Отображение уведомлений через нативные/JS notification библиотеки.
- Локальное хранение inbox в платформенном secure storage.

## 6) P1: развитие функционала и безопасность

### Частично выполнено
- Базовая классификация ошибок и FSM‑состояния присутствуют в core‑модулях.
- `session_id` поддерживается в метриках с генерацией UUID при подключении.
- Логика forced update в core‑модуле есть.

### Не выполнено
- Расширенные категории метрик и дополнительные поля (например, reconnect gap, расширенные бизнес‑категории).
- Полноценный Update UI (блокирующий/мягкий модал + редирект в Store).
- Полноценные экраны ошибок с UX‑рекомендациями.
- Offline‑кэширование UI‑уровня и последующая синхронизация всех пользовательских действий.
- Локализация сообщений на несколько языков.

## 7) Тесты и CI/CD

### Частично выполнено
- Unit‑тесты для core TypeScript‑модулей присутствуют.

### Не выполнено
- Integration‑тесты с расширенными HTTP‑моками для сквозных сценариев по новому UI/native.
- E2E‑тесты (Detox/Appium) для сценария логин → токен → подключение → reconnect → logout.
- GitHub Actions workflow для lint/test/build Android/iOS, fastlane и публикации TestFlight/Play Internal.
- Автопроверка semver перед релизом.

## 8) Документация и support

### Частично выполнено
- Есть базовая документация по проекту и спецификациям.

### Не выполнено
- Полный developer README под мобильные окружения (эмуляторы/девайсы, сертификаты, FCM/APNS ключи).
- Пользовательская документация (разрешения, подписка, FAQ, recovery).

## 9) P2: дополнительные улучшения

### Не выполнено
- Интернационализация через i18next (или аналог) и переключение языка.
- Поддержка тёмной темы.
- In‑app purchase (`react-native-iap`), обработка trial/renewal/cancel.
- Split‑tunneling (при наличии серверной поддержки).
- Виджет/shortcut быстрого подключения.
- Accessibility (VoiceOver/TalkBack, контраст, dynamic type).
- Unit‑тесты нативных модулей (XCTest, JUnit/Instrumentation).
