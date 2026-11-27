import Fuse from "fuse.js";
import {
  STARTER_CATALOG,
  STARTER_CUSTOMERS,
  getCatalogForPreset,
  type SeedCustomer,
  type SeedSku
} from "./catalog-seed.js";
import type { StorePreset, TransactionDraft } from "./contracts.js";
import { transliterateIndicToLatin } from "./indic.js";
import { formatPaiseAsRupees, rupeesToPaise, splitMrpInclusiveTax } from "./money.js";

const NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  ik: 1,
  ondu: 1,
  onnu: 1,
  okati: 1,
  do: 2,
  be: 2,
  don: 2,
  rendu: 2,
  eradu: 2,
  randu: 2,
  dui: 2,
  teen: 3,
  tin: 3,
  tran: 3,
  moonu: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  pao: 0.25,
  pav: 0.25,
  paav: 0.25,
  aadha: 0.5,
  adha: 0.5,
  ardha: 0.5,
  ara: 0.5,
  half: 0.5,
  dedh: 1.5,
  dodh: 1.5,
  sava: 1.25,
  savva: 1.25,
  dhai: 2.5,
  adhi: 2.5
};

const UNIT_PATTERN =
  "(?:kg|keji|kilo|g|gram|graam|l|litre|liter|litar|pack|packet|paiket|pcs|piece|nag)";
const CURRENCY_PATTERN =
  "(?:rupaye|rupae|rupay|rupai|rupe|rupee|rupees|rupaya|rupiya|rupaiya|rupayalu|rupayi|rubay|roobai|roopa|rupa|taka|rs)";

export interface SandboxParseResult {
  draft: TransactionDraft;
  normalizedTranscript: string;
  englishSummary: string;
  subtotalPaise: number;
  taxPaise: number;
  candidateCustomers: SeedCustomer[];
  candidateSkus: SeedSku[];
  warnings: string[];
}

function normalizeMultilingualNumbers(input: string): string {
  const latinized = transliterateIndicToLatin(input);
  return latinized
    .split(/\s+/)
    .map((tok) => (NUMBER_WORDS[tok] !== undefined ? String(NUMBER_WORDS[tok]) : tok))
    .join(" ");
}

export function fuzzyMatchSkus(query: string, preset?: StorePreset, limit = 5): SeedSku[] {
  const catalog = preset ? getCatalogForPreset(preset) : STARTER_CATALOG;
  const fuse = new Fuse(catalog, {
    keys: ["canonicalName", "aliases"],
    threshold: 0.45,
    includeScore: true
  });
  return fuse.search(transliterateIndicToLatin(query), { limit }).map((r) => r.item);
}

export function fuzzyMatchCustomers(query: string, limit = 5): SeedCustomer[] {
  const fuse = new Fuse(STARTER_CUSTOMERS, {
    keys: ["displayName", "aliases"],
    threshold: 0.42,
    includeScore: true
  });
  return fuse.search(transliterateIndicToLatin(query), { limit }).map((r) => r.item);
}

function buildEnglishSummary(draft: TransactionDraft, subtotalPaise: number): string {
  if (draft.intent === "EXPENSE") {
    return `Drawer Cash Expense: ₹${formatPaiseAsRupees(draft.paymentSplit.cashPaise)}`;
  }
  if (draft.intent === "CORRECTION") {
    return "Draft Edit: Update or remove items in active cart";
  }
  if (draft.items.length === 0) {
    return "No billable items recognized yet";
  }
  const itemsStr = draft.items
    .map((i) => `${i.canonicalName} (${i.quantityBase} ${i.unitLabel === "kg" ? "g" : i.unitLabel})`)
    .join(", ");
  const party = draft.customerName ? ` for ${draft.customerName}` : "";
  return `Bill${party}: ${itemsStr} | Total ₹${formatPaiseAsRupees(subtotalPaise)} (Udhaar ₹${formatPaiseAsRupees(draft.paymentSplit.udhaarPaise)})`;
}

/**
 * Deterministic multilingual/code-mixed parser supporting Devanagari, Gujarati,
 * Gurmukhi, Tamil, Telugu, Malayalam, Bengali, Kannada, and Hinglish.
 */
export function parseSandboxUtterance(
  rawTranscript: string,
  preset: StorePreset = "kirana"
): SandboxParseResult {
  const trimmed = rawTranscript.trim();
  const normalized = normalizeMultilingualNumbers(trimmed);
  const warnings: string[] = [];

  if (!trimmed) {
    const emptyDraft: TransactionDraft = {
      intent: "QUERY",
      rawTranscript: "",
      items: [],
      paymentSplit: { cashPaise: 0, upiPaise: 0, udhaarPaise: 0 },
      needsConfirmation: true,
      ambiguousFields: ["empty_transcript"]
    };
    return {
      draft: emptyDraft,
      normalizedTranscript: "",
      englishSummary: "Awaiting voice input",
      subtotalPaise: 0,
      taxPaise: 0,
      candidateCustomers: [],
      candidateSkus: [],
      warnings: ["Clear speech not detected. Speak an item or petty-cash command."]
    };
  }

  // 1. Detect correction intent
  if (/\b(nahi|nahin|nako|hatao|cancel|galat|mat)\b/i.test(normalized)) {
    const draft: TransactionDraft = {
      intent: "CORRECTION",
      rawTranscript: trimmed,
      items: [],
      paymentSplit: { cashPaise: 0, upiPaise: 0, udhaarPaise: 0 },
      needsConfirmation: true,
      ambiguousFields: []
    };
    return {
      draft,
      normalizedTranscript: normalized,
      englishSummary: buildEnglishSummary(draft, 0),
      subtotalPaise: 0,
      taxPaise: 0,
      candidateCustomers: [],
      candidateSkus: [],
      warnings: ["Correction intent detected: patches active Draft Card in place."]
    };
  }

  // 2. Detect petty-cash expense ("chhota kharcha")
  if (/\b(kharcha|kharch|chai|auto|transport|bhada|bijli)\b/i.test(normalized)) {
    const amtMatch = normalized.match(/\b(\d+(?:\.\d+)?)\b/);
    const cashPaise = amtMatch ? rupeesToPaise(Number(amtMatch[1])) : 0;
    const draft: TransactionDraft = {
      intent: "EXPENSE",
      rawTranscript: trimmed,
      items: [],
      paymentSplit: { cashPaise, upiPaise: 0, udhaarPaise: 0 },
      needsConfirmation: true,
      ambiguousFields: cashPaise === 0 ? ["expense_amount"] : []
    };
    return {
      draft,
      normalizedTranscript: normalized,
      englishSummary: buildEnglishSummary(draft, cashPaise),
      subtotalPaise: cashPaise,
      taxPaise: 0,
      candidateCustomers: [],
      candidateSkus: [],
      warnings: cashPaise === 0 ? ["Could not detect expense rupee amount."] : []
    };
  }

  // 3. Detect customer matches (checks phonetic aliases + fuzzy fallback)
  const candidateCustomers: SeedCustomer[] = [];
  for (const cust of STARTER_CUSTOMERS) {
    if (cust.aliases.some((alias) => normalized.includes(alias))) {
      candidateCustomers.push(cust);
    }
  }
  const uniqueCustomers = Array.from(new Map(candidateCustomers.map((c) => [c.customerId, c])).values());

  // 4. Parse item clauses + optional inline spoken unit price (e.g. "2 kilo khan 20 rupaye kilo")
  const catalog = getCatalogForPreset(preset);
  const items: TransactionDraft["items"] = [];
  const candidateSkus: SeedSku[] = [];

  const clauses = normalized
    .replace(/\b(aur|ane|ani|te|and|plus|mattu|aurr|or)\b/gi, ",")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const itemWithOptionalPriceRegex = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${UNIT_PATTERN}?\\s+([a-z]+(?:\\s+[a-z]+)?)(?:\\s+(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_PATTERN}(?:\\s+${UNIT_PATTERN})?)?`,
    "gi"
  );

  for (const clause of clauses) {
    for (const match of clause.matchAll(itemWithOptionalPriceRegex)) {
      const rawQty = Number(match[1]);
      const rawPhrase = (match[2] ?? "").trim();
      const spokenPriceRupees = match[3] ? Number(match[3]) : null;

      if (
        !Number.isFinite(rawQty) ||
        rawQty <= 0 ||
        /^(rupaye|rupay|rupai|rupe|rs|jama|cash|upi|baaki|baki|mahine|khate|khata|udhar|udhaar)/i.test(
          rawPhrase
        )
      ) {
        continue;
      }

      // Clean trailing stop-words from item phrase
      const cleanPhrase = rawPhrase
        .replace(/\b(bhai|ji|na|ke|ka|ki|ko|no|ni|nu|la|k|mein|me|ma|madhye|nu|ta)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleanPhrase) {
        continue;
      }

      const matches = fuzzyMatchSkus(cleanPhrase, preset, 2);
      const best = matches[0];

      if (best) {
        for (const m of matches) {
          if (!candidateSkus.some((s) => s.skuId === m.skuId)) {
            candidateSkus.push(m);
          }
        }
        const unitPricePaise =
          spokenPriceRupees !== null && Number.isFinite(spokenPriceRupees) && spokenPriceRupees > 0
            ? rupeesToPaise(spokenPriceRupees)
            : best.sellPricePaise;
        const multiplier = best.skuType === "loose" ? best.baseMultiplier : 1;
        const quantityBase = Math.max(1, Math.round(rawQty * multiplier));
        const lineTotalPaise = Math.round(rawQty * unitPricePaise);
        items.push({
          skuId: best.skuId,
          canonicalName: best.canonicalName,
          quantityBase,
          unitLabel: best.unitLabel,
          unitPricePaise,
          lineTotalPaise,
          confidence: spokenPriceRupees ? 0.92 : 0.88
        });
      } else if (spokenPriceRupees !== null && Number.isFinite(spokenPriceRupees) && spokenPriceRupees > 0) {
        // Preserve spoken ad-hoc item when user explicitly stated unit price
        const unitPricePaise = rupeesToPaise(spokenPriceRupees);
        const lineTotalPaise = Math.round(rawQty * unitPricePaise);
        items.push({
          skuId: `ADHOC_${cleanPhrase.toUpperCase().replace(/\s+/g, "_")}`,
          canonicalName: `${cleanPhrase} (Unlisted)`,
          quantityBase: Math.max(1, Math.round(rawQty * 1000)),
          unitLabel: "unit",
          unitPricePaise,
          lineTotalPaise,
          confidence: 0.55
        });
        warnings.push(`Unlisted item "${cleanPhrase}" priced from speech at ₹${formatPaiseAsRupees(unitPricePaise)}.`);
      }
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

  // 5. Parse payment split (Cash / UPI / Udhaar or Khata)
  const upiMatch = normalized.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_PATTERN}\\s*)?upi\\b`, "i"));
  const cashMatch = normalized.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_PATTERN}\\s*)?(?:cash|jama|diya|nakad|rokda|dile)\\b`, "i")
  );
  const upiPaise = upiMatch ? rupeesToPaise(Number(upiMatch[1])) : 0;
  let cashPaise = cashMatch ? rupeesToPaise(Number(cashMatch[1])) : 0;

  const paidPaise = cashPaise + upiPaise;
  const hasCreditKeyword = /\b(baaki|baki|udhaar|udhar|khate|khata|khatu|credit)\b/i.test(normalized);
  const udhaarPaise =
    paidPaise === 0 && hasCreditKeyword
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
    warnings.push("No catalog SKU matched; select an item or include spoken price.");
  }

  const matchedCustomer = uniqueCustomers.length === 1 ? uniqueCustomers[0] : undefined;
  if (matchedCustomer && matchedCustomer.riskTier === "RED" && udhaarPaise > 0) {
    warnings.push(`Credit warning: ${matchedCustomer.displayName} is RED tier (overdue balance).`);
  }

  const draft: TransactionDraft = {
    intent: "SALE",
    rawTranscript: trimmed,
    ...(matchedCustomer ? { customerId: matchedCustomer.customerId, customerName: matchedCustomer.displayName } : {}),
    items,
    paymentSplit: { cashPaise, upiPaise, udhaarPaise },
    needsConfirmation: true,
    ambiguousFields
  };

  return {
    draft,
    normalizedTranscript: normalized,
    englishSummary: buildEnglishSummary(draft, subtotalPaise),
    subtotalPaise,
    taxPaise,
    candidateCustomers: uniqueCustomers,
    candidateSkus,
    warnings
  };
}
