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
- Детальный процесс деплоя: `../DEPLOY_CLASSIC.md`.

## Секреты

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_CONTENT`
- `FASTLANE_SESSION`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `ANDROID_PACKAGE_NAME`

> Список выше синхронизирован с `.github/workflows/mobile-release.yml` и должен совпадать по именам 1-в-1.

## Known limitations этого репо

- Этот репозиторий покрывает TypeScript core и release orchestration.
- Нативные вопросы (signing/provisioning, entitlements/capabilities, store metadata и platform-specific build issues) решаются в mobile-native repo.
