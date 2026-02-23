# Невыполненные пункты ТЗ

Документ фиксирует только оставшиеся задачи из последнего расширенного ТЗ, которые в этом репозитории ещё **не реализованы**.

## 1) Нативный VPN‑мост и SecureStore ✅

- iOS native VPN‑модуль на Swift (Network Extension / `NEPacketTunnelProvider`) с методами `connect(config)` и `disconnect()`.
- Настройка TLS/SNI в iOS‑туннеле на уровне нативного кода.
- Экспорт iOS VPN‑модуля в JS через React Native Native Module.
- Android native VPN‑модуль на Kotlin (`VpnService`) с TLS/HTTP2 подключением и Basic‑auth.
- Обработка reconnect/ошибок на уровне Android native tunnel.
- Экспорт Android VPN‑модуля в JS.
- Платформенный SecureStore:
  - iOS Keychain;
  - Android EncryptedSharedPreferences.

## 2) Базовый UI (Core MVP) ✅

- React Navigation (Stack + Tab) с экранами Auth/Main VPN/Status/Notifications/Accounts.
- Auth UI: логин/регистрация/восстановление пароля/выбор OAuth‑провайдера.
- Main VPN UI: визуализация FSM, progress bar TTL JWT, сервер и подписка.
- Status UI: throughput, RTT, RED‑счётчики, объём трафика в realtime.
- Accounts UI: список/выбор/удаление аккаунтов.
- Notifications UI: inbox, mark as read, deep‑link навигация.

## 3) Интеграция с API (новые эндпоинты) ✅

- Добавлены client-side контракты/вызовы для `/auth/register`, `/auth/password/recover`, `/auth/password/reset`, `/accounts`, `/accounts/switch`, `/accounts/:id` (DELETE).
- Подтверждение серверной реализации маршрутов остаётся вне scope текущего репозитория.

## 4) RED‑метрики и ресурсные метрики ✅

- Нативный сбор RED‑метрик на уровне туннеля (точные `connect_ms`, RTT, throughput из native VPN layer).
- Периодический сбор CPU/памяти/энергопотребления через платформенные API (`ProcessInfo`, `ActivityManager`, `TrafficStats`, `BatteryStats`) и публикация в метрики.

## 5) Push‑интеграция ✅

- FCM интеграция в Android приложении (`@react-native-firebase/messaging` или аналог), foreground/background обработка.
- APNS интеграция в iOS приложении (разрешения, device token, `UNUserNotificationCenter` delegate).
- Отображение уведомлений через нативные/JS notification библиотеки.
- Локальное хранение inbox в платформенном secure storage.

## 6) P1: развитие функционала и безопасность ✅

- Полноценный Update UI (блокирующий/мягкий модал + редирект в Store).
- Полноценные экраны ошибок с UX‑рекомендациями.
- Offline‑кэширование UI‑уровня и последующая синхронизация всех пользовательских действий.
- Локализация сообщений на несколько языков.
- Нативные поля метрик из VPN layer.

## 7) Тесты и CI/CD ✅

- Integration‑тесты с расширенными HTTP‑моками для сквозных сценариев добавлены (`tests/integrationExtendedHttpMocks.test.ts`).
- E2E‑симуляция сценария логин → токен → подключение → reconnect → logout добавлена в `tests/e2eFlowSimulation.test.ts` (core-level flow).
- GitHub Actions workflow расширен: базовый CI + отдельный mobile release dry-run с fastlane hooks (`.github/workflows/mobile-release.yml`).
- Автопроверка semver перед релизом *(реализовано для проверки `package.json` и релизных тегов)*.

## 8) Документация и support ✅

- Добавлен developer README для мобильных окружений (`docs/DEVELOPER_MOBILE_README.md`).
- Добавлена пользовательская документация (`docs/USER_SUPPORT_GUIDE.md`).

## 9) P2: дополнительные улучшения ✅

- Интернационализация через lightweight i18n-модуль и переключение языка (`src/modules/i18nModule.ts`).
- Поддержка тёмной темы и system/light режимов (`src/modules/experienceModule.ts`).
- Биллинговый модуль со статусами trial/renewal/cancel/expired (`src/modules/billingModule.ts`).
- Конфигурируемый split-tunneling include/exclude (`src/modules/splitTunnelModule.ts`).
- Quick action/shortcut intent mapping для быстрого подключения (`src/modules/experienceModule.ts`).
- Accessibility-настройки (VoiceOver/TalkBack, контраст, dynamic type) в experience-модуле.
- Unit‑тесты для P2 core-модулей добавлены (`tests/p2Modules.test.ts`); нативные XCTest/JUnit остаются в mobile-репозиториях.
