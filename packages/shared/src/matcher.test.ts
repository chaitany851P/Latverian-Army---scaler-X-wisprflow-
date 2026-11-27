import { describe, expect, it } from "vitest";
import { fuzzyMatchSkus, parseSandboxUtterance } from "./matcher.js";

describe("Hinglish sandbox parser & Fuse.js matcher", () => {
  it("parses code-mixed sale with split payment and ambiguous Ramesh candidates", () => {
    const res = parseSandboxUtterance(
      "Ramesh ko 2 kilo chawal, 1 litre doodh, 100 rupaye jama, baaki mahine ke end mein",
      "kirana"
    );

    expect(res.draft.intent).toBe("SALE");
    expect(res.draft.items.length).toBeGreaterThanOrEqual(2);
    expect(res.draft.paymentSplit.cashPaise).toBe(10000);
    expect(res.draft.paymentSplit.udhaarPaise).toBe(13400); // (2*90 + 54) = 234 - 100 = 134
    expect(res.draft.ambiguousFields).toContain("customerId");
    expect(res.candidateCustomers.length).toBe(2);
  });

  it("normalizes Indian quantity terms like pao and dedh", () => {
    const res = parseSandboxUtterance("dedh kilo chawal aur pao toor dal", "kirana");
    expect(res.draft.items[0]?.quantityBase).toBe(1500);
    expect(res.draft.items[1]?.quantityBase).toBe(250);
  });

  it("parses petty cash (chhota kharcha) and correction intents", () => {
    const expense = parseSandboxUtterance("200 rupaye chai aur transport kharcha");
    expect(expense.draft.intent).toBe("EXPENSE");
    expect(expense.draft.paymentSplit.cashPaise).toBe(20000);

    const correction = parseSandboxUtterance("Nahi 2 nahi 1 kilo");
    expect(correction.draft.intent).toBe("CORRECTION");
  });

  it("handles empty transcript gracefully without throwing", () => {
    const empty = parseSandboxUtterance("   ");
    expect(empty.draft.ambiguousFields).toContain("empty_transcript");
    expect(empty.warnings.length).toBeGreaterThan(0);
  });

  it("matches regional SKU spelling variants via Fuse.js", () => {
    const matches = fuzzyMatchSkus("kanda", "produce");
    expect(matches[0]?.skuId).toBe("SKU_ONION");
  });
});
