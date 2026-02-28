# QA Smoke Checklist

## Push deep-link routing (обязательный smoke)

Статус: **mandatory** для каждого релиза mobile core.

1. Выполнить login тестового аккаунта.
2. Подтвердить push permission (Allow).
3. Проверить успешную регистрацию push token.
4. Отправить push c `deep_link=app://inbox` и дождаться ingest в runtime.
5. Убедиться, что одновременно:
   - уведомление записано в secure inbox (`PushModule.getCachedInbox()` содержит запись),
   - приложение переведено на route `Notifications`.
6. Нажать на push в системном трей с `deep_link=app://status`.
7. Убедиться, что уведомление остается в secure inbox и route меняется на `Status`.
8. Повторить сценарий для неизвестного deep-link (`app://unknown`) и убедиться, что inbox обновляется, а навигация не выполняется.
