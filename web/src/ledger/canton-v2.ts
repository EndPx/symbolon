import { LedgerError, type Command, type Contract, type DisclosedContract, type Method, type SubmissionOptions } from "./api";

export type LedgerRequest = (method: Method, path: string, body?: unknown) => Promise<unknown>;
export type CommittedReceipt = {
  commandId: string; updateId: string; offset: number; synchronizerId: string;
  effectiveAt: string; recordTime: string; events: unknown[];
};
export type PendingCommand = {
  commandId: string; party: string; beginExclusive: number; synchronizerId: string;
  /** An executed wallet response is retained even when the subsequent ledger read fails. */
  updateId?: string;
};
export type PendingStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export class LedgerHttpError extends LedgerError {
  constructor(message: string, readonly status: number, readonly definite: boolean) { super(message); }
}
export class SubmissionUncertain extends LedgerError {
  constructor(readonly commandId: string) {
    super(`Command ${commandId} has not been confirmed. Check its ledger status before another submission.`);
    this.name = "SubmissionUncertain";
  }
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LedgerError("The participant returned an invalid object.");
  return value as Record<string, unknown>;
};
const nonempty = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const hash = (value: string) => /^[a-f0-9]{64}$/.test(value);

export function partyEventFormat(party: string, includeBlob = false) {
  if (!nonempty(party)) throw new LedgerError("An authorized party is required.");
  return {
    filtersByParty: { [party]: { cumulative: [{ identifierFilter: {
      WildcardFilter: { value: { includeCreatedEventBlob: includeBlob } },
    } }] } }, verbose: false,
  };
}

export function decodeActiveContracts(value: unknown): Contract[] {
  if (!Array.isArray(value)) throw new LedgerError("The participant did not return a contract list.");
  return value.flatMap(row => {
    const entry = object(object(row).contractEntry);
    if (!entry.JsActiveContract) {
      if (entry.JsIncompleteAssigned || entry.JsIncompleteUnassigned) return [];
      throw new LedgerError("An unrecognized contract entry was returned.");
    }
    const active = object(entry.JsActiveContract);
    const event = object(active.createdEvent);
    if (!nonempty(event.contractId) || !nonempty(event.templateId)) throw new LedgerError("A contract is missing its identity.");
    return [{ contractId: event.contractId, templateId: event.templateId,
      payload: object(event.createArgument),
      ...(nonempty(event.createdEventBlob) ? { createdEventBlob: event.createdEventBlob } : {}),
      ...(nonempty(active.synchronizerId) ? { synchronizerId: active.synchronizerId } : {}) }];
  });
}

export function checkedReceipt(value: unknown, commandId: string, synchronizerId: string): CommittedReceipt {
  const tx = object(object(value).transaction);
  if (tx.commandId !== commandId || !nonempty(tx.updateId) || tx.synchronizerId !== synchronizerId
    || !Number.isSafeInteger(tx.offset) || Number(tx.offset) <= 0
    || !nonempty(tx.effectiveAt) || !Number.isFinite(Date.parse(tx.effectiveAt))
    || !nonempty(tx.recordTime) || !Number.isFinite(Date.parse(tx.recordTime)) || !Array.isArray(tx.events) || !tx.events.length) {
    throw new LedgerError("No matching committed transaction was returned. Check the original command before retrying.");
  }
  return tx as unknown as CommittedReceipt;
}

export class CantonV2Client {
  readonly party: string;
  lastReceipt: CommittedReceipt | null = null;
  private readonly request: LedgerRequest;
  private readonly packages: string[];
  private readonly synchronizerId: string;
  private readonly store?: PendingStore;
  private readonly storageKey: string;
  private pending: PendingCommand | null = null;
  private submitting = false;
  constructor(options: {
    party: string; request: LedgerRequest; corePackageId: string; publicPackageId?: string; openRfqPackageId?: string;
    synchronizerId: string; store?: PendingStore;
  }) {
    if (!nonempty(options.party) || !options.party.includes("::") || !nonempty(options.synchronizerId)
      || !hash(options.corePackageId) || options.publicPackageId && !hash(options.publicPackageId) || options.openRfqPackageId && !hash(options.openRfqPackageId)) {
      throw new LedgerError("The party, package and synchronizer must be configured before connecting.");
    }
    this.party = options.party; this.request = options.request;
    this.packages = [options.corePackageId, ...(options.publicPackageId ? [options.publicPackageId] : []), ...(options.openRfqPackageId ? [options.openRfqPackageId] : [])];
    this.synchronizerId = options.synchronizerId; this.store = options.store;
    this.storageKey = `symbolon.pending.v1.${options.party}`;
    try {
      const saved = JSON.parse(this.store?.getItem(this.storageKey) ?? "null");
      if (saved && saved.party === this.party && saved.synchronizerId === this.synchronizerId
        && nonempty(saved.commandId) && Number.isSafeInteger(saved.beginExclusive) && saved.beginExclusive >= 0
        && (saved.updateId === undefined || nonempty(saved.updateId))) this.pending = saved;
    } catch { /* Corrupt preferences cannot grant authority. */ }
  }
  pendingCommand() { return this.pending; }
  private savePending(value: PendingCommand | null) {
    this.pending = value;
    try { if (value) this.store?.setItem(this.storageKey, JSON.stringify(value)); else this.store?.removeItem(this.storageKey); }
    catch { /* The in-memory guard remains active when browser storage is unavailable. */ }
  }
  async preflight() {
    const version = object(await this.request("GET", "/v2/version"));
    if (typeof version.version !== "string" || !/^3\.(5|[6-9]|\d{2,})\./.test(version.version)) {
      throw new LedgerError("This desk requires a participant supporting Canton v3.5 event-format reads.");
    }
    const installed = object(await this.request("GET", "/v2/packages"));
    if (!Array.isArray(installed.packageIds) || this.packages.some(id => !(installed.packageIds as unknown[]).includes(id))) {
      throw new LedgerError("The Symbolon packages are not installed on this account's participant.");
    }
    const connected = object(await this.request("GET", `/v2/state/connected-synchronizers?party=${encodeURIComponent(this.party)}`));
    if (!Array.isArray(connected.connectedSynchronizers) || !connected.connectedSynchronizers.some(value => {
      const sync = object(value);
      return sync.synchronizerId === this.synchronizerId && sync.permission === "PARTICIPANT_PERMISSION_SUBMISSION";
    })) throw new LedgerError("This party has no submission access to the configured synchronizer.");
    return { version: version.version, synchronizerId: this.synchronizerId };
  }
  private async ledgerEnd() {
    const end = object(await this.request("GET", "/v2/state/ledger-end"));
    if (!Number.isSafeInteger(end.offset) || Number(end.offset) < 0) throw new LedgerError("A valid ledger offset was not returned.");
    return end.offset as number;
  }
  async read(): Promise<Contract[]> {
    const activeAtOffset = await this.ledgerEnd();
    return decodeActiveContracts(await this.request("POST", "/v2/state/active-contracts", {
      activeAtOffset, eventFormat: partyEventFormat(this.party, true),
    }));
  }
  private checkedCommands(commands: Command[]) {
    if (!commands.length) throw new LedgerError("At least one command is required.");
    return commands.map(command => {
      const copy = structuredClone(command);
      const body = "CreateCommand" in copy ? copy.CreateCommand : copy.ExerciseCommand;
      if (body.templateId.startsWith("#symbolon-v2:")) body.templateId = body.templateId.replace("#symbolon-v2:", `${this.packages[0]}:`);
      if (!this.packages.includes(body.templateId.split(":")[0])) {
        throw new LedgerError("Only the pinned Symbolon DevNet packages can be submitted through this connection.");
      }
      return copy;
    });
  }
  async submit(commands: Command[], options: SubmissionOptions = {}, nativeSubmit?: (payload: {
    commands: Command[]; commandId: string; actAs: string[]; readAs: string[];
    synchronizerId: string; packageIdSelectionPreference: string[]; disclosedContracts?: DisclosedContract[];
  }) => Promise<unknown>): Promise<string> {
    if (this.submitting) throw new LedgerError("Finish the current approval before another submission.");
    if (this.pending) throw new SubmissionUncertain(this.pending.commandId);
    if (options.synchronizerId && options.synchronizerId !== this.synchronizerId) throw new LedgerError("Cannot change the connected synchronizer.");
    const pinned = this.checkedCommands(commands);
    for (const disclosed of options.disclosedContracts ?? []) {
      if (!this.packages.includes(disclosed.templateId.split(":")[0]) || disclosed.synchronizerId !== this.synchronizerId) {
        throw new LedgerError("Disclosed contracts must use the pinned packages and synchronizer.");
      }
    }
    this.submitting = true;
    try {
      const beginExclusive = await this.ledgerEnd();
      const commandId = `symbolon-public-${crypto.randomUUID()}`;
      const payload = { commands: pinned, commandId, actAs: [this.party], readAs: [this.party],
        synchronizerId: this.synchronizerId, packageIdSelectionPreference: this.packages,
        ...(options.disclosedContracts?.length ? { disclosedContracts: options.disclosedContracts } : {}) };
      this.savePending({ commandId, party: this.party, beginExclusive, synchronizerId: this.synchronizerId });
      this.lastReceipt = null;
      try {
        let result;
        if (nativeSubmit) {
          const response = object(await nativeSubmit(payload));
          const tx = object(response.tx);
          const receipt = object(tx.payload);
          if (tx.commandId !== commandId || tx.status !== "executed" || !nonempty(receipt.updateId)
            || !Number.isSafeInteger(receipt.completionOffset) || Number(receipt.completionOffset) <= 0) {
            throw new LedgerError("The wallet did not return a matching executed command.");
          }
          this.savePending({ ...this.pending!, updateId: receipt.updateId });
          result = await this.transaction(receipt.updateId);
        } else result = await this.request("POST", "/v2/commands/submit-and-wait-for-transaction", {
          commands: payload, transactionFormat: { eventFormat: partyEventFormat(this.party, true),
            transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS" },
        });
        const confirmed = checkedReceipt(result, commandId, this.synchronizerId);
        const expectedUpdate = this.pendingCommand()?.updateId;
        if (expectedUpdate && confirmed.updateId !== expectedUpdate) throw new LedgerError("The ledger returned another transaction. Keep checking the original command.");
        this.lastReceipt = confirmed;
        this.savePending(null);
        return this.lastReceipt.updateId;
      } catch (error) {
        // A failed receipt lookup cannot reject a command the wallet already executed.
        if (!this.pendingCommand()?.updateId && ((error instanceof LedgerHttpError && error.definite)
          || (error as { code?: unknown })?.code === 4001)) {
          this.savePending(null); throw error;
        }
        throw new SubmissionUncertain(commandId);
      }
    } finally { this.submitting = false; }
  }
  private async transaction(updateId: string) {
    const result = object(await this.request("POST", "/v2/updates/update-by-id", {
      updateId, updateFormat: {includeTransactions: {eventFormat: partyEventFormat(this.party, true),
        transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS"}},
    }));
    const transaction = object(object(object(result.update).Transaction).value);
    return {transaction};
  }
  private async confirmPending(pending: PendingCommand & { updateId: string }) {
    const result = await this.transaction(pending.updateId);
    const receipt = checkedReceipt(result, pending.commandId, this.synchronizerId);
    if (receipt.updateId !== pending.updateId) throw new LedgerError("The ledger returned another transaction. Keep checking the original command.");
    this.lastReceipt = receipt;
    this.savePending(null);
    return { status: "committed" as const, updateId: receipt.updateId };
  }
  async reconcile(): Promise<{ status: "pending" | "committed" | "failed"; updateId?: string }> {
    if (!this.pending) return { status: "pending" };
    const pending = this.pending;
    if (pending.updateId) return this.confirmPending({ ...pending, updateId: pending.updateId });
    const rows = await this.request("POST", "/v2/commands/completions?limit=100&stream_idle_timeout_ms=2000", {
      parties: [this.party], beginExclusive: pending.beginExclusive,
    });
    if (!Array.isArray(rows)) throw new LedgerError("Command completions were not returned as a list.");
    for (const row of rows) {
      const response = object(row).completionResponse;
      if (!response || typeof response !== "object") continue;
      const variant = (response as Record<string, unknown>).Completion;
      if (!variant || typeof variant !== "object") continue;
      const completion = object(object(variant).value);
      if (completion.commandId !== pending.commandId) continue;
      if (!Array.isArray(completion.actAs) || !completion.actAs.includes(this.party)) throw new LedgerError("Completion belongs to another party.");
      if (nonempty(completion.updateId)) {
        const executed = { ...pending, updateId: completion.updateId };
        this.savePending(executed);
        return this.confirmPending(executed);
      }
      const status = completion.status as { code?: unknown } | undefined;
      if (status && Number.isInteger(status.code) && status.code !== 0) {
        this.savePending(null); return { status: "failed" };
      }
    }
    return { status: "pending" };
  }
}
