import { formatPaiseAsRupees, type StorePreset, type TransactionDraft } from "@voicekhata/shared";

export interface GeneratedBill {
  billNumber: string;
  issuedAtIso: string;
  issuedAtLabel: string;
  dueDateIso: string;
  dueDateLabel: string;
  preset: StorePreset;
  customerName: string;
  intent: TransactionDraft["intent"];
  currentBillPaise: number;
  taxPaise: number;
  previousBalancePaise: number;
  totalPayablePaise: number;
  cashPaidPaise: number;
  upiPaidPaise: number;
  paidNowPaise: number;
  netRemainingPaise: number;
  changeReturnPaise: number;
  items: TransactionDraft["items"];
  rawTranscript: string;
  englishSummary: string;
  plainTextReceipt: string;
}

export function createBillNumber(date = new Date()): string {
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VK-${y}${m}${d}-${rand}`;
}

export function getMonthEndIsoDate(date = new Date()): string {
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const yyyy = endOfMonth.getFullYear();
  const mm = String(endOfMonth.getMonth() + 1).padStart(2, "0");
  const dd = String(endOfMonth.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDueDateLabel(dueDateIso: string): string {
  const parsed = new Date(`${dueDateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dueDateIso;
  }
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function buildGeneratedBill(params: {
  billNumber?: string;
  issuedAtIso?: string;
  dueDateIso?: string;
  preset: StorePreset;
  customerName?: string;
  previousBalancePaise?: number;
  subtotalPaise: number;
  taxPaise: number;
  englishSummary: string;
  draft: TransactionDraft;
}): GeneratedBill {
  const issuedDate = params.issuedAtIso ? new Date(params.issuedAtIso) : new Date();
  const billNumber = params.billNumber ?? createBillNumber(issuedDate);
  const previousBalancePaise = Math.max(0, params.previousBalancePaise ?? 0);
  const isSettlementOnly = params.draft.intent === "PAYMENT";
  const currentBillPaise = isSettlementOnly ? 0 : Math.max(0, params.subtotalPaise);
  const totalPayablePaise = currentBillPaise + previousBalancePaise;

  const cashPaidPaise = params.draft.paymentSplit.cashPaise;
  const upiPaidPaise = params.draft.paymentSplit.upiPaise;
  const paidNowPaise = cashPaidPaise + upiPaidPaise;
  const netRemainingPaise = Math.max(0, totalPayablePaise - paidNowPaise);
  const changeReturnPaise = Math.max(0, paidNowPaise - totalPayablePaise);

  const issuedAtLabel = issuedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const dueDateIso = params.dueDateIso ?? getMonthEndIsoDate(issuedDate);
  const dueDateLabel = formatDueDateLabel(dueDateIso);
  const customerName = params.customerName ?? "Walk-in Customer";

  const lines: string[] = [
    `VoiceKhata Retail Bill (${params.preset.toUpperCase()})`,
    `Bill No: ${billNumber} | ${issuedAtLabel}`,
    `Customer: ${customerName}`,
    "----------------------------------------"
  ];

  if (params.draft.items.length > 0) {
    for (const item of params.draft.items) {
      const qtyDisplay =
        item.unitLabel === "kg" || item.unitLabel === "g"
          ? `${item.quantityBase}g`
          : `${item.quantityBase} ${item.unitLabel}`;
      lines.push(
        `${item.canonicalName} (${qtyDisplay} @ ₹${formatPaiseAsRupees(item.unitPricePaise)}) = ₹${formatPaiseAsRupees(item.lineTotalPaise)}`
      );
    }
  } else {
    lines.push(`Entry: ${params.englishSummary}`);
  }

  lines.push(
    "----------------------------------------",
    `Current Bill (MRP Incl.): ₹${formatPaiseAsRupees(currentBillPaise)}`,
    `Included GST: ₹${formatPaiseAsRupees(params.taxPaise)}`,
    `Previous Udhaar: ₹${formatPaiseAsRupees(previousBalancePaise)}`,
    `Total Payable: ₹${formatPaiseAsRupees(totalPayablePaise)}`,
    `Paid Now (Cash ₹${formatPaiseAsRupees(cashPaidPaise)} + UPI ₹${formatPaiseAsRupees(upiPaidPaise)}): ₹${formatPaiseAsRupees(paidNowPaise)}`,
    `Net Remaining Udhaar: ₹${formatPaiseAsRupees(netRemainingPaise)}${netRemainingPaise > 0 ? ` (Due: ${dueDateLabel})` : ""}`
  );

  if (changeReturnPaise > 0) {
    lines.push(`Change / Advance Credit: ₹${formatPaiseAsRupees(changeReturnPaise)}`);
  }

  return {
    billNumber,
    issuedAtIso: issuedDate.toISOString(),
    issuedAtLabel,
    dueDateIso,
    dueDateLabel,
    preset: params.preset,
    customerName,
    intent: params.draft.intent,
    currentBillPaise,
    taxPaise: params.taxPaise,
    previousBalancePaise,
    totalPayablePaise,
    cashPaidPaise,
    upiPaidPaise,
    paidNowPaise,
    netRemainingPaise,
    changeReturnPaise,
    items: params.draft.items,
    rawTranscript: params.draft.rawTranscript,
    englishSummary: params.englishSummary,
    plainTextReceipt: lines.join("\n")
  };
}
