# app.securesoft

Стартовая реализация core-слоя мобильного VPN-клиента (Android/iOS) по ТЗ из `MOBILE_APPS_SPEC.md`.

## Что реализовано

- `AuthModule` — login/refresh/logout, OAuth login, хранение списка аккаунтов/активного аккаунта, anti-race защита при refresh после 401 и cleanup hooks для модулей при logout.
- `DeviceModule` — генерация/хранение `device_id`, регистрация устройства в ЛК (`/devices/register`) и хранение `device_user` в изоляции по аккаунтам.
- `VpnSessionModule` — state machine подключения VPN, получение `/vpn/token`, offline-проверка, reconnect с exponential backoff, отдельный `session_id`, snapshot статуса и авто-планировщик refresh JWT до истечения TTL.
- `MetricsModule` — буферизация, дедупликация, батч-отправка в `/api/v1/metrics/client` с chunking и retry/backoff.
- `PushModule` — регистрация push token для активного аккаунта, очередь отложенной отправки token при сетевых ошибках, inbox-уведомления, локальный кеш inbox и отметка о прочтении.
- `UpdateModule` — проверка версии приложения, forced-update флага, сравнение semver для minimum supported version и определения доступного обновления.
- `HttpClient` — typed-контракты для основных API.

> Примечание: это кросс-платформенный TypeScript core, который затем подключается к React Native UI и нативным VPN bridge (Network Extension / VpnService).

## Структура

- `src/api` — HTTP слой.
- `src/modules` — бизнес-модули.
- `src/storage` — абстракция защищенного хранилища (сейчас in-memory адаптер для тестов).
- `src/types` — контракты API и VPN state machine.
- `tests` — unit-тесты.

## Запуск

```bash
npm install
npm run lint
npm test
npm run build
```

## Документация

- [MOBILE_APPS_SPEC.md](./MOBILE_APPS_SPEC.md) — полное ТЗ.
