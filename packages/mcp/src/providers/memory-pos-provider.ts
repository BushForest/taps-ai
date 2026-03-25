import type {
  AdminMutateCheckOutput,
  CheckLineItem,
  CheckSnapshot,
  McpRequestEnvelope,
  MenuSnapshot,
  PosProviderContract,
  TableStatus
} from "@taps/contracts";
import { createMcpTool, errorResponse, okResponse } from "../runtime/mcp-tool";

export interface MemoryPosSeed {
  menu: MenuSnapshot;
  checksByTable: Record<string, CheckSnapshot>;
  tableStatus?: Record<string, TableStatus>;
  menuToEmptyCheck?: (sessionId: string, restaurantId: string, tableId: string) => CheckSnapshot;
}

function bindSeedCheckToSession(check: CheckSnapshot, sessionId: string, tableId: string): CheckSnapshot {
  const nowIso = new Date().toISOString();
  return {
    ...check,
    id: `check_${sessionId}`,
    sessionId,
    posCheckId: `pos_${tableId}_${sessionId}`,
    sourceCheckVersion: "1",
    version: 1,
    amountPaidCents: 0,
    remainingBalanceCents: check.totalCents,
    status: "open",
    closedAt: undefined,
    sourceUpdatedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    assignmentSummary: {
      ...check.assignmentSummary,
      assignedLineCents: 0,
      unassignedLineCents: check.totalCents,
      outstandingBalanceCents: check.totalCents
    },
    lines: check.lines.map((line) => ({
      ...line,
      assignedCents: 0,
      assignmentStatus: "unassigned",
      childLineIds: [...line.childLineIds]
    }))
  };
}

function isOpenLine(line: CheckLineItem): boolean {
  return !["voided", "cancelled", "transferred"].includes(line.status);
}

function refreshSourceTotals(check: CheckSnapshot): CheckSnapshot {
  const activeLines = check.lines.filter(isOpenLine);
  const subtotalCents = activeLines.reduce((sum, line) => sum + line.extendedPriceCents, 0);
  const taxCents = activeLines.reduce((sum, line) => sum + (line.taxCents ?? 0), 0);
  const feeCents = activeLines.reduce((sum, line) => sum + (line.feeCents ?? 0), 0);
  const totalCents = Math.max(subtotalCents + taxCents + feeCents - check.discountCents, 0);
  const amountPaidCents = Math.min(check.amountPaidCents, totalCents);
  const remainingBalanceCents = Math.max(totalCents - amountPaidCents, 0);

  check.subtotalCents = subtotalCents;
  check.taxCents = taxCents;
  check.feeCents = feeCents;
  check.totalCents = totalCents;
  check.amountPaidCents = amountPaidCents;
  check.remainingBalanceCents = remainingBalanceCents;
  check.status = remainingBalanceCents === 0 ? "closed" : amountPaidCents > 0 ? "partially_paid" : "open";
  check.assignmentSummary = {
    ...check.assignmentSummary,
    unassignedLineItemIds: activeLines.map((line) => line.id),
    unassignedTinyItemIds: activeLines.filter((line) => line.isTinyCharge).map((line) => line.id),
    assignedLineCents: 0,
    unassignedLineCents: totalCents,
    outstandingBalanceCents: remainingBalanceCents
  };
  check.updatedAt = new Date().toISOString();
  check.sourceUpdatedAt = check.updatedAt;
  check.version += 1;
  check.sourceCheckVersion = String(check.version);
  if (check.status === "closed") {
    check.closedAt = check.updatedAt;
  } else {
    check.closedAt = undefined;
  }

  return check;
}

function buildMenuItemLine(item: MenuSnapshot["items"][number]): CheckLineItem {
  const taxCents = Math.round(item.basePriceCents * 0.08);
  const lineId = `line_${crypto.randomUUID()}`;
  return {
    id: lineId,
    posLineId: `pos_${lineId}`,
    kind: "item",
    name: item.name,
    quantity: 1,
    unitPriceCents: item.basePriceCents,
    extendedPriceCents: item.basePriceCents,
    status: "sent",
    isStandalone: true,
    isModifier: false,
    taxCents,
    feeCents: 0,
    grossCents: item.basePriceCents + taxCents,
    assignedCents: 0,
    childLineIds: [],
    assignmentStatus: "unassigned",
    isTinyCharge: item.basePriceCents + taxCents <= 250
  };
}

function adminMutationSucceeded(
  request: McpRequestEnvelope<{ mutation: unknown }>,
  check: CheckSnapshot
) {
  return okResponse(request, { check } satisfies AdminMutateCheckOutput);
}

export function createMemoryPosProvider(seed: MemoryPosSeed): PosProviderContract {
  const checksByTable = new Map<string, CheckSnapshot>(Object.entries(seed.checksByTable));
  const tableStatus = new Map<string, TableStatus>(Object.entries(seed.tableStatus ?? {}));

  return {
    fetchMenu: createMcpTool(async (request) => okResponse(request, seed.menu)),
    fetchCheck: createMcpTool(async (request) => {
      const check = checksByTable.get(request.input.tableId) ?? null;
      if (check && check.sessionId !== request.input.sessionId) {
        if (check.sessionId === "session_placeholder") {
          const reboundCheck = bindSeedCheckToSession(check, request.input.sessionId, request.input.tableId);
          checksByTable.set(request.input.tableId, reboundCheck);
          tableStatus.set(request.input.tableId, {
            state: "occupied",
            posCheckId: reboundCheck.posCheckId
          });
          return okResponse(request, reboundCheck);
        } else {
          return okResponse(request, null);
        }
      }

      return okResponse(request, check);
    }),
    createOrder: createMcpTool(async (request) => {
      const existing = checksByTable.get(request.input.tableId);
      if (existing && existing.sessionId === request.input.sessionId) {
        return okResponse(request, { posCheckId: existing.posCheckId });
      }

      if (!seed.menuToEmptyCheck) {
        return errorResponse(
          request,
          "NO_EMPTY_CHECK_FACTORY",
          "Memory POS provider needs a check seed for order creation."
        );
      }

      const newCheck = seed.menuToEmptyCheck(request.input.sessionId, request.input.restaurantId, request.input.tableId);
      checksByTable.set(request.input.tableId, newCheck);
      tableStatus.set(request.input.tableId, {
        state: "occupied",
        posCheckId: newCheck.posCheckId
      });
      return okResponse(request, { posCheckId: newCheck.posCheckId });
    }),
    attachPayment: createMcpTool(async (request) => {
      const checkEntry = [...checksByTable.entries()].find(([, candidate]) => candidate.posCheckId === request.input.posCheckId);
      const check = checkEntry?.[1];
      if (!check) {
        return errorResponse(request, "CHECK_NOT_FOUND", "Memory POS could not find the check for payment attach.");
      }

      const paymentDelta = request.input.amount.amountCents + (request.input.tipAmount?.amountCents ?? 0);
      check.remainingBalanceCents = Math.max(check.remainingBalanceCents - paymentDelta, 0);
      check.amountPaidCents = Math.min(check.amountPaidCents + paymentDelta, check.totalCents);
      check.status = check.remainingBalanceCents === 0 ? "closed" : "partially_paid";
      check.version += 1;
      check.sourceCheckVersion = String(check.version);
      check.assignmentSummary = {
        ...check.assignmentSummary,
        outstandingBalanceCents: check.remainingBalanceCents
      };
      check.updatedAt = new Date().toISOString();
      if (check.status === "closed") {
        check.closedAt = new Date().toISOString();
      }
      if (checkEntry) {
        tableStatus.set(checkEntry[0], {
          state: check.status === "closed" ? "closed" : "occupied",
          posCheckId: check.posCheckId
        });
      }

      return okResponse(request, {
        posPaymentId: crypto.randomUUID(),
        attachedAmountCents: paymentDelta
      });
    }),
    fetchTableStatus: createMcpTool(async (request) => {
      const status = tableStatus.get(request.input.tableId) ?? {
        state: checksByTable.has(request.input.tableId) ? "occupied" : "open"
      };

      return okResponse(request, status);
    }),
    detectClosedCheck: createMcpTool(async (request) => {
      const check =
        [...checksByTable.values()].find((candidate) => candidate.posCheckId === request.input.posCheckId) ??
        checksByTable.get(request.input.tableId) ??
        null;

      return okResponse(request, {
        isClosed: !check || check.status === "closed",
        posCheckId: check?.posCheckId,
        closedAt: check?.closedAt
      });
    }),
    syncVoidsAndCancels: createMcpTool(async (request) => {
      const check =
        [...checksByTable.values()].find((candidate) => candidate.posCheckId === request.input.posCheckId) ??
        checksByTable.get(request.input.tableId) ??
        null;

      return okResponse(request, {
        check,
        changedLineIds:
          check?.lines
            .filter((line) => line.status === "voided" || line.status === "cancelled")
            .map((line) => line.id) ?? [],
        sourceCheckVersion: check?.sourceCheckVersion
      });
    }),
    adminMutateCheck: createMcpTool(async (request) => {
      const checkEntry =
        [...checksByTable.entries()].find(([, candidate]) => candidate.posCheckId === request.input.posCheckId) ??
        [...checksByTable.entries()].find(([, candidate]) => candidate.sessionId === request.input.sessionId) ??
        [request.input.tableId, checksByTable.get(request.input.tableId)] as const;
      const tableId = checkEntry?.[0];
      const check = checkEntry?.[1];

      if (!tableId || !check) {
        return errorResponse(request, "CHECK_NOT_FOUND", "Memory POS could not find the check for admin mutation.");
      }

      if (request.input.mutation.type === "add_menu_item") {
        const mutation = request.input.mutation;
        const menuItem = seed.menu.items.find((item) => item.id === mutation.menuItemId);
        if (!menuItem) {
          return errorResponse(request, "MENU_ITEM_NOT_FOUND", `Menu item ${mutation.menuItemId} was not found.`);
        }

        const quantity = Math.max(mutation.quantity ?? 1, 1);
        for (let index = 0; index < quantity; index += 1) {
          check.lines.push(buildMenuItemLine(menuItem));
        }
        refreshSourceTotals(check);
        tableStatus.set(tableId, { state: "occupied", posCheckId: check.posCheckId });
        return adminMutationSucceeded(request, check);
      }

      if (request.input.mutation.type === "void_line_item") {
        const lineIdsToRemove = new Set<string>();
        const candidateIds = new Set([
          request.input.mutation.lineItemId,
          request.input.mutation.lineItemId.replace(/^pos_/, "")
        ]);
        const rootLine = check.lines.find(
          (line) => candidateIds.has(line.id) || candidateIds.has(line.posLineId)
        );
        if (!rootLine) {
          return errorResponse(request, "LINE_NOT_FOUND", `Line ${request.input.mutation.lineItemId} was not found.`);
        }

        lineIdsToRemove.add(rootLine.id);
        for (const line of check.lines) {
          if (line.parentLineId === rootLine.id) {
            lineIdsToRemove.add(line.id);
          }
        }

        check.lines = check.lines.filter((line) => !lineIdsToRemove.has(line.id));
        refreshSourceTotals(check);
        tableStatus.set(tableId, { state: check.status === "closed" ? "closed" : "occupied", posCheckId: check.posCheckId });
        return adminMutationSucceeded(request, check);
      }

      if (request.input.mutation.type === "apply_credit") {
        const amountCents = Math.max(request.input.mutation.amountCents, 0);
        if (amountCents <= 0) {
          return errorResponse(request, "INVALID_CREDIT_AMOUNT", "Credit amount must be positive.");
        }

        check.discountCents += amountCents;
        refreshSourceTotals(check);
        tableStatus.set(tableId, { state: check.status === "closed" ? "closed" : "occupied", posCheckId: check.posCheckId });
        return adminMutationSucceeded(request, check);
      }

      return errorResponse(request, "UNSUPPORTED_MUTATION", "Unsupported admin mutation for memory POS.");
    })
  };
}
