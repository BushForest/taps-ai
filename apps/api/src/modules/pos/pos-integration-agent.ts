import type {
  CheckSnapshot,
  CorrelationContext,
  MenuSnapshot,
  PosAdminMutation,
  PosProviderContract,
  TableStatus
} from "@taps/contracts";
import type { ProviderRegistry } from "@taps/mcp";
import { requireProvider } from "@taps/mcp";
import { DomainError, NotFoundError } from "../../lib/errors";

export class PosIntegrationAgent {
  constructor(private readonly providers: ProviderRegistry) {}

  private providerFor(posProviderKey: string): PosProviderContract {
    return requireProvider(this.providers.pos, posProviderKey, "POS");
  }

  async fetchMenu(posProviderKey: string, context: CorrelationContext): Promise<MenuSnapshot> {
    const response = await this.providerFor(posProviderKey).fetchMenu.execute({
      provider: posProviderKey,
      action: "fetch_menu_from_pos",
      version: "1",
      timeoutMs: 5000,
      context,
      input: {
        restaurantId: context.restaurantId
      }
    });

    if (!response.ok || !response.output) {
      throw new NotFoundError(response.errorMessage ?? "Unable to fetch menu from POS", response.errorCode);
    }

    return response.output;
  }

  async fetchCheck(
    posProviderKey: string,
    context: CorrelationContext,
    tableId: string,
    sessionId: string
  ): Promise<CheckSnapshot | null> {
    const response = await this.providerFor(posProviderKey).fetchCheck.execute({
      provider: posProviderKey,
      action: "fetch_check_from_pos",
      version: "1",
      timeoutMs: 5000,
      context,
      input: {
        restaurantId: context.restaurantId,
        tableId,
        sessionId
      }
    });

    if (!response.ok) {
      return null;
    }

    return response.output ?? null;
  }

  async createOrder(
    posProviderKey: string,
    context: CorrelationContext,
    tableId: string,
    sessionId: string
  ): Promise<{ posCheckId: string }> {
    const response = await this.providerFor(posProviderKey).createOrder.execute({
      provider: posProviderKey,
      action: "create_order_in_pos",
      version: "1",
      timeoutMs: 5000,
      context,
      input: {
        restaurantId: context.restaurantId,
        tableId,
        sessionId
      }
    });

    if (!response.ok || !response.output) {
      throw new NotFoundError(response.errorMessage ?? "Unable to create POS order", response.errorCode);
    }

    return response.output;
  }

  async attachPayment(
    posProviderKey: string,
    context: CorrelationContext,
    posCheckId: string,
    paymentAttemptId: string,
    amountCents: number,
    tipCents: number
  ): Promise<{ posPaymentId: string; attachedAmountCents: number }> {
    const response = await this.providerFor(posProviderKey).attachPayment.execute({
      provider: posProviderKey,
      action: "attach_payment_in_pos",
      version: "1",
      timeoutMs: 5000,
      context,
      idempotencyKey: `posattach:${posProviderKey}:${paymentAttemptId}`,
      input: {
        restaurantId: context.restaurantId,
        posCheckId,
        paymentAttemptId,
        amount: { amountCents, currency: "USD" },
        tipAmount: tipCents > 0 ? { amountCents: tipCents, currency: "USD" } : undefined
      }
    });

    if (!response.ok || !response.output) {
      throw new NotFoundError(response.errorMessage ?? "Unable to attach payment to POS", response.errorCode);
    }

    return response.output;
  }

  async fetchTableStatus(posProviderKey: string, context: CorrelationContext, tableId: string): Promise<TableStatus> {
    const response = await this.providerFor(posProviderKey).fetchTableStatus.execute({
      provider: posProviderKey,
      action: "fetch_table_status",
      version: "1",
      timeoutMs: 5000,
      context,
      input: {
        restaurantId: context.restaurantId,
        tableId
      }
    });

    if (!response.ok || !response.output) {
      return { state: "unknown" };
    }

    return response.output;
  }

  async detectClosedCheck(
    posProviderKey: string,
    context: CorrelationContext,
    input: { tableId: string; sessionId: string; posCheckId?: string }
  ): Promise<{ isClosed: boolean; posCheckId?: string; closedAt?: string; transferredToTableId?: string }> {
    const response = await this.providerFor(posProviderKey).detectClosedCheck.execute({
      provider: posProviderKey,
      action: "detect_closed_check",
      version: "1",
      timeoutMs: 5000,
      context,
      input: {
        restaurantId: context.restaurantId,
        tableId: input.tableId,
        sessionId: input.sessionId,
        posCheckId: input.posCheckId
      }
    });

    if (!response.ok || !response.output) {
      return {
        isClosed: false
      };
    }

    return response.output;
  }

  async syncVoidsAndCancels(
    posProviderKey: string,
    context: CorrelationContext,
    input: { tableId: string; sessionId: string; posCheckId?: string }
  ): Promise<{ check: CheckSnapshot | null; changedLineIds: string[]; sourceCheckVersion?: string }> {
    const response = await this.providerFor(posProviderKey).syncVoidsAndCancels.execute({
      provider: posProviderKey,
      action: "sync_voids_and_cancels",
      version: "1",
      timeoutMs: 5000,
      context,
      input: {
        restaurantId: context.restaurantId,
        tableId: input.tableId,
        sessionId: input.sessionId,
        posCheckId: input.posCheckId
      }
    });

    if (!response.ok || !response.output) {
      return {
        check: null,
        changedLineIds: []
      };
    }

    return response.output;
  }

  async adminMutateCheck(
    posProviderKey: string,
    context: CorrelationContext,
    input: { tableId: string; sessionId: string; posCheckId?: string; mutation: PosAdminMutation }
  ): Promise<CheckSnapshot> {
    const provider = this.providerFor(posProviderKey);
    if (!provider.adminMutateCheck) {
      throw new DomainError(
        `POS provider ${posProviderKey} does not support admin check mutations`,
        "POS_ADMIN_MUTATION_UNSUPPORTED",
        501
      );
    }

    const response = await provider.adminMutateCheck.execute({
      provider: posProviderKey,
      action: "admin_mutate_check",
      version: "1",
      timeoutMs: 5000,
      context,
      input: {
        restaurantId: context.restaurantId,
        tableId: input.tableId,
        sessionId: input.sessionId,
        posCheckId: input.posCheckId,
        mutation: input.mutation
      }
    });

    if (!response.ok || !response.output?.check) {
      throw new DomainError(
        response.errorMessage ?? "Unable to apply admin POS mutation",
        response.errorCode ?? "POS_ADMIN_MUTATION_FAILED",
        response.retryable ? 503 : 409
      );
    }

    return response.output.check;
  }
}
