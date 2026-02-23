# Соответствие репозитория `MOBILE_APPS_SPEC.md`

Оценка выполнена для текущего scope репозитория (TypeScript core-модули, без React Native UI и native VPN-bridge).

## Итоговая оценка

- **Core-логика и API-контракты:** ~**90%**
- **Полное ТЗ целиком (включая UI + iOS/Android native):** ~**60%**

## Покрыто в репозитории

- `AuthModule`: login/refresh/logout, OAuth-вход, мультиаккаунт, защита от гонок refresh.
- `DeviceModule`: генерация `device_id`, регистрация устройства, привязка `device_user` к аккаунту.
- `VpnSessionModule`: `/vpn/token`, state machine, авто-refresh JWT, reconnect с exponential backoff, offline-проверка, error-классификация.
- `MetricsModule`: batched отправка в `/api/v1/metrics/client`, retry/backoff, дедупликация `event_id`, периодический flush.
- `PushModule`: регистрация APNS/FCM токена, pending/retry паттерн, inbox и mark-as-read.
- `UpdateModule`: проверка версий и forced update.
- `AppCoreModule`: оркестрация login/connect/disconnect/logout и межмодульных cleanup-хуков.

## Что доработано в этой задаче

- Передача optional TLS-параметров (`tls.alpn`) в VPN-коннектор, чтобы соответствовать optional TLS полям в `/vpn/token`.
- Запрет переключения аккаунта при активной VPN-сессии, чтобы обеспечить требование «один активный аккаунт в рамках одной VPN-сессии».

## Вне scope текущего репозитория

- Полноценные React Native UI-экраны (Auth/Main/Status/Notifications/Accounts).
- iOS Network Extension + Android VpnService (native tunnel implementation).
- Реальные платформенные сборщики CPU/RAM/Disk/energy (только transport/очередь метрик на уровне core).
- TLS pinning и platform-secure storage реализации ОС (в репозитории — абстракции и in-memory реализация для тестов).
