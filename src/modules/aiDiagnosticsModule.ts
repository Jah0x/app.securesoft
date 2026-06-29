export type DiagnosticPrimitive = string | number | boolean | null;
export type DiagnosticValue = DiagnosticPrimitive | DiagnosticValue[] | { [key: string]: DiagnosticValue };

export interface RedactionOptions {
  redactedValue?: string;
  maxDepth?: number;
  sensitiveKeyPatterns?: RegExp[];
}

export interface AiSupportDiagnosticsInput {
  statusSnapshot?: Record<string, unknown>;
  reconnectStats?: Record<string, unknown>;
  deviceIntegrity?: Record<string, unknown>;
  recentEvents?: Array<Record<string, unknown>>;
  rawContext?: Record<string, unknown>;
}

export interface AiSupportDiagnosticsPayload {
  kind: "secure_support_diagnostics";
  generatedAt: string;
  statusSnapshot: unknown;
  reconnectStats: unknown;
  deviceIntegrity: unknown;
  recentEvents: unknown;
  context: unknown;
}

const DEFAULT_REDACTED_VALUE = "[REDACTED]";
const DEFAULT_MAX_DEPTH = 8;

const DEFAULT_SENSITIVE_KEY_PATTERNS = [
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /^token$/i,
  /vpn[_-]?jwt/i,
  /^jwt$/i,
  /password/i,
  /authorization/i,
  /cookie/i,
  /secret/i,
  /private[_-]?key/i,
  /service[_-]?account/i,
  /certificate/i,
];

export const isSensitiveDiagnosticKey = (
  key: string,
  patterns: RegExp[] = DEFAULT_SENSITIVE_KEY_PATTERNS,
): boolean => patterns.some((pattern) => pattern.test(key));

export const redactDiagnostics = (value: unknown, options: RedactionOptions = {}): unknown => {
  const redactedValue = options.redactedValue ?? DEFAULT_REDACTED_VALUE;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const patterns = options.sensitiveKeyPatterns ?? DEFAULT_SENSITIVE_KEY_PATTERNS;
  const seen = new WeakSet<object>();

  const visit = (current: unknown, depth: number): unknown => {
    if (depth > maxDepth) {
      return "[TRUNCATED]";
    }

    if (current === null || typeof current !== "object") {
      return current;
    }

    if (current instanceof Date) {
      return current.toISOString();
    }

    if (seen.has(current)) {
      return "[CIRCULAR]";
    }

    seen.add(current);

    if (Array.isArray(current)) {
      return current.map((item) => visit(item, depth + 1));
    }

    return Object.fromEntries(
      Object.entries(current as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        isSensitiveDiagnosticKey(key, patterns) ? redactedValue : visit(entryValue, depth + 1),
      ]),
    );
  };

  return visit(value, 0);
};

export const createAiSupportDiagnosticsPayload = (
  input: AiSupportDiagnosticsInput,
  now: Date = new Date(),
): AiSupportDiagnosticsPayload => ({
  kind: "secure_support_diagnostics",
  generatedAt: now.toISOString(),
  statusSnapshot: redactDiagnostics(input.statusSnapshot ?? {}),
  reconnectStats: redactDiagnostics(input.reconnectStats ?? {}),
  deviceIntegrity: redactDiagnostics(input.deviceIntegrity ?? {}),
  recentEvents: redactDiagnostics(input.recentEvents ?? []),
  context: redactDiagnostics(input.rawContext ?? {}),
});
