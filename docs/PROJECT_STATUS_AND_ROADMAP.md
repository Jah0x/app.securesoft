# SecureSoft mobile core: project status and roadmap

Last updated: 2026-06-29

## Executive summary

`app.securesoft` is a TypeScript core layer for a cross-platform mobile VPN client. It is not yet a complete Android/iOS application. The repository currently contains business logic, typed API contracts, storage abstractions, release orchestration and tests. React Native UI, native VPN implementation, platform signing, store metadata and production backend integration must be completed or linked from separate repositories before this can be treated as a shippable consumer product.

The strongest investor narrative is not simply "VPN app". For fundraising, SecureSoft should be positioned as an AI-assisted secure remote access product for individuals and small teams: secure connectivity, device/account management, reliability telemetry, user support automation and security policy assistance.

## What is already in good shape

- Modular TypeScript core with clear boundaries for auth, device registration, VPN session management, metrics, push, updates, security, support and app orchestration.
- API contracts for login, refresh, device registration, VPN token retrieval, metrics, push inbox and version checks.
- VPN session state machine with offline handling, reconnect/backoff, JWT refresh scheduling and status snapshots.
- Metrics pipeline with event queue, batch submission and periodic flush hooks.
- Mobile release planning through CI and fastlane-oriented documentation.
- Tests covering core modules, integration simulations and mobile smoke-runner scaffolding.

## Current product-readiness gaps

### P0: repo hygiene and investor clarity

- Keep a one-page investor summary in the repository and update it whenever scope changes.
- Add a security policy and vulnerability reporting process.
- Add an architecture diagram or short architecture note showing how this core connects to backend, React Native UI and native VPN bridges.
- Separate implemented functionality from planned functionality in public-facing docs.
- Add a demo checklist: what can be shown today, what is mocked, and what requires the backend/native repos.

### P1: mobile MVP completion

- Connect this core to a real React Native UI.
- Implement and test native bridge adapters for iOS Network Extension and Android VpnService.
- Replace test/in-memory storage with production Keychain and Android encrypted storage bindings.
- Add platform-specific permission flows for VPN, notifications and device integrity.
- Add real TestFlight / Play Internal build artifacts.

### P2: backend and operations

- Confirm production API compatibility for `/auth/*`, `/devices/register`, `/vpn/token`, `/api/v1/metrics/client`, `/push/*` and `/app/version`.
- Define SLAs for login, token issue, connection start, reconnect and metrics ingestion.
- Add observability dashboards for success rate, reconnect rate, latency, app version distribution and support tickets.
- Add abuse, fraud, bot and account-sharing controls.

### P3: AI-native investor wedge

To approach OpenAI Startup Fund or similar AI-focused investors, SecureSoft needs a credible AI component. The most practical wedge is an AI security operations layer for small teams:

1. **AI support copilot**: explains connection errors, account/device issues and subscription problems using logs and status snapshots without exposing tokens or traffic content.
2. **AI policy assistant**: generates safe device/account/network policies for non-technical small businesses.
3. **AI telemetry triage**: summarizes anomalous reconnect/error/latency patterns and proposes operational actions.
4. **AI onboarding assistant**: guides users through setup, permissions and troubleshooting inside the app.
5. **Privacy-preserving design**: never send VPN JWTs, plaintext tokens, user traffic, private keys or raw browsing content to AI systems.

## Investor proof checklist

Before sending to serious investors, collect:

- 3-5 pilot users or teams using a real build.
- Screenshots or video of login, device registration, one-tap connect, reconnect and logout.
- Basic traction: active users, retention, support tickets resolved, connection success rate, latency and churn reasons.
- Architecture diagram and threat model.
- Clear legal/compliance positioning: secure remote access and privacy/security, not public messaging around bypassing restrictions.
- Data handling policy: what is collected, what is not collected, how tokens and telemetry are protected.

## 30-day cleanup plan

### Week 1

- Publish repo hygiene docs: status, roadmap, security policy and OpenAI/investor plan.
- Add architecture diagram or Mermaid chart.
- Split README into "implemented", "planned" and "external dependencies".

### Week 2

- Add production adapter contracts for native secure storage and VPN bridge.
- Add tests that prove tokens are not logged, metrics do not include sensitive secrets and logout clears account-scoped data.
- Add demo fixtures that show a realistic happy path without production secrets.

### Week 3

- Build a small investor demo flow: login -> device registration -> VPN token -> connect -> metrics -> AI support explanation.
- Add mock AI support module that can summarize safe diagnostics while redacting sensitive fields.

### Week 4

- Run 3-5 pilots.
- Collect metrics and testimonials.
- Prepare one-page pitch, 8-slide deck and short outreach email.

## Suggested positioning

Bad positioning:

> A VPN app for Russia.

Better positioning:

> SecureSoft is an AI-assisted secure remote access layer for small teams and high-risk users. It combines one-tap private connectivity, device/account control, reliability telemetry and AI-guided support so non-technical users can stay connected safely without managing VPN configuration manually.
