CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_provider_intent_uq
  ON payment_attempts (provider, provider_payment_intent_id);
