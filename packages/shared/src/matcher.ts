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
  chhah: 6,
  chha: 6,
  chhe: 6,
  saha: 6,
  aru: 6,
  aaru: 6,
  saat: 7,
  sat: 7,
  elu: 7,
  ezhu: 7,
  yedu: 7,
  aath: 8,
  ath: 8,
  ettu: 8,
  entu: 8,
  enimidi: 8,
  nau: 9,
  nav: 9,
  ombattu: 9,
  onbathu: 9,
  tommidi: 9,
  das: 10,
  dus: 10,
  daha: 10,
  hattu: 10,
  paththu: 10,
  pathu: 10,
  padi: 10,
  gyarah: 11,
  barah: 12,
  baarah: 12,
  bara: 12,
  pandrah: 15,
  pandra: 15,
  bees: 20,
  bis: 20,
  vis: 20,
  iruvai: 20,
  pachis: 25,
  pachchis: 25,
  pachhis: 25,
  pachas: 50,
  pachchas: 50,
  panas: 50,
  pannas: 50,
  sau: 100,
  shambhar: 100,
  nooru: 100,
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
  const normalizedQuery = transliterateIndicToLatin(query);
  if (!normalizedQuery) {
    return [];
  }

  // Exact alias match first so multi-word items like "chana dal" never get beaten by short partial fuzzy matches
  const exactMatches = catalog.filter(
    (sku) =>
      sku.canonicalName.toLowerCase() === normalizedQuery ||
      sku.aliases.some((alias) => alias.toLowerCase() === normalizedQuery)
  );
  if (exactMatches.length > 0) {
    return exactMatches.slice(0, limit);
  }

  const fuse = new Fuse(catalog, {
    keys: ["aliases", "canonicalName"],
    threshold: 0.28,
    ignoreLocation: true,
    minMatchCharLength: 3,
    includeScore: true
  });
  return fuse.search(normalizedQuery, { limit }).map((r) => r.item);
}

export function fuzzyMatchCustomers(query: string, limit = 5): SeedCustomer[] {
  const fuse = new Fuse(STARTER_CUSTOMERS, {
    keys: ["displayName", "aliases"],
    threshold: 0.42,
    includeScore: true
  });
  return fuse.search(transliterateIndicToLatin(query), { limit }).map((r) => r.item);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findItemAliasInNormalizedText(normalized: string, items: TransactionDraft["items"], catalog: SeedSku[]): number {
  const candidates = items
    .map((item, idx) => {
      const sku =
        catalog.find((s) => s.skuId === item.skuId) ??
        STARTER_CATALOG.find((s) => s.skuId === item.skuId);
      const terms = sku
        ? [...sku.aliases, sku.canonicalName.toLowerCase()]
        : [item.canonicalName.toLowerCase()];
      return { idx, terms };
    })
    .flatMap(({ idx, terms }) => terms.map((term) => ({ idx, term })))
    .sort((a, b) => b.term.length - a.term.length);

  for (const { idx, term } of candidates) {
    if (term && new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(normalized)) {
      return idx;
    }
  }
  return items.length - 1;
}

function applyCorrectionToActiveResult(
  rawTranscript: string,
  normalized: string,
  preset: StorePreset,
  activeResult: SandboxParseResult
): SandboxParseResult {
  const catalog = getCatalogForPreset(preset);
  const nextItems = activeResult.draft.items.map((item) => ({ ...item }));

  if (nextItems.length === 0) {
    const emptyCorrectionDraft: TransactionDraft = {
      intent: "CORRECTION",
      rawTranscript,
      ...(activeResult.draft.customerId ? { customerId: activeResult.draft.customerId } : {}),
      ...(activeResult.draft.customerName ? { customerName: activeResult.draft.customerName } : {}),
      items: [],
      paymentSplit: { cashPaise: 0, upiPaise: 0, udhaarPaise: 0 },
      needsConfirmation: true,
      ambiguousFields: ["items"]
    };
    return {
      ...activeResult,
      draft: emptyCorrectionDraft,
      normalizedTranscript: normalized,
      englishSummary: buildEnglishSummary(emptyCorrectionDraft, 0),
      subtotalPaise: 0,
      taxPaise: 0,
      warnings: ["No active cart items to update or remove."]
    };
  }

  const targetIdx = findItemAliasInNormalizedText(normalized, nextItems, catalog);
  const targetItem = nextItems[targetIdx];
  const nums = Array.from(normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g))
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
  const hasRemoveKeyword = /\b(hatao|hatado|hata|cancel|nikal|nikalo|remove|delete|mat)\b/i.test(normalized);
  const hasClearAllKeyword = /\b(sab|pura|poora|all|bill)\b/i.test(normalized) && hasRemoveKeyword;

  const warnings: string[] = [];
  if (hasClearAllKeyword) {
    nextItems.splice(0, nextItems.length);
    warnings.push("Cleared all items from active Draft Card.");
  } else if (hasRemoveKeyword || nums.length === 0) {
    const removed = nextItems.splice(targetIdx, 1)[0];
    warnings.push(
      removed
        ? `Removed ${removed.canonicalName} from active Draft Card.`
        : "Removed item from active Draft Card."
    );
  } else if (targetItem) {
    const spokenQty = nums[nums.length - 1] ?? 1;
    const targetSku =
      catalog.find((s) => s.skuId === targetItem.skuId) ??
      STARTER_CATALOG.find((s) => s.skuId === targetItem.skuId);
    const isGramsOnly =
      /\b(g|gram|graam)\b/i.test(normalized) && !/\b(kg|kilo|keji)\b/i.test(normalized);

    let nextQuantityBase: number;
    let effectiveBillingUnits: number;
    if (isGramsOnly && targetItem.unitLabel === "kg") {
      nextQuantityBase = Math.max(1, Math.round(spokenQty));
      effectiveBillingUnits = spokenQty / 1000;
    } else {
      const multiplier = targetSku
        ? targetSku.skuType === "loose"
          ? targetSku.baseMultiplier
          : 1
        : targetItem.unitLabel === "kg"
          ? 1000
          : 1;
      nextQuantityBase = Math.max(1, Math.round(spokenQty * multiplier));
      effectiveBillingUnits = spokenQty;
    }

    nextItems[targetIdx] = {
      ...targetItem,
      quantityBase: nextQuantityBase,
      lineTotalPaise: Math.max(0, Math.round(effectiveBillingUnits * targetItem.unitPricePaise))
    };
    warnings.push(`Updated ${targetItem.canonicalName} quantity in active Draft Card.`);
  }

  const nextSubtotalPaise = nextItems.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const nextTaxPaise = nextItems.reduce((sum, item) => {
    const sku =
      catalog.find((s) => s.skuId === item.skuId) ??
      STARTER_CATALOG.find((s) => s.skuId === item.skuId);
    return sum + splitMrpInclusiveTax(item.lineTotalPaise, sku?.gstPercent ?? 0).taxPaise;
  }, 0);

  const origCash = activeResult.draft.paymentSplit.cashPaise;
  const origUpi = activeResult.draft.paymentSplit.upiPaise;
  const origUdhaar = activeResult.draft.paymentSplit.udhaarPaise;
  const origPaid = origCash + origUpi;

  let nextCash = 0;
  let nextUpi = 0;
  let nextUdhaar = 0;
  if (nextSubtotalPaise > 0) {
    if (origPaid === 0) {
      nextUdhaar = nextSubtotalPaise;
    } else if (origUdhaar === 0 && origPaid >= activeResult.subtotalPaise) {
      if (origUpi > 0 && origCash === 0) {
        nextUpi = nextSubtotalPaise;
      } else if (origCash > 0 && origUpi === 0) {
        nextCash = nextSubtotalPaise;
      } else {
        nextCash = Math.min(origCash, nextSubtotalPaise);
        nextUpi = Math.max(0, nextSubtotalPaise - nextCash);
      }
    } else {
      nextCash = Math.min(origCash, nextSubtotalPaise);
      nextUpi = Math.min(origUpi, Math.max(0, nextSubtotalPaise - nextCash));
      nextUdhaar = Math.max(0, nextSubtotalPaise - nextCash - nextUpi);
    }
  }

  const ambiguousFields = activeResult.draft.ambiguousFields.filter((f) => f !== "items");
  if (nextItems.length === 0) {
    ambiguousFields.push("items");
  }

  if (!activeResult.draft.customerId && activeResult.candidateCustomers.length > 1) {
    if (!ambiguousFields.includes("customerId")) {
      ambiguousFields.push("customerId");
    }
    warnings.push(
      `Multiple customers matched (${activeResult.candidateCustomers.map((c) => c.displayName).join(" vs ")})`
    );
  }

  const resolvedCustomer = activeResult.draft.customerId
    ? activeResult.candidateCustomers.find((c) => c.customerId === activeResult.draft.customerId)
    : activeResult.candidateCustomers.length === 1
      ? activeResult.candidateCustomers[0]
      : undefined;
  if (resolvedCustomer && resolvedCustomer.riskTier === "RED" && nextUdhaar > 0) {
    warnings.push(`Credit warning: ${resolvedCustomer.displayName} is RED tier (overdue balance).`);
  }

  const patchedDraft: TransactionDraft = {
    intent: "CORRECTION",
    rawTranscript,
    ...(activeResult.draft.customerId ? { customerId: activeResult.draft.customerId } : {}),
    ...(activeResult.draft.customerName ? { customerName: activeResult.draft.customerName } : {}),
    items: nextItems,
    paymentSplit: { cashPaise: nextCash, upiPaise: nextUpi, udhaarPaise: nextUdhaar },
    needsConfirmation: true,
    ambiguousFields
  };

  return {
    ...activeResult,
    draft: patchedDraft,
    normalizedTranscript: normalized,
    englishSummary: buildEnglishSummary(patchedDraft, nextSubtotalPaise),
    subtotalPaise: nextSubtotalPaise,
    taxPaise: nextTaxPaise,
    warnings
  };
}

export function buildEnglishSummary(draft: TransactionDraft, subtotalPaise: number): string {
  if (draft.intent === "EXPENSE") {
    return `Drawer Cash Expense: ₹${formatPaiseAsRupees(draft.paymentSplit.cashPaise)}`;
  }
  if (draft.intent === "PAYMENT") {
    const paid = draft.paymentSplit.cashPaise + draft.paymentSplit.upiPaise;
    const party = draft.customerName ? ` from ${draft.customerName}` : "";
    return `Udhaar Settlement${party}: ₹${formatPaiseAsRupees(paid)} received`;
  }
  if (draft.intent === "CORRECTION" && draft.items.length === 0) {
    return "Draft Edit: Update or remove items in active cart";
  }
  if (draft.items.length === 0) {
    return "No billable items recognized yet";
  }
  const itemsStr = draft.items
    .map((i) => `${i.canonicalName} (${i.quantityBase} ${i.unitLabel === "kg" ? "g" : i.unitLabel})`)
    .join(", ");
  const party = draft.customerName ? ` for ${draft.customerName}` : "";
  const prefix = draft.intent === "CORRECTION" ? "Corrected Bill" : "Bill";
  return `${prefix}${party}: ${itemsStr} | Total ₹${formatPaiseAsRupees(subtotalPaise)} (Paid ₹${formatPaiseAsRupees(draft.paymentSplit.cashPaise + draft.paymentSplit.upiPaise)}, Udhaar ₹${formatPaiseAsRupees(draft.paymentSplit.udhaarPaise)})`;
}

/**
 * Deterministic multilingual/code-mixed parser supporting Devanagari, Gujarati,
 * Gurmukhi, Tamil, Telugu, Malayalam, Bengali, Kannada, and Hinglish.
 */
export function parseSandboxUtterance(
  rawTranscript: string,
  preset: StorePreset = "kirana",
  activeResult?: SandboxParseResult
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
  if (/\b(nahi|nahin|nako|hatao|hatado|cancel|galat|mat|remove|delete|nikal|nikalo)\b/i.test(normalized)) {
    if (activeResult && activeResult.draft.items.length > 0) {
      return applyCorrectionToActiveResult(trimmed, normalized, preset, activeResult);
    }
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

  // 2. Detect petty-cash expense ("chhota kharcha") — avoid capturing "chai patti" grocery sales
  const hasExplicitExpenseWord = /\b(kharcha|kharch|bhada|transport|bijli)\b/i.test(normalized);
  const hasChaiOrAutoExpense =
    /\b(chai|auto)\b/i.test(normalized) && !/\b(patti|pack|packet|kg|kilo|gram)\b/i.test(normalized);
  if (hasExplicitExpenseWord || hasChaiOrAutoExpense) {
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

  const paidOrUpiLookahead =
    "(?:cash|jama|diya|diye|de\\s+diya|mila|mile|nakad|nagaad|rokda|rokada|apya|aapya|didha|aavya|dile|dila|ditta|ditte|kuduthen|kodutha|icharu|koduthu|paid|upi|gpay|phonepe|paytm|online)";
  const itemWithOptionalPriceRegex = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${UNIT_PATTERN}?\\s+([a-z]+(?:\\s+[a-z]+)?)(?:\\s+(\\d+(?:\\.\\d+)?)\\s*${CURRENCY_PATTERN}(?!\\s+${paidOrUpiLookahead}\\b)(?:\\s+${UNIT_PATTERN})?)?`,
    "gi"
  );

  for (const clause of clauses) {
    let clauseMatched = false;
    let hasNonPositiveExplicitQty = false;
    for (const match of clause.matchAll(itemWithOptionalPriceRegex)) {
      const matchIndex = match.index ?? 0;
      const hasUnaryMinus = matchIndex > 0 && clause[matchIndex - 1] === "-";
      const rawQty = hasUnaryMinus ? -Number(match[1]) : Number(match[1]);
      const rawPhrase = (match[2] ?? "").trim();
      const spokenPriceRupees = match[3] ? Number(match[3]) : null;

      if (!Number.isFinite(rawQty) || rawQty <= 0) {
        hasNonPositiveExplicitQty = true;
        continue;
      }

      if (
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
        clauseMatched = true;
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
        clauseMatched = true;
      }
    }

    // Per-clause fallback when a clause names an SKU without a leading quantity (e.g. "2 kilo chawal aur doodh")
    const isPurePaymentClause = new RegExp(
      `^\\d+(?:\\.\\d+)?\\s*(?:${CURRENCY_PATTERN}|${paidOrUpiLookahead})\\b`,
      "i"
    ).test(clause);
    if (!clauseMatched && !hasNonPositiveExplicitQty && !isPurePaymentClause) {
      const sortedAliases = catalog
        .flatMap((sku) => sku.aliases.map((alias) => ({ sku, alias })))
        .sort((a, b) => b.alias.length - a.alias.length);
      for (const { sku, alias } of sortedAliases) {
        if (
          !items.some((existing) => existing.skuId === sku.skuId) &&
          new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(clause)
        ) {
          items.push({
            skuId: sku.skuId,
            canonicalName: sku.canonicalName,
            quantityBase: sku.skuType === "loose" ? sku.baseMultiplier : 1,
            unitLabel: sku.unitLabel,
            unitPricePaise: sku.sellPricePaise,
            lineTotalPaise: sku.sellPricePaise,
            confidence: 0.72
          });
          if (!candidateSkus.some((s) => s.skuId === sku.skuId)) {
            candidateSkus.push(sku);
          }
          break;
        }
      }
    }
  }

  const subtotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const taxPaise = items.reduce((sum, item) => {
    const sku = catalog.find((s) => s.skuId === item.skuId);
    const gst = sku?.gstPercent ?? 0;
    return sum + splitMrpInclusiveTax(item.lineTotalPaise, gst).taxPaise;
  }, 0);

  // 5. Parse payment split (Cash / UPI / Udhaar or Khata) across Hindi, Gujarati, Marathi, Punjabi, South Indian terms
  const paidVerbs =
    "(?:cash|jama|diya|diye|de\\s+diya|mila|mile|nakad|nagaad|rokda|rokada|apya|aapya|didha|aavya|dile|dila|ditta|ditte|kuduthen|kodutha|icharu|koduthu|paid)";
  const upiVerbs = "(?:upi|gpay|phonepe|paytm|online)";
  const upiMatch = normalized.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_PATTERN}\\s*)?${upiVerbs}\\b`, "i"));
  const cashMatch = normalized.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${CURRENCY_PATTERN}\\s*)?${paidVerbs}\\b`, "i")
  );
  const upiPaise = upiMatch ? rupeesToPaise(Number(upiMatch[1])) : 0;
  let cashPaise = cashMatch ? rupeesToPaise(Number(cashMatch[1])) : 0;

  const paidPaise = cashPaise + upiPaise;
  const hasCreditKeyword = /\b(baaki|baki|udhaar|udhar|khata\w*|khate\w*|khatu\w*|credit)\b/i.test(normalized);
  const matchedCustomer = uniqueCustomers.length === 1 ? uniqueCustomers[0] : undefined;

  // Handle pure udhaar settlement payment (e.g. "Ramesh ne 200 rupaye jama kiye" with 0 items)
  if (items.length === 0 && paidPaise > 0) {
    const paymentDraft: TransactionDraft = {
      intent: "PAYMENT",
      rawTranscript: trimmed,
      ...(matchedCustomer ? { customerId: matchedCustomer.customerId, customerName: matchedCustomer.displayName } : {}),
      items: [],
      paymentSplit: { cashPaise, upiPaise, udhaarPaise: 0 },
      needsConfirmation: true,
      ambiguousFields: uniqueCustomers.length > 1 ? ["customerId"] : []
    };
    return {
      draft: paymentDraft,
      normalizedTranscript: normalized,
      englishSummary: buildEnglishSummary(paymentDraft, paidPaise),
      subtotalPaise: paidPaise,
      taxPaise: 0,
      candidateCustomers: uniqueCustomers,
      candidateSkus,
      warnings:
        uniqueCustomers.length > 1
          ? [`Multiple customers matched (${uniqueCustomers.map((c) => c.displayName).join(" vs ")})`]
          : []
    };
  }

  let udhaarPaise = 0;
  if (paidPaise > 0) {
    udhaarPaise = Math.max(0, subtotalPaise - paidPaise);
  } else if (hasCreditKeyword) {
    udhaarPaise = subtotalPaise;
  } else if (subtotalPaise > 0) {
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
