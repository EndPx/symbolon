# Registered lender directory

The DevNet app uses a persistent off-ledger Neon PostgreSQL directory for lender
discovery, exposed through `/api/lenders` on the same Vercel origin. It is not a
cash pool, quote service, oracle or ledger authority. The existing Daml packages
and request/quote/settlement choices are unchanged.

Each registration is scoped to network, synchronizer, core package, collateral
issuer/instrument, cash issuer/instrument and oracle. A lender explicitly agrees
to publish only its name, party ID and market preference. The server verifies the
bearer with the pinned HackCanton participant, checks an active user and its live
CanActAs right for that party, then persists or deactivates the registration.
Tokens, user IDs, balances, requests, rates and positions are never persisted.
Browser wallets currently cannot register without the hosted-account authority
proof; they can read the directory and submit their own ledger requests.

Borrow uses all matching active registrations, excludes the borrower and requires
a separate unchecked sharing consent in the request review. It re-reads the list
before submission; a changed list requires a new review, and registry failures
block sending. The approved snapshot produces one private QuoteRequest per lender
in one ledger submission. Future registrations do not backfill old requests.
The lender must enter its APR and fund its own quote; sending an RFQ no longer
invokes the public standing dealer's RequestFundedQuote. Registry eligibility
means opting into the same market, not verified liquidity or creditworthiness.

The funding request is therefore shared with all approved recipients, while each
quote and accepted position retain bilateral stakeholders. Registry operators
can see published lender metadata. Issuer and participant trust boundaries remain.

Deployment requires the server-only sensitive variable
`SYMBOLON_DIRECTORY_DATABASE_URL` and the migration in
`infra/lender-directory.sql`. Both root and web Vercel entry points delegate to
the same handler. Do not put the connection string in VITE variables or commit
it. The API response is no-store; SQL uses parameterized tagged templates.

The test suite covers participant-authorized ownership, foreign/read-only party
rejection, issuer/oracle scope, consent, stale-recipient rejection and RFQ-only
fan-out. These checks do not establish external borrower/dealer adoption.
