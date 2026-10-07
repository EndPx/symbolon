import assert from "node:assert/strict";

export const DEVNET_ORIGIN = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services";
export const PACKAGES = Object.freeze({
  core: "1d40e972b56e42c279140639d33dc362b432f2c0f608c77ec36410f0395f3e19",
  adapter: "a7753f8a6453637d169143673c9299a36c4228f0a551fe633b82fd51ec7c69a0",
  governance: "361d1f2857f833f8094caf86ecdd5daaa3e2075c22dafe2bf18cde63ee98d488",
  action: "48acd500fc0bc9e4f00d52270122a104a68157f6d5561328f059f5eb6a63fd61",
});
export const PROOF_ROLES = Object.freeze(["governance", "proposer", "confirmer", "executor", "issuer", "borrower", "dealer"]);

export function preparedRoles(profile, rights) {
  assert.match(profile.namespace ?? "", /^[a-f0-9]{8}-$/, "Reviewed Console namespace required");
  assert.match(profile.roleBatch ?? "", /^[a-f0-9]{8}$/, "Prepare a fresh seven-role batch in the Console first");
  const suffix = profile.participantId?.split("::")[1];
  assert.match(suffix ?? "", /^1220[a-f0-9]{64}$/, "Reviewed participant namespace required");
  const actors = new Set(rights.map(right => right.kind?.CanActAs?.value?.party).filter(Boolean));
  const roles = {};
  for (const role of PROOF_ROLES) {
    const expected = `${profile.namespace}symbolon-proof-${profile.roleBatch}-${role}::${suffix}`;
    assert.equal(profile.roles?.[role], expected, `Console party mapping missing or outside this proof batch: ${role}`);
    assert.ok(actors.has(expected), `Console must grant can-act-as for ${role} before execution`);
    roles[role] = expected;
  }
  assert.equal(new Set(Object.values(roles)).size, PROOF_ROLES.length, "Distinct proof roles required");
  return roles;
}

export function reviewedOrigin(value = DEVNET_ORIGIN) {
  const url = new URL(value);
  assert.equal(url.origin, DEVNET_ORIGIN, "Only the reviewed shared DevNet origin is allowed");
  assert.ok(url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password,
    "The origin cannot include a path, credentials, query, or fragment");
  return url.origin;
}

export function redact(value, token = "") {
  let text = String(value);
  if (token) text = text.replaceAll(token, "[redacted]");
  return text.replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted JWT]");
}

export function tokenSubject(token) {
  assert.ok(typeof token === "string" && !/[\r\n]/.test(token), "A single-line access token is required");
  let payload;
  try { payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()); }
  catch { throw new Error("Expected a Keycloak access token; no token value is logged"); }
  assert.equal(payload.iss, "https://keycloak.naas.noders.services/realms/noders-appsfactory", "Wrong token issuer");
  assert.notEqual(payload.typ, "ID", "Use access_token, not id_token");
  assert.ok(typeof payload.sub === "string" && payload.sub.length > 0, "Token has no ledger user subject");
  assert.ok(Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now() + 90000,
    "Refresh the access token before starting the proof");
  return payload.sub;
}

export function eventFormat(parties) {
  assert.ok(parties.length && parties.every(p => typeof p === "string" && p), "Scoped party filters required");
  return {
    filtersByParty: Object.fromEntries([...new Set(parties)].map(p => [p, {
      cumulative: [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }],
    }])), verbose: false,
  };
}

export function pinCommands(commands) {
  return commands.map(command => {
    const copy = structuredClone(command);
    const body = copy.CreateCommand ?? copy.ExerciseCommand;
    assert.ok(body && typeof body.templateId === "string", "Create/exercise commands only");
    if (body.templateId.startsWith("#symbolon-v2:")) body.templateId = body.templateId.replace("#symbolon-v2:", PACKAGES.core + ":");
    assert.ok(Object.values(PACKAGES).includes(body.templateId.split(":")[0]),
      "Only reviewed Symbolon demo and BitSafe packages are allowed; no real-token commands");
    return copy;
  });
}

export function committedTransaction(response, commandId, synchronizerId) {
  const tx = response?.transaction;
  assert.ok(tx && typeof tx.updateId === "string" && tx.updateId, "No committed update ID returned");
  assert.equal(tx.commandId, commandId, "Receipt does not match the original command");
  assert.equal(tx.synchronizerId, synchronizerId, "Receipt belongs to another synchronizer");
  assert.ok(Number.isSafeInteger(tx.offset) && tx.offset > 0, "Receipt has no valid ledger offset");
  assert.ok(Number.isFinite(Date.parse(tx.recordTime)) && Number.isFinite(Date.parse(tx.effectiveAt)),
    "Receipt has no ledger timestamps");
  assert.ok(Array.isArray(tx.events), "Receipt has no event list");
  return tx;
}

export function exerciseResult(tx, choice) {
  const event = tx.events.map(e => e.ExercisedEvent).find(e => e?.choice === choice);
  assert.ok(event?.exerciseResult, `Missing ledger exercise result for ${choice}`);
  return event.exerciseResult;
}
