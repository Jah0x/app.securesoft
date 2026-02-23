# app.securesoft

Стартовая реализация core-слоя мобильного VPN-клиента (Android/iOS) по ТЗ из `MOBILE_APPS_SPEC.md`.

## Что реализовано

- `AuthModule` — login/refresh/logout, OAuth login, выбор активного аккаунта и anti-race защита при refresh после 401.
- `DeviceModule` — генерация/хранение `device_id`, регистрация устройства в ЛК (`/devices/register`) и хранение `device_user`.
- `VpnSessionModule` — state machine подключения VPN, получение `/vpn/token`, offline-проверка, reconnect с exponential backoff и проверка TTL JWT.
- `MetricsModule` — буферизация, дедупликация и batch-отправка метрик в `/api/v1/metrics/client` с retry/backoff.
- `PushModule` — регистрация push token, загрузка inbox-уведомлений и отметка о прочтении.
- `UpdateModule` — проверка версии приложения и forced-update флага.
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
