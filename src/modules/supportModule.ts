import type { SecureStore } from "../storage/secureStore.js";

export interface SupportTicket {
  id: string;
  accountId: string;
  subject: string;
  message: string;
  createdAt: string;
  channel: "email" | "tracker";
}

export interface SupportTransport {
  send(ticket: SupportTicket): Promise<void>;
}

export class SupportModule {
  private static readonly TICKETS_KEY_PREFIX = "support:tickets";

  constructor(
    private readonly secureStore: SecureStore,
    private readonly transport: SupportTransport,
  ) {}

  async submit(ticket: SupportTicket): Promise<void> {
    await this.transport.send(ticket);
    await this.storeTicket(ticket.accountId, ticket);
  }

  async list(accountId: string): Promise<SupportTicket[]> {
    const raw = await this.secureStore.get(this.key(accountId));
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as SupportTicket[];
  }

  private async storeTicket(accountId: string, ticket: SupportTicket): Promise<void> {
    const tickets = await this.list(accountId);
    tickets.unshift(ticket);
    await this.secureStore.set(this.key(accountId), JSON.stringify(tickets));
  }

  private key(accountId: string): string {
    return `${SupportModule.TICKETS_KEY_PREFIX}:${accountId}`;
  }
}
