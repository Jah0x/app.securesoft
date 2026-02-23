# app.securesoft

Стартовая реализация core-слоя мобильного VPN-клиента (Android/iOS) по ТЗ из `MOBILE_APPS_SPEC.md`.

## Что реализовано

- `AuthModule` — login/refresh/logout и выбор активного аккаунта.
- `DeviceModule` — генерация и хранение `device_id`.
- `VpnSessionModule` — state machine подключения VPN, получение `/vpn/token`, reconnect и проверка TTL JWT.
- `MetricsModule` — буферизация, дедупликация и batch-отправка метрик в `/api/v1/metrics/client` с retry/backoff.
- `HttpClient` — typed-контракты для основных API.

> Примечание: это кросс-платформенный TypeScript core, который затем подключается к React Native UI и нативным VPN bridge (Network Extension / VpnService).

## Структура

- `src/api` — HTTP слой.
- `src/modules` — бизнес-модули MVP.
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
