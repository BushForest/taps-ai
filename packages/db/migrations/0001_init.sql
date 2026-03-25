CREATE TABLE restaurants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  pos_provider VARCHAR(64) NOT NULL,
  payment_provider VARCHAR(64) NOT NULL,
  loyalty_mode VARCHAR(64) NOT NULL DEFAULT 'optional',
  public_session_grace_minutes INTEGER NOT NULL DEFAULT 15,
  support_retention_days INTEGER NOT NULL DEFAULT 30,
  configuration_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE physical_tables (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id),
  table_code VARCHAR(64) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  service_area VARCHAR(128),
  active_session_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT physical_tables_restaurant_table_code_uq UNIQUE (restaurant_id, table_code)
);

CREATE TABLE nfc_tags (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id),
  table_id VARCHAR(255) NOT NULL REFERENCES physical_tables(id),
  tag_code VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_tapped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nfc_tags_restaurant_tag_code_uq UNIQUE (restaurant_id, tag_code)
);

CREATE TABLE dining_sessions (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id),
  table_id VARCHAR(255) NOT NULL REFERENCES physical_tables(id),
  nfc_tag_id VARCHAR(255) NOT NULL REFERENCES nfc_tags(id),
  public_token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  public_expires_at TIMESTAMPTZ,
  audit_expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  reopened_from_session_id VARCHAR(255),
  transfer_target_table_id VARCHAR(255),
  current_check_id VARCHAR(255),
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE check_snapshots (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id),
  session_id VARCHAR(255) NOT NULL REFERENCES dining_sessions(id),
  pos_check_id VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  remaining_balance_cents INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  source_updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_snapshots_pos_check_version_uq UNIQUE (pos_check_id, version)
);

CREATE TABLE check_line_items (
  id VARCHAR(255) PRIMARY KEY,
  check_snapshot_id VARCHAR(255) NOT NULL REFERENCES check_snapshots(id),
  pos_line_id VARCHAR(255) NOT NULL,
  parent_line_id VARCHAR(255),
  kind VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  extended_price_cents INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  is_standalone BOOLEAN NOT NULL DEFAULT TRUE,
  is_modifier BOOLEAN NOT NULL DEFAULT FALSE,
  modifier_group VARCHAR(128),
  tax_cents INTEGER NOT NULL DEFAULT 0,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_line_items_snapshot_pos_line_uq UNIQUE (check_snapshot_id, pos_line_id)
);

CREATE TABLE payers (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES dining_sessions(id),
  display_name VARCHAR(128) NOT NULL,
  phone_e164 VARCHAR(32),
  loyalty_profile_id VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE allocation_plans (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES dining_sessions(id),
  check_snapshot_id VARCHAR(255) NOT NULL REFERENCES check_snapshots(id),
  status VARCHAR(32) NOT NULL,
  strategy VARCHAR(32) NOT NULL,
  allocation_hash VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by_payer_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE allocation_entries (
  id VARCHAR(255) PRIMARY KEY,
  allocation_plan_id VARCHAR(255) NOT NULL REFERENCES allocation_plans(id),
  payer_id VARCHAR(255) NOT NULL REFERENCES payers(id),
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  share_basis_points INTEGER NOT NULL,
  assigned_cents INTEGER NOT NULL,
  inherited_from_parent BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_attempts (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL REFERENCES dining_sessions(id),
  check_snapshot_id VARCHAR(255) NOT NULL REFERENCES check_snapshots(id),
  payer_id VARCHAR(255) NOT NULL REFERENCES payers(id),
  allocation_plan_id VARCHAR(255) NOT NULL REFERENCES allocation_plans(id),
  status VARCHAR(64) NOT NULL,
  amount_cents INTEGER NOT NULL,
  tip_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  provider VARCHAR(64) NOT NULL,
  provider_payment_intent_id VARCHAR(255),
  provider_charge_id VARCHAR(255),
  pos_attachment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_code VARCHAR(128),
  error_message TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loyalty_profiles (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id),
  phone_e164 VARCHAR(32) NOT NULL,
  external_customer_id VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  points_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_profiles_restaurant_phone_uq UNIQUE (restaurant_id, phone_e164)
);

CREATE TABLE reconciliation_exceptions (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id),
  session_id VARCHAR(255) REFERENCES dining_sessions(id),
  check_snapshot_id VARCHAR(255) REFERENCES check_snapshots(id),
  payment_attempt_id VARCHAR(255) REFERENCES payment_attempts(id),
  type VARCHAR(64) NOT NULL,
  severity VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  summary VARCHAR(255) NOT NULL,
  details JSONB,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_events (
  id VARCHAR(255) PRIMARY KEY,
  restaurant_id VARCHAR(255) NOT NULL REFERENCES restaurants(id),
  session_id VARCHAR(255) REFERENCES dining_sessions(id),
  actor_type VARCHAR(64) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  action VARCHAR(128) NOT NULL,
  subject_type VARCHAR(128) NOT NULL,
  subject_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255),
  correlation_id VARCHAR(255),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE outbox_events (
  id VARCHAR(255) PRIMARY KEY,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX dining_sessions_restaurant_status_idx ON dining_sessions (restaurant_id, status);
CREATE INDEX check_snapshots_session_idx ON check_snapshots (session_id, version);
CREATE INDEX check_line_items_snapshot_idx ON check_line_items (check_snapshot_id);
CREATE INDEX payment_attempts_session_idx ON payment_attempts (session_id, status);
