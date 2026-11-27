import type { SandboxParseResult, SeedCustomer, StorePreset, TransactionDraft } from "@voicekhata/shared";
import Dexie, { type Table } from "dexie";

export interface OfflinePendingDraft {
  id?: number;
  idempotencyKey: string;
  rawTranscript: string;
  createdAt: string;
  synced: number;
  preset?: StorePreset;
  customerName?: string;
  previousBalancePaise?: number;
  englishSummary?: string;
  subtotalPaise?: number;
  taxPaise?: number;
  dueDateIso?: string;
  billNumber?: string;
  draft?: TransactionDraft;
}

export interface HoldCartState {
  id: string;
  label: string;
  transcript: string;
  parsed: SandboxParseResult | null;
  selectedCustomer: SeedCustomer | null;
  dueDateIso: string;
  source: "api" | "browser" | null;
}

export interface OfflineHoldCartWorkspace {
  id: string;
  preset: StorePreset;
  activeCartId: string;
  carts: HoldCartState[];
  updatedAt: string;
}

export class OfflineCounterDb extends Dexie {
  pendingDrafts!: Table<OfflinePendingDraft, number>;
  holdCarts!: Table<OfflineHoldCartWorkspace, string>;

  constructor() {
    super("voicekhata_offline");
    this.version(1).stores({
      pendingDrafts: "++id, idempotencyKey, synced, createdAt"
    });
    this.version(2).stores({
      pendingDrafts: "++id, idempotencyKey, synced, createdAt, billNumber"
    });
    this.version(3).stores({
      pendingDrafts: "++id, idempotencyKey, synced, createdAt, billNumber",
      holdCarts: "id, updatedAt"
    });
  }
}

export const offlineCounterDb = new OfflineCounterDb();
