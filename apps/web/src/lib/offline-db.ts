import Dexie, { type Table } from "dexie";

export interface OfflinePendingDraft {
  id?: number;
  idempotencyKey: string;
  rawTranscript: string;
  createdAt: string;
  synced: number;
}

export class OfflineCounterDb extends Dexie {
  pendingDrafts!: Table<OfflinePendingDraft, number>;

  constructor() {
    super("voicekhata_offline");
    this.version(1).stores({
      pendingDrafts: "++id, idempotencyKey, synced, createdAt"
    });
  }
}

export const offlineCounterDb = new OfflineCounterDb();
