# Developer README (Mobile Environments)

## Подготовка окружения

- Node.js 20+
- Xcode 15+ (iOS сборки, simulator, сертификаты)
- Android Studio (SDK 34+, emulator)
- Ruby + fastlane (релизные lane)

## Локальная проверка core

```bash
npm ci
npm run lint
npm test
npm run build
npm run check:semver
```

## iOS

- Создайте App ID + включите Push Notifications и Network Extensions.
- Добавьте APNS key (`.p8`) в секреты CI/CD и в fastlane match/credentials.
- Для тестов в симуляторе используйте debug-сертификаты и отдельный backend-стенд.

## Android

- Создайте Firebase project и подключите `google-services.json`.
- Включите FCM и заведите service-account ключ для CI.
- Для Internal testing используйте отдельный product flavor.

## CI/CD

- Основной workflow: `.github/workflows/ci.yml`.
- Мобильный dry-run релизов: `.github/workflows/mobile-release.yml`.
- Workflow умеет выполнять fastlane только при наличии `FASTLANE_*` секретов.

## Секреты

- `FASTLANE_SESSION`
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD`
- `PLAY_SERVICE_ACCOUNT_JSON`
- `APNS_KEY_ID`, `APNS_ISSUER_ID`, `APNS_PRIVATE_KEY`
- `FCM_SERVER_KEY`
