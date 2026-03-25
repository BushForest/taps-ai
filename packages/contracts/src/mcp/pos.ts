import type { CheckSnapshot } from "../domain/check";
import type { MenuSnapshot } from "../domain/menu";
import type { Money, UUID } from "../domain/common";
import type { McpTool } from "./base";

export interface FetchMenuInput {
  restaurantId: UUID;
}

export interface FetchCheckInput {
  restaurantId: UUID;
  tableId: UUID;
  sessionId: UUID;
}

export interface CreateOrderInput {
  restaurantId: UUID;
  tableId: UUID;
  sessionId: UUID;
}

export interface AttachPaymentInput {
  restaurantId: UUID;
  posCheckId: string;
  paymentAttemptId: UUID;
  amount: Money;
  tipAmount?: Money;
}

export interface FetchTableStatusInput {
  restaurantId: UUID;
  tableId: UUID;
}

export interface DetectClosedCheckInput {
  restaurantId: UUID;
  tableId: UUID;
  sessionId: UUID;
  posCheckId?: string;
}

export interface DetectClosedCheckOutput {
  isClosed: boolean;
  posCheckId?: string;
  closedAt?: string;
  transferredToTableId?: UUID;
}

export interface SyncVoidsAndCancelsInput {
  restaurantId: UUID;
  tableId: UUID;
  sessionId: UUID;
  posCheckId?: string;
}

export interface SyncVoidsAndCancelsOutput {
  check: CheckSnapshot | null;
  changedLineIds: UUID[];
  sourceCheckVersion?: string;
}

export type PosAdminMutation =
  | {
      type: "add_menu_item";
      menuItemId: UUID;
      quantity?: number;
    }
  | {
      type: "void_line_item";
      lineItemId: UUID;
      reason?: string;
    }
  | {
      type: "apply_credit";
      amountCents: number;
      label?: string;
    };

export interface AdminMutateCheckInput {
  restaurantId: UUID;
  tableId: UUID;
  sessionId: UUID;
  posCheckId?: string;
  mutation: PosAdminMutation;
}

export interface AdminMutateCheckOutput {
  check: CheckSnapshot;
}

export interface TableStatus {
  state: "open" | "occupied" | "closed" | "transferred" | "unknown";
  posCheckId?: string;
  transferredToTableId?: UUID;
}

export interface PosProviderContract {
  fetchMenu: McpTool<FetchMenuInput, MenuSnapshot>;
  fetchCheck: McpTool<FetchCheckInput, CheckSnapshot | null>;
  createOrder: McpTool<CreateOrderInput, { posCheckId: string }>;
  attachPayment: McpTool<AttachPaymentInput, { posPaymentId: string; attachedAmountCents: number }>;
  fetchTableStatus: McpTool<FetchTableStatusInput, TableStatus>;
  detectClosedCheck: McpTool<DetectClosedCheckInput, DetectClosedCheckOutput>;
  syncVoidsAndCancels: McpTool<SyncVoidsAndCancelsInput, SyncVoidsAndCancelsOutput>;
  adminMutateCheck?: McpTool<AdminMutateCheckInput, AdminMutateCheckOutput>;
}
