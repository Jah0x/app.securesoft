# app.securesoft

Стартовая реализация core-слоя мобильного VPN-клиента (Android/iOS) по ТЗ из `MOBILE_APPS_SPEC.md`.

## Что реализовано

- `AuthModule` — login/refresh/logout, OAuth login, хранение списка аккаунтов/активного аккаунта, anti-race защита при refresh после 401 и cleanup hooks для модулей при logout.
- `DeviceModule` — генерация/хранение `device_id`, регистрация устройства в ЛК (`/devices/register`) и хранение `device_user` в изоляции по аккаунтам.
- `VpnSessionModule` — state machine подключения VPN, получение `/vpn/token`, offline-проверка, reconnect с exponential backoff, отдельный `session_id`, snapshot статуса и авто-планировщик refresh JWT до истечения TTL.
- `MetricsModule` — буферизация, дедупликация, батч-отправка в `/api/v1/metrics/client` с chunking и retry/backoff, а также периодический flush во время активной VPN-сессии.
- `PushModule` — регистрация push token для активного аккаунта, очередь отложенной отправки token при сетевых ошибках, inbox-уведомления, локальный кеш inbox и отметка о прочтении.
- `UpdateModule` — проверка версии приложения, forced-update флага, сравнение semver для minimum supported version и определения доступного обновления, а также чтение mandatory update из `/vpn/token`.
- `SecurityModule` — TLS pinning-проверка хеша сертификата, детекция emulator/root/jailbreak и массовая очистка чувствительных ключей.
- `SupportModule` — отправка обращений в поддержку (email/tracker transport) и локальный журнал тикетов.
- `AppCoreModule` — orchestration сценарии верхнего уровня: login+device registration+push flush, connect/disconnect VPN с метриками, switch account и logout cleanup.
- `HttpClient` — typed-контракты для основных API.

> Примечание: это кросс-платформенный TypeScript core, который затем подключается к React Native UI и нативным VPN bridge (Network Extension / VpnService).

## Структура

- `src/api` — HTTP слой.
- `src/modules` — бизнес-модули.
- `src/storage` — абстракция защищенного хранилища (сейчас in-memory адаптер для тестов).
- `src/types` — контракты API и VPN state machine.
- `tests` — unit/integration/e2e-simulation тесты.
- `docs` — developer и пользовательская документация.

## Запуск

```bash
npm install
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
npm run check:semver
```

## CI/CD

- Базовый workflow `.github/workflows/ci.yml`: `lint`, `test`, `build`, `check:semver` на push/PR.
- Дополнительный workflow `.github/workflows/mobile-release.yml`: quality gate + mobile release dry-run с fastlane hooks для релизных тегов.

## Документация

- [MOBILE_APPS_SPEC.md](./MOBILE_APPS_SPEC.md) — полное ТЗ.
- [Developer Mobile README](./docs/DEVELOPER_MOBILE_README.md).
- [User Support Guide](./docs/USER_SUPPORT_GUIDE.md).
- [QA Smoke Checklist](./docs/QA_SMOKE.md).
