import type { CorrelationContext, UUID } from "@taps/contracts";

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: UUID;
  type: string;
  aggregateType: string;
  aggregateId: UUID;
  occurredAt: string;
  context: CorrelationContext;
  payload: TPayload;
}
