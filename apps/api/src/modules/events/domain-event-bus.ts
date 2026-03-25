import type { DomainEvent } from "@taps/domain";

export interface DomainEventBus {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}

export class InMemoryDomainEventBus implements DomainEventBus {
  readonly events: DomainEvent[] = [];

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    this.events.push(event as DomainEvent);
  }
}
