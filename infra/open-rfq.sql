-- Borrower-consented request discovery for the independent OpenRequest package.
-- Request disclosures are available to authenticated Symbolon parties; funded
-- quotes remain visible only to their borrower and originating lender.
CREATE TABLE IF NOT EXISTS symbolon_open_requests (
  id uuid PRIMARY KEY,
  market_key text NOT NULL,
  market jsonb NOT NULL,
  borrower text NOT NULL,
  terms jsonb NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL,
  request_contract_id text NOT NULL UNIQUE,
  request_template_id text NOT NULL,
  request_created_event_blob text NOT NULL,
  publish_update_id text NOT NULL,
  closed_update_id text,
  closed_at timestamptz,
  CHECK ((status = 'open' AND closed_update_id IS NULL AND closed_at IS NULL)
    OR (status = 'closed' AND closed_update_id IS NOT NULL AND closed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS symbolon_open_requests_market ON symbolon_open_requests(market_key, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS symbolon_open_requests_owner ON symbolon_open_requests(market_key, borrower, created_at DESC);
CREATE TABLE IF NOT EXISTS symbolon_open_quotes (
  quote_contract_id text PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES symbolon_open_requests(id),
  dealer text NOT NULL,
  rate numeric(35,10) NOT NULL CHECK (rate BETWEEN 0 AND 1),
  valid_until timestamptz NOT NULL,
  update_id text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS symbolon_open_quotes_request ON symbolon_open_quotes(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS symbolon_open_quotes_dealer ON symbolon_open_quotes(dealer, created_at DESC);
