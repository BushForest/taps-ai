export interface AgentDefinition {
  name: string;
  responsibilities: string[];
  skills: string[];
  subagents: string[];
}

export const agentMap: AgentDefinition[] = [
  {
    name: "Table Session Agent",
    responsibilities: ["Session lifecycle", "NFC mapping", "Table transfer and expiry"],
    skills: [
      "create_session",
      "attach_table",
      "expire_session",
      "lock_closed_session",
      "remap_transferred_table",
      "archive_session",
      "validate_public_access"
    ],
    subagents: ["session_expiry_worker", "table_transfer_handler", "stale_session_detector"]
  },
  {
    name: "Menu Agent",
    responsibilities: ["Menu fetch", "Normalization", "Availability"],
    skills: ["fetch_menu", "normalize_menu", "attach_modifiers", "apply_availability", "validate_price_snapshot"],
    subagents: ["menu_sync_worker", "modifier_normalizer", "catalog_diff_checker"]
  },
  {
    name: "Order / Check Agent",
    responsibilities: ["Check retrieval", "Snapshot building", "Change detection"],
    skills: [
      "fetch_open_check",
      "create_check",
      "refresh_check_snapshot",
      "detect_check_changes",
      "apply_void_or_cancel_update",
      "map_pos_order_to_internal_model"
    ],
    subagents: ["check_snapshot_builder", "change_detector", "check_version_guard"]
  },
  {
    name: "Split Payment Agent",
    responsibilities: ["Allocation math", "Close validation", "Orphan prevention"],
    skills: [
      "split_evenly",
      "assign_items_to_payer",
      "fractionally_allocate_item",
      "custom_allocate_amount",
      "resolve_shared_items",
      "compute_remaining_balance",
      "validate_no_orphan_items",
      "enforce_close_rules"
    ],
    subagents: ["allocation_engine", "rounding_engine", "orphan_item_guard", "concurrency_guard"]
  }
];
