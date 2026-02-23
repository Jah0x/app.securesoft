# Соответствие репозитория требованиям `MOBILE_APPS_SPEC.md`

Оценка сделана для текущего **TypeScript core-слоя** (без React Native UI и нативных iOS/Android VPN bridge).

## Итоговая оценка

- **Полностью реализовано в core:** 24/28 пунктов (**~86%**)
- **Частично реализовано:** 3/28 пунктов
- **Вне scope этого репозитория (требует mobile shell / native):** 1/28 пунктов

## Краткая матрица

### Полностью реализовано
- AuthModule: login/refresh/logout, OAuth, multi-account.
- Secure storage abstraction для секретов.
- DeviceModule: UUID `device_id`, регистрация устройства, account isolation.
- VpnSessionModule: `POST /vpn/token`, state machine, reconnect + backoff, JWT auto-refresh.
- MetricsModule: batch send на `/api/v1/metrics/client`, retry/backoff, deduplication.
- PushModule: APNS/FCM token registration abstraction, pending queue, inbox + read state.
- UpdateModule: min supported version + forced update + update available.
- AppCoreModule: orchestration сценариев login/connect/disconnect/switch/logout.

### Частично реализовано
- UI/UX экраны: реализованы только core-данные/сценарии, без React Native экранов.
- RED/resource metrics: инфраструктура событий и отправки есть, platform-level CPU/RAM/battery collectors не включены.
- CI/CD mobile pipeline (Android/iOS build + TestFlight/Play): в этом репозитории отсутствует.

### Вне scope текущего репозитория
- Нативный VPN bridge (iOS Network Extension / Android VpnService) как production-реализация туннеля.

## Что доведено в этом коммите

- Добавлена orchestration-функция `loginWithOAuthAndPrepare(...)` в `AppCoreModule`.
- Введена явная очистка очереди метрик при logout для безопасной изоляции данных аккаунта.
- В `MetricsModule` добавлен метод `clearQueue()` с переиспользованием в `flush()`.
- Расширены unit-тесты для OAuth flow и очистки очереди метрик при logout.
