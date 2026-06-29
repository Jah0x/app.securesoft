import { describe, expect, it } from "vitest";
import { createAiSupportDiagnosticsPayload, isSensitiveDiagnosticKey, redactDiagnostics } from "../src/index.js";

describe("AI diagnostics redaction", () => {
  it("detects sensitive diagnostic keys", () => {
    expect(isSensitiveDiagnosticKey("accessToken")).toBe(true);
    expect(isSensitiveDiagnosticKey("refresh_token")).toBe(true);
    expect(isSensitiveDiagnosticKey("vpn_jwt")).toBe(true);
    expect(isSensitiveDiagnosticKey("authorization")).toBe(true);
    expect(isSensitiveDiagnosticKey("endpointHostname")).toBe(false);
  });

  it("redacts nested secrets while preserving safe status fields", () => {
    const redacted = redactDiagnostics({
      state: "connected",
      endpointHostname: "edge.example.com",
      nested: {
        accessToken: "access-secret",
        refresh_token: "refresh-secret",
        vpn_jwt: "vpn-secret",
        authorization: "Bearer secret",
        connect_ms: 820,
      },
    });

    expect(redacted).toEqual({
      state: "connected",
      endpointHostname: "edge.example.com",
      nested: {
        accessToken: "[REDACTED]",
        refresh_token: "[REDACTED]",
        vpn_jwt: "[REDACTED]",
        authorization: "[REDACTED]",
        connect_ms: 820,
      },
    });
  });

  it("builds safe AI support diagnostics payloads", () => {
    const payload = createAiSupportDiagnosticsPayload(
      {
        statusSnapshot: {
          state: "error_network",
          sessionId: "session-1",
          vpn_jwt: "must-not-leak",
        },
        reconnectStats: {
          totalAttempts: 2,
          lastReconnectGapMs: 500,
        },
        recentEvents: [
          {
            type: "vpn_connect_error",
            payload: {
              reason: "OFFLINE",
              password: "must-not-leak",
            },
          },
        ],
        rawContext: {
          platform: "ios",
          privateKey: "must-not-leak",
        },
      },
      new Date("2026-06-29T00:00:00.000Z"),
    );

    expect(payload).toEqual({
      kind: "secure_support_diagnostics",
      generatedAt: "2026-06-29T00:00:00.000Z",
      statusSnapshot: {
        state: "error_network",
        sessionId: "session-1",
        vpn_jwt: "[REDACTED]",
      },
      reconnectStats: {
        totalAttempts: 2,
        lastReconnectGapMs: 500,
      },
      deviceIntegrity: {},
      recentEvents: [
        {
          type: "vpn_connect_error",
          payload: {
            reason: "OFFLINE",
            password: "[REDACTED]",
          },
        },
      ],
      context: {
        platform: "ios",
        privateKey: "[REDACTED]",
      },
    });
  });

  it("handles circular objects safely", () => {
    const input: Record<string, unknown> = { state: "connected" };
    input.self = input;

    expect(redactDiagnostics(input)).toEqual({
      state: "connected",
      self: "[CIRCULAR]",
    });
  });
});
