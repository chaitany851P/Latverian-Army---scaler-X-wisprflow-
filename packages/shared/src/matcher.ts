import Fuse from "fuse.js";
import {
  STARTER_CATALOG,
  STARTER_CUSTOMERS,
  getCatalogForPreset,
  type SeedCustomer,
  type SeedSku
} from "./catalog-seed.js";
import type { StorePreset, TransactionDraft } from "./contracts.js";
import { rupeesToPaise, splitMrpInclusiveTax } from "./money.js";

const NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  paanch: 5,
  pao: 0.25,
  pav: 0.25,
  aadha: 0.5,
  adha: 0.5,
  half: 0.5,
  dedh: 1.5,
  sava: 1.25,
  savva: 1.25,
  dhai: 2.5
};

export interface SandboxParseResult {
  draft: TransactionDraft;
  subtotalPaise: number;
  taxPaise: number;
  candidateCustomers: SeedCustomer[];
  candidateSkus: SeedSku[];
  warnings: string[];
}

function normalizeHindiNumbers(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((tok) => (NUMBER_WORDS[tok] !== undefined ? String(NUMBER_WORDS[tok]) : tok))
    .join(" ");
}

export function fuzzyMatchSkus(query: string, preset?: StorePreset, limit = 5): SeedSku[] {
  const catalog = preset ? getCatalogForPreset(preset) : STARTER_CATALOG;
  const fuse = new Fuse(catalog, {
    keys: ["canonicalName", "aliases"],
    threshold: 0.42,
    includeScore: true
  });
  return fuse.search(query, { limit }).map((r) => r.item);
}

export function fuzzyMatchCustomers(query: string, limit = 5): SeedCustomer[] {
  const fuse = new Fuse(STARTER_CUSTOMERS, {
    keys: ["displayName", "aliases"],
    threshold: 0.4,
    includeScore: true
  });
  return fuse.search(query, { limit }).map((r) => r.item);
}

/**
 * Deterministic Hinglish/unit sandbox parser (zero-API fallback & human test bench engine).
 */
export function parseSandboxUtterance(
  rawTranscript: string,
  preset: StorePreset = "kirana"
): SandboxParseResult {
  const trimmed = rawTranscript.trim();
  const normalized = normalizeHindiNumbers(trimmed);
  const warnings: string[] = [];

  if (!trimmed) {
    return {
      draft: {
        intent: "QUERY",
        rawTranscript: "",
        items: [],
        paymentSplit: { cashPaise: 0, upiPaise: 0, udhaarPaise: 0 },
        needsConfirmation: true,
        ambiguousFields: ["empty_transcript"]
      },
      subtotalPaise: 0,
      taxPaise: 0,
      candidateCustomers: [],
      candidateSkus: [],
      warnings: ["Clear speech not detected. Speak an item or petty-cash command."]
    };
  }

  // 1. Detect correction intent
  if (/\b(nahi|hatao|cancel|galat)\b/i.test(normalized)) {
    return {
      draft: {
        intent: "CORRECTION",
        rawTranscript: trimmed,
        items: [],
        paymentSplit: { cashPaise: 0, upiPaise: 0, udhaarPaise: 0 },
        needsConfirmation: true,
        ambiguousFields: []
      },
      subtotalPaise: 0,
      taxPaise: 0,
      candidateCustomers: [],
      candidateSkus: [],
      warnings: ["Correction intent detected: patches active Draft Card in place."]
    };
  }

  // 2. Detect petty-cash expense ("chhota kharcha")
  if (/\b(kharcha|chai|auto|transport|bhada|bijli)\b/i.test(normalized)) {
    const amtMatch = normalized.match(/\b(\d+(?:\.\d+)?)\b/);
    const cashPaise = amtMatch ? rupeesToPaise(Number(amtMatch[1])) : 0;
    return {
      draft: {
        intent: "EXPENSE",
        rawTranscript: trimmed,
        items: [],
        paymentSplit: { cashPaise, upiPaise: 0, udhaarPaise: 0 },
        needsConfirmation: true,
        ambiguousFields: cashPaise === 0 ? ["expense_amount"] : []
      },
      subtotalPaise: cashPaise,
      taxPaise: 0,
      candidateCustomers: [],
      candidateSkus: [],
      warnings: cashPaise === 0 ? ["Could not detect expense rupee amount."] : []
    };
  }

  // 3. Detect customer matches
  const candidateCustomers: SeedCustomer[] = [];
  for (const cust of STARTER_CUSTOMERS) {
    if (cust.aliases.some((alias) => normalized.includes(alias))) {
      candidateCustomers.push(cust);
    }
  }
  const uniqueCustomers = Array.from(new Map(candidateCustomers.map((c) => [c.customerId, c])).values());

  // 4. Split clauses on Hindi/English connectors so phrases don't absorb "aur"/"diya"
  const catalog = getCatalogForPreset(preset);
  const items: TransactionDraft["items"] = [];
  const candidateSkus: SeedSku[] = [];
  const clauses = normalized
    .replace(/\b(aur|and|plus)\b/gi, ",")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const itemPattern = /(\d+(?:\.\d+)?)\s*(?:kg|kilo|g|gram|l|litre|liter|pack|packet|pcs)?\s+([a-z]+(?:\s+[a-z]+)?)/gi;

  for (const clause of clauses) {
    for (const match of clause.matchAll(itemPattern)) {
      const rawQty = Number(match[1]);
      const phrase = (match[2] ?? "").trim();
      if (!Number.isFinite(rawQty) || rawQty <= 0 || /\b(rupaye|rs|jama|cash|upi|baaki|mahine)\b/i.test(phrase)) {
        continue;
      }
      const matches = fuzzyMatchSkus(phrase, preset, 2);
      const best = matches[0];
      if (!best) {
        continue;
      }
      for (const m of matches) {
        if (!candidateSkus.some((s) => s.skuId === m.skuId)) {
          candidateSkus.push(m);
        }
      }
      const multiplier = best.skuType === "loose" ? best.baseMultiplier : 1;
      const quantityBase = Math.max(1, Math.round(rawQty * multiplier));
      const lineTotalPaise = Math.round(rawQty * best.sellPricePaise);
      items.push({
        skuId: best.skuId,
        canonicalName: best.canonicalName,
        quantityBase,
        unitLabel: best.unitLabel,
        unitPricePaise: best.sellPricePaise,
        lineTotalPaise,
        confidence: 0.9
      });
    }
  }

  // Fallback: match direct SKU aliases without explicit leading number (defaults qty = 1)
  if (items.length === 0) {
    for (const sku of catalog) {
      if (sku.aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(normalized))) {
        items.push({
          skuId: sku.skuId,
          canonicalName: sku.canonicalName,
          quantityBase: sku.skuType === "loose" ? sku.baseMultiplier : 1,
          unitLabel: sku.unitLabel,
          unitPricePaise: sku.sellPricePaise,
          lineTotalPaise: sku.sellPricePaise,
          confidence: 0.72
        });
        candidateSkus.push(sku);
      }
    }
  }

  const subtotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const taxPaise = items.reduce((sum, item) => {
    const sku = catalog.find((s) => s.skuId === item.skuId);
    const gst = sku?.gstPercent ?? 0;
    return sum + splitMrpInclusiveTax(item.lineTotalPaise, gst).taxPaise;
  }, 0);

  // 5. Parse payment split (Cash / UPI / Udhaar remaining)
  const upiMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:rupaye\s*)?upi\b/i);
  const cashMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:rupaye\s*)?(?:cash|jama|diya)\b/i);
  const upiPaise = upiMatch ? rupeesToPaise(Number(upiMatch[1])) : 0;
  let cashPaise = cashMatch && !upiMatch ? rupeesToPaise(Number(cashMatch[1])) : 0;
  if (cashMatch && upiMatch) {
    cashPaise = rupeesToPaise(Number(cashMatch[1]));
  }
  const paidPaise = cashPaise + upiPaise;
  const udhaarPaise =
    paidPaise === 0 && /\b(baaki|udhaar|khate|credit)\b/i.test(normalized)
      ? subtotalPaise
      : Math.max(0, subtotalPaise - paidPaise);

  if (paidPaise === 0 && udhaarPaise === 0 && subtotalPaise > 0) {
    cashPaise = subtotalPaise;
  }

  const ambiguousFields: string[] = [];
  if (uniqueCustomers.length > 1) {
    ambiguousFields.push("customerId");
    warnings.push(`Multiple customers matched (${uniqueCustomers.map((c) => c.displayName).join(" vs ")})`);
  }
  if (items.length === 0) {
    ambiguousFields.push("items");
    warnings.push("No catalog SKU matched; select an item or retry.");
  }

  const matchedCustomer = uniqueCustomers.length === 1 ? uniqueCustomers[0] : undefined;
  if (matchedCustomer && matchedCustomer.riskTier === "RED" && udhaarPaise > 0) {
    warnings.push(`Credit warning: ${matchedCustomer.displayName} is RED tier (overdue balance).`);
  }

  return {
    draft: {
      intent: "SALE",
      rawTranscript: trimmed,
      ...(matchedCustomer ? { customerId: matchedCustomer.customerId, customerName: matchedCustomer.displayName } : {}),
      items,
      paymentSplit: { cashPaise, upiPaise, udhaarPaise },
      needsConfirmation: true,
      ambiguousFields
    },
    subtotalPaise,
    taxPaise,
    candidateCustomers: uniqueCustomers,
    candidateSkus,
    warnings
  };
}
