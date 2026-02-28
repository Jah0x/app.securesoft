# Mobile E2E smoke runner (real devices)

Папка `e2e/mobile/` содержит smoke-раннер для device farm/host runner, где есть реальное сетевое подключение и доступ к устройству.

## Покрываемые сценарии

1. `connect/disconnect` — проверка базового VPN connect/disconnect через bridge.
2. `ttl/token refresh during active session` — проверка refresh JWT/TTL без разрыва ручными действиями.
3. `brief network drop + auto reconnect` — краткое падение сети и автоматическое восстановление.

## Точки интеграции с native bridge

- `src/native/vpnBridge.ts` — используется контракт `NativeVpnBridge` и bridge-адаптер для smoke-сценариев.
- `src/native/mobileVpnProviders.ts` — используется провайдер `AndroidVpnServiceProvider` c `handleTransportDrop()` и token refresh логикой.

## Локальный прогон (симуляция)

```bash
npm run test:e2e:mobile:smoke
```

По умолчанию используется `MOBILE_SMOKE_DRIVER=simulated`.

## Прогон на реальном раннере/device farm

### 1) Appium

```bash
export MOBILE_SMOKE_DRIVER=appium
export SMOKE_SESSION_CMD="node scripts/devicefarm/session-check.mjs"
export SMOKE_DROP_CMD="node scripts/devicefarm/network-drop.mjs"
export SMOKE_RESTORE_CMD="node scripts/devicefarm/network-restore.mjs"
npm run test:e2e:mobile:smoke
```

### 2) Detox

```bash
export MOBILE_SMOKE_DRIVER=detox
export SMOKE_SESSION_CMD="node scripts/devicefarm/session-check.mjs"
export SMOKE_DROP_CMD="node scripts/devicefarm/network-drop.mjs"
export SMOKE_RESTORE_CMD="node scripts/devicefarm/network-restore.mjs"
npm run test:e2e:mobile:smoke
```

> Smoke-раннер ожидает, что `SMOKE_*_CMD` реализованы на стороне конкретного раннера/device farm и могут управлять сетью устройства.

## CI-инструкция (network-enabled runner)

1. Использовать self-hosted runner или device farm job с доступом к интернету/VPN endpoint.
2. Перед тестом поднять Appium/Detox окружение и зарегистрировать устройство.
3. Передать секреты/переменные:
   - `MOBILE_SMOKE_DRIVER` (`appium` или `detox`)
   - `SMOKE_SESSION_CMD`
   - `SMOKE_DROP_CMD`
   - `SMOKE_RESTORE_CMD`
   - (опционально) `SMOKE_MAX_RECONNECT_MS`, `SMOKE_MAX_REFRESH_MS`, `SMOKE_MAX_RETRIES`
4. Выполнить `npm ci && npm run test:e2e:mobile:smoke`.

## Pass/Fail критерии

Smoke считается **PASS**, если одновременно:

- `reconnect time <= SMOKE_MAX_RECONNECT_MS` (по умолчанию 3500ms),
- `token refresh time <= SMOKE_MAX_REFRESH_MS` (по умолчанию 2500ms),
- `retries <= SMOKE_MAX_RETRIES` (по умолчанию 2),
- `manual actions = 0` (все сценарии полностью автоматизированы).

Иначе сценарий/джоба считается **FAIL**.
