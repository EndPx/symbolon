-- Off-ledger discovery metadata. Borrower terms and lender interests are private
-- to the application access checks and database operators; they are not anonymous
-- from the hosting operator. Tokens and contract blobs are never stored here.
CREATE TABLE IF NOT EXISTS symbolon_opportunities (
  id uuid PRIMARY KEY,
  market_key text NOT NULL,
  market jsonb NOT NULL,
  borrower text NOT NULL,
  terms jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS symbolon_opportunities_open_market ON symbolon_opportunities(market_key, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS symbolon_opportunities_owner ON symbolon_opportunities(market_key, borrower, created_at DESC);
CREATE TABLE IF NOT EXISTS symbolon_opportunity_interests (
  id uuid PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES symbolon_opportunities(id),
  lender text NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  request_update_id text,
  request_contract_id text UNIQUE,
  UNIQUE(opportunity_id, lender),
  CHECK ((status = 'pending' AND approved_at IS NULL AND request_update_id IS NULL AND request_contract_id IS NULL)
    OR (status = 'approved' AND approved_at IS NOT NULL AND request_update_id IS NOT NULL AND request_contract_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS symbolon_opportunity_interests_lender ON symbolon_opportunity_interests(lender, created_at DESC);
