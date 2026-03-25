ALTER TABLE check_snapshots
  ADD COLUMN source_system VARCHAR(64) NOT NULL DEFAULT 'unknown',
  ADD COLUMN source_check_version VARCHAR(128),
  ADD COLUMN amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN assignment_summary JSONB;

ALTER TABLE check_line_items
  ADD COLUMN gross_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN assigned_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN assignment_status VARCHAR(32) NOT NULL DEFAULT 'unassigned',
  ADD COLUMN is_tiny_charge BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE payment_attempts
  ADD COLUMN check_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN client_secret VARCHAR(255),
  ADD COLUMN loyalty_awarded_at TIMESTAMPTZ,
  ADD COLUMN loyalty_points_awarded INTEGER;

ALTER TABLE allocation_plans
  ADD COLUMN check_version INTEGER NOT NULL DEFAULT 1;
