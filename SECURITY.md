# Security Policy

## Supported status

This repository currently contains the TypeScript mobile core and release orchestration for SecureSoft. It is not yet a complete production mobile application. Native iOS/Android VPN implementations, app signing, store release metadata and backend deployment may live outside this repository.

## Reporting a vulnerability

Please do not open public GitHub issues for vulnerabilities, secrets, token leaks or exploitable behavior.

Report security issues privately to the project maintainer. Include:

- affected component or file path;
- reproduction steps;
- expected vs actual behavior;
- potential impact;
- logs or screenshots with secrets removed.

## Sensitive data rules

Never commit or paste:

- access tokens;
- refresh tokens;
- VPN JWTs;
- private keys;
- APNS keys;
- Google Play service account JSON;
- Apple signing certificates or provisioning profiles;
- production backend credentials;
- raw user traffic;
- full diagnostic bundles containing private user data.

## AI diagnostics rules

Any future AI support or diagnostics feature must redact sensitive fields before data leaves the client or backend.

Fields that must be redacted include:

- `accessToken`;
- `refreshToken`;
- `vpn_jwt`;
- `password`;
- `authorization` headers;
- private keys;
- device-specific secrets;
- user traffic content.

AI systems may receive high-level status snapshots, error categories, timing metrics and anonymized event summaries only when this is consistent with the product privacy policy.

## Secure development checklist

Before a production release:

- [ ] Enable GitHub secret scanning and branch protection.
- [ ] Add dependency vulnerability scanning.
- [ ] Add tests proving logout clears account-scoped sensitive data.
- [ ] Add tests proving diagnostics redact sensitive fields.
- [ ] Add tests proving metrics do not include tokens or raw traffic content.
- [ ] Document iOS Keychain and Android encrypted storage bindings.
- [ ] Document TLS pinning behavior and certificate rotation.
- [ ] Complete OWASP Mobile Top 10 review.
- [ ] Complete privacy/data-handling policy.
- [ ] Complete incident response runbook.

## Disclosure expectations

The project owner should acknowledge valid reports quickly, investigate impact, patch affected code and publish a short advisory when appropriate. Public disclosure should wait until users have a reasonable chance to update.
