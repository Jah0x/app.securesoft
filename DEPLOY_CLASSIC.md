# DEPLOY_CLASSIC

Документ описывает **classic-процесс mobile release** для этого репозитория: какие секреты обязательны, как запускать dry-run и test release, а также какие smoke-проверки обязательны перед/после выкладки.

## Обязательные секреты (точные имена)

Имена должны в точности совпадать с `.github/workflows/mobile-release.yml`:

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_CONTENT`
- `FASTLANE_SESSION`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `ANDROID_PACKAGE_NAME`

Если хотя бы один секрет не задан, job `secrets-preflight` завершится ошибкой.

## Порядок запуска: dry-run → test release

### 1) Dry-run (без публикации стора вручную)

1. Локально пройти quality gate:

   ```bash
   npm ci
   npm run lint
   npm test
   npm run build
   npm run check:semver
   npm run generate:changelog
   npm run test:integration
   npm run test:e2e
   ```

2. Убедиться, что в GitHub настроены все обязательные секреты из списка выше.
3. Выполнить `workflow_dispatch` для `.github/workflows/mobile-release.yml` на целевой ветке, чтобы проверить полный CI-проход и preflight секретов.

> Важно: текущий workflow не разделяет preflight и публикацию на отдельные ручные режимы. Поэтому «dry-run» в этом репо — это в первую очередь локальный quality gate + проверка готовности секрета/пайплайна.

### 2) Test release (через fastlane lanes)

1. Убедиться, что dry-run успешно пройден.
2. Создать релизный тег формата `v*.*.*` и запушить его:

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. Дождаться выполнения workflow `Mobile Release`:
   - `quality-gate`
   - `secrets-preflight`
   - `publish-mobile`
4. Проверить, что fastlane шаги успешно завершены:
   - `fastlane ios beta` (TestFlight)
   - `fastlane android internal` (Google Play Internal)

## Smoke-checklist: Push

Обязательный минимум перед sign-off:

1. Login тестового аккаунта.
2. Подтверждение push permission (Allow).
3. Проверка успешной регистрации push token.
4. Отправка push с `deep_link=app://inbox`.
5. Проверка, что одновременно:
   - уведомление попало в secure inbox,
   - открывается route `Notifications`.
6. Отправка/открытие push с `deep_link=app://status`.
7. Проверка, что запись остается в inbox и route меняется на `Status`.
8. Проверка неизвестного deep-link (`app://unknown`): inbox обновляется, навигация не выполняется.

Подробная версия чеклиста: `docs/QA_SMOKE.md`.

## Smoke-checklist: VPN

Обязательный минимум для релиза VPN-функциональности:

1. `connect/disconnect` — базовое подключение/отключение VPN.
2. `ttl/token refresh during active session` — refresh токена без ручных действий.
3. `brief network drop + auto reconnect` — восстановление после кратковременного обрыва сети.
4. Проверить PASS-критерии:
   - reconnect time в допустимом SLA,
   - refresh time в допустимом SLA,
   - retries в лимите,
   - manual actions = 0.

Подробная инструкция и переменные раннера: `docs/MOBILE_E2E_SMOKE_RUNNER.md`.

## Known limitations этого репо

Чтобы избежать двусмысленности:

- **В этом репо (`app.securesoft`)**:
  - TypeScript core-логика (auth/device/vpn/push/metrics/update/security/support),
  - CI quality-gate и orchestration release workflow,
  - тестовые/документационные smoke-процессы.
- **Не в этом репо (делается в mobile-native repo)**:
  - финальная iOS/Android app-обвязка,
  - provisioning profiles, signing, entitlements, capabilities на уровне Xcode/Gradle проекта,
  - интеграция/настройка нативных VPN bridge-слоев (Network Extension / VpnService),
  - публикационные нюансы сторов, требующие изменения нативного приложения.

Если релиз блокируется ошибкой нативной сборки, code-signing или store metadata на стороне приложения, изменение должно вноситься в mobile-native repo, а не в этот core-репозиторий.
