import type {
  AllocationPlan,
  CheckSnapshot,
  DiningSession,
  LoyaltyProfile,
  PaymentAttempt,
  Payer
} from "@taps/contracts";

export interface SessionRepository {
  findByPublicToken(token: string): Promise<DiningSession | null>;
  findActiveByTable(restaurantId: string, tableId: string): Promise<DiningSession | null>;
  findById(id: string): Promise<DiningSession | null>;
  listByRestaurant(restaurantId: string, status?: string): Promise<DiningSession[]>;
  save(session: DiningSession): Promise<DiningSession>;
  listExpirable(nowIso: string): Promise<DiningSession[]>;
  listArchivable(nowIso: string): Promise<DiningSession[]>;
}

export interface CheckRepository {
  findLatestBySession(sessionId: string): Promise<CheckSnapshot | null>;
  save(snapshot: CheckSnapshot): Promise<CheckSnapshot>;
}

export interface AllocationPlanRepository {
  findById(id: string): Promise<AllocationPlan | null>;
  findLatestByCheck(checkSnapshotId: string): Promise<AllocationPlan | null>;
  findLatestBySession(sessionId: string): Promise<AllocationPlan | null>;
  save(plan: AllocationPlan): Promise<AllocationPlan>;
}

export interface PayerRepository {
  listBySession(sessionId: string): Promise<Payer[]>;
  findById(id: string): Promise<Payer | null>;
  save(payer: Payer): Promise<Payer>;
}

export interface PaymentAttemptRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<PaymentAttempt | null>;
  findById(id: string): Promise<PaymentAttempt | null>;
  findByProviderPaymentIntentId(provider: string, providerPaymentIntentId: string): Promise<PaymentAttempt | null>;
  listBySession(sessionId: string): Promise<PaymentAttempt[]>;
  listPendingBySession(sessionId: string): Promise<PaymentAttempt[]>;
  save(paymentAttempt: PaymentAttempt): Promise<PaymentAttempt>;
}

export interface LoyaltyProfileRepository {
  findById(id: string): Promise<LoyaltyProfile | null>;
  findByPhone(restaurantId: string, phoneE164: string): Promise<LoyaltyProfile | null>;
  save(profile: LoyaltyProfile): Promise<LoyaltyProfile>;
}

export interface ReconciliationExceptionRecord {
  id: string;
  restaurantId: string;
  sessionId?: string;
  checkSnapshotId?: string;
  paymentAttemptId?: string;
  type: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "investigating" | "resolved" | "ignored";
  summary: string;
  details?: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string;
}

export interface ReconciliationExceptionRepository {
  create(exception: ReconciliationExceptionRecord): Promise<ReconciliationExceptionRecord>;
  listOpenBySession(sessionId: string): Promise<ReconciliationExceptionRecord[]>;
  resolve(id: string, resolvedAt: string): Promise<void>;
}

export interface AuditLogRecord {
  id: string;
  restaurantId: string;
  sessionId?: string;
  actorType: string;
  actorId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  idempotencyKey?: string;
  correlationId?: string;
  payload?: unknown;
  createdAt: string;
}

export interface AuditRepository {
  record(entry: AuditLogRecord): Promise<void>;
}
