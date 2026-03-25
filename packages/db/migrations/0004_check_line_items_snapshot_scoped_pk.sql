ALTER TABLE check_line_items
DROP CONSTRAINT IF EXISTS check_line_items_pkey;

ALTER TABLE check_line_items
ADD CONSTRAINT check_line_items_pk PRIMARY KEY (check_snapshot_id, id);
