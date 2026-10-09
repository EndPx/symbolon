CREATE TABLE IF NOT EXISTS symbolon_lenders (
  market_key text NOT NULL,
  market jsonb NOT NULL,
  party text NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  active boolean NOT NULL DEFAULT true,
  registered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market_key, party)
);
CREATE INDEX IF NOT EXISTS symbolon_lenders_active_market ON symbolon_lenders(market_key) WHERE active = true;
