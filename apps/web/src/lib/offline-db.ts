import type { StorePreset, TransactionDraft } from "@voicekhata/shared";
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
  billNumber?: string;
  draft?: TransactionDraft;
}

export class OfflineCounterDb extends Dexie {
  pendingDrafts!: Table<OfflinePendingDraft, number>;

  constructor() {
    super("voicekhata_offline");
    this.version(1).stores({
      pendingDrafts: "++id, idempotencyKey, synced, createdAt"
    });
    this.version(2).stores({
      pendingDrafts: "++id, idempotencyKey, synced, createdAt, billNumber"
    });
  }
}

export const offlineCounterDb = new OfflineCounterDb();
