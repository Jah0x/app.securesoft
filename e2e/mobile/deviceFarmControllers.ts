import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DeviceFarmController } from "./types.js";

const execFileAsync = promisify(execFile);

const runHook = async (hook: string | undefined, name: string): Promise<void> => {
  if (!hook) {
    throw new Error(`Missing hook command for ${name}. Set SMOKE_${name.toUpperCase()}_CMD.`);
  }

  const [binary, ...args] = hook.split(" ");
  await execFileAsync(binary, args, { env: process.env });
};

class HookDrivenController implements DeviceFarmController {
  private retries = 0;

  constructor(
    private readonly hooks: {
      session: string;
      drop: string;
      restore: string;
    },
  ) {}

  async ensureSessionActive(): Promise<void> {
    await runHook(this.hooks.session, "session");
  }

  async dropNetworkBriefly(): Promise<void> {
    await runHook(this.hooks.drop, "drop");
  }

  async restoreNetwork(): Promise<void> {
    await runHook(this.hooks.restore, "restore");
  }

  markRetry(): void {
    this.retries += 1;
  }

  getRetries(): number {
    return this.retries;
  }
}

export const createAppiumController = (): DeviceFarmController =>
  new HookDrivenController({
    session: process.env.SMOKE_SESSION_CMD ?? "",
    drop: process.env.SMOKE_DROP_CMD ?? "",
    restore: process.env.SMOKE_RESTORE_CMD ?? "",
  });

export const createDetoxController = (): DeviceFarmController =>
  new HookDrivenController({
    session: process.env.SMOKE_SESSION_CMD ?? "",
    drop: process.env.SMOKE_DROP_CMD ?? "",
    restore: process.env.SMOKE_RESTORE_CMD ?? "",
  });
