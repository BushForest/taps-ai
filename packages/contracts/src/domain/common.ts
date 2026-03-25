export type UUID = string;

export type CurrencyCode = "USD";

export interface Money {
  amountCents: number;
  currency: CurrencyCode;
}

export interface ActorContext {
  type: "guest" | "restaurant_admin" | "support" | "system" | "provider_webhook";
  id: string;
  displayName?: string;
}

export interface CorrelationContext {
  correlationId: string;
  causationId?: string;
  requestId?: string;
  restaurantId: UUID;
  actor: ActorContext;
}

export interface VersionedRecord {
  version: number;
}

export interface AuditStamp {
  createdAt: string;
  updatedAt: string;
}

export interface AuditReference {
  idempotencyKey?: string;
  source: "guest" | "admin" | "worker" | "webhook" | "poller";
}
