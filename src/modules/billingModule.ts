export type BillingState = "inactive" | "trial" | "active" | "canceled" | "expired";

export interface BillingSnapshot {
  state: BillingState;
  renewalAt: string | null;
  source: "app_store" | "play_store" | null;
}

export class BillingModule {
  private snapshot: BillingSnapshot = {
    state: "inactive",
    renewalAt: null,
    source: null,
  };

  startTrial(renewalAt: string, source: "app_store" | "play_store"): BillingSnapshot {
    this.snapshot = { state: "trial", renewalAt, source };
    return this.snapshot;
  }

  activateSubscription(renewalAt: string, source: "app_store" | "play_store"): BillingSnapshot {
    this.snapshot = { state: "active", renewalAt, source };
    return this.snapshot;
  }

  cancelAutoRenew(): BillingSnapshot {
    this.snapshot = { ...this.snapshot, state: "canceled" };
    return this.snapshot;
  }

  expireSubscription(): BillingSnapshot {
    this.snapshot = { ...this.snapshot, state: "expired", renewalAt: null };
    return this.snapshot;
  }

  getSnapshot(): BillingSnapshot {
    return this.snapshot;
  }
}
