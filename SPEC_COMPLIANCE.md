# Соответствие репозитория требованиям `MOBILE_APPS_SPEC.md`

Оценка сделана для текущего **TypeScript core-слоя** (без React Native UI и нативных iOS/Android VPN bridge).

## Итоговая оценка

- **Полностью реализовано в core:** 25/28 пунктов (**~89%**)
- **Частично реализовано:** 2/28 пунктов
- **Вне scope этого репозитория (требует mobile shell / native):** 1/28 пунктов

## Краткая матрица

### Полностью реализовано
- AuthModule: login/refresh/logout, OAuth, multi-account.
- Secure storage abstraction для секретов.
- DeviceModule: UUID `device_id`, регистрация устройства, account isolation.
- VpnSessionModule: `POST /vpn/token`, state machine, reconnect + backoff, JWT auto-refresh.
- MetricsModule: batch send на `/api/v1/metrics/client`, retry/backoff, deduplication и периодический flush во время активной сессии.
- PushModule: APNS/FCM token registration abstraction, pending queue, inbox + read state.
- UpdateModule: min supported version + forced update + update available.
- AppCoreModule: orchestration сценариев login/connect/disconnect/switch/logout.

### Частично реализовано
- UI/UX экраны: реализованы только core-данные/сценарии, без React Native экранов.
- RED/resource metrics: инфраструктура событий и отправки есть, но platform-level CPU/RAM/battery collectors не включены.

### Вне scope текущего репозитория
- Нативный VPN bridge (iOS Network Extension / Android VpnService) как production-реализация туннеля.

## Что доведено в этом коммите

- В `MetricsModule` добавлена поддержка периодической отправки метрик (`startPeriodicFlush` / `stopPeriodicFlush`) с изолированным scheduler-интерфейсом.
- `AppCoreModule` теперь автоматически включает периодический flush после успешного VPN-connect и выключает его при disconnect/logout.
- Дополнены unit-тесты `MetricsModule` проверкой периодической отправки.
