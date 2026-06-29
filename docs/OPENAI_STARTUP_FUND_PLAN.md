# OpenAI Startup Fund preparation plan

Last updated: 2026-06-29

## Reality check

OpenAI Startup Fund is not a general grant program for any software project. It invests in early-stage companies with ambitious AI products. SecureSoft should not be pitched as a plain VPN. The fundraise story should be reframed around an AI-assisted security and remote-access product.

Official public information to use when preparing outreach:

- Website: https://openai.fund/
- About page: https://openai.fund/about
- Contact: hello@openai.fund
- Public positioning: investing in startups with big ideas about AI.
- Fund focus: early-stage startups where AI can have transformative effect and empower people to be more productive.
- Converge 2 is closed, but its public page is useful for understanding what the fund has historically valued.

## Fit assessment

### Current fit: weak to medium

The repository is currently a VPN/mobile core. That is useful infrastructure, but it is not yet an AI-first company by itself.

### Target fit: medium to strong

The pitch becomes stronger if SecureSoft builds an AI layer around secure remote access:

- AI support copilot for connection diagnostics.
- AI telemetry triage for reliability and security anomalies.
- AI onboarding assistant for VPN permissions, app setup and account/device troubleshooting.
- AI policy assistant for small businesses that need secure access without in-house IT.
- Privacy-preserving redaction pipeline so sensitive tokens, JWTs, keys and user traffic are never sent to AI models.

## Minimum assets before outreach

Do not send a cold email until these are ready:

1. **Working demo**
   - Login.
   - Device registration.
   - One-tap connect flow.
   - Status snapshot.
   - Metrics/event pipeline.
   - AI support explanation using redacted diagnostics.

2. **One-page investor summary**
   - Problem.
   - Product.
   - AI wedge.
   - Why now.
   - Who uses it.
   - Current traction.
   - What funding unlocks.

3. **Technical proof**
   - Architecture diagram.
   - Threat model.
   - Privacy and data-handling policy.
   - Test/CI status.
   - Demo video or screenshots.

4. **Business proof**
   - 3-5 pilot users or teams.
   - Connection success rate.
   - Support ticket reduction or time-to-resolution improvement from the AI assistant.
   - Retention or repeated usage.
   - Clear monthly pricing hypothesis.

## Outreach email draft

Subject: SecureSoft — AI-assisted secure remote access for small teams

Hi OpenAI Startup Fund team,

I am building SecureSoft, an AI-assisted secure remote access product for small teams and high-risk users who need one-tap private connectivity without managing VPN configuration manually.

The product combines a mobile secure-access client, device/account controls, reliability telemetry and an AI support layer that can diagnose connection issues, explain safe next steps and help teams create simple security policies. The AI layer is designed with strict redaction: it never sends VPN JWTs, plaintext tokens, private keys or user traffic content to models.

The TypeScript mobile core is already implemented with modules for auth, device registration, VPN session management, metrics, push notifications, update checks, security checks and support workflows. I am now connecting it to the production mobile/native layer and preparing pilot users.

I would value a conversation about whether this fits the OpenAI Startup Fund thesis around AI products that empower people and make complex workflows easier for non-technical users.

Best,
[Name]

## 8-slide deck outline

1. **Title** — SecureSoft: AI-assisted secure remote access.
2. **Problem** — secure connectivity is hard for small teams and non-technical users; support load is high; setup mistakes create risk.
3. **Product** — one-tap secure access, account/device control, telemetry and AI-guided support.
4. **AI wedge** — support copilot, telemetry triage, policy assistant and onboarding assistant.
5. **Architecture** — mobile core, backend, native VPN bridge, telemetry, AI redaction layer.
6. **Progress** — implemented core modules, tests, CI, docs, next mobile/native integration.
7. **Go-to-market** — small teams, freelancers, remote operators, IT-light businesses; direct pilots and partner channels.
8. **Ask** — funding/compute/technical mentorship to finish mobile MVP, AI support layer and pilots.

## Red flags to fix before outreach

- Do not describe the company as a tool for bypassing restrictions.
- Do not claim production readiness until native mobile app, backend and pilots are real.
- Do not show AI features unless they actually work in demo form.
- Do not send secrets, JWTs, raw traffic or private user logs to AI systems.
- Do not overstate traction. Investors will forgive early stage; they will not forgive fake numbers.

## Next repository tasks

- Add AI diagnostics interfaces and a safe redaction helper.
- Add tests proving sensitive fields are removed before diagnostics are summarized.
- Add a demo script that shows a safe AI-generated troubleshooting explanation.
- Add architecture documentation.
- Prepare screenshots/video after React Native UI is connected.
