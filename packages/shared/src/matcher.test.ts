import { describe, expect, it } from "vitest";
import { fuzzyMatchSkus, parseSandboxUtterance } from "./matcher.js";

describe("Multilingual Hinglish & Indic parser + Fuse.js matcher", () => {
  it("parses Hindi Devanagari utterance with spoken inline price and khata udhaar", () => {
    const res = parseSandboxUtterance("रमेश भाई के खाते में 2 किलो खान 20 रुपए किलो", "kirana");

    expect(res.draft.intent).toBe("SALE");
    expect(res.draft.items[0]?.skuId).toBe("SKU_SUGAR");
    expect(res.draft.items[0]?.quantityBase).toBe(2000);
    expect(res.draft.items[0]?.unitPricePaise).toBe(2000); // overridden ₹20/kg
    expect(res.subtotalPaise).toBe(4000); // ₹40.00
    expect(res.draft.paymentSplit.udhaarPaise).toBe(4000);
    expect(res.draft.ambiguousFields).toContain("customerId");
  });

  it("parses Gujarati, Punjabi, Tamil, Telugu, and Malayalam scripts uniformly", () => {
    const gu = parseSandboxUtterance("રમેશ 2 કિલો ખાંડ 20 રૂપિયા કિલો", "kirana");
    expect(gu.draft.items[0]?.skuId).toBe("SKU_SUGAR");
    expect(gu.subtotalPaise).toBe(4000);

    const guChana = parseSandboxUtterance("રમેશભાઈ ના ખાતામાં બે કિલો ચણા દાળ", "kirana");
    expect(guChana.draft.items[0]?.skuId).toBe("SKU_CHANA_DAL");
    expect(guChana.draft.items[0]?.quantityBase).toBe(2000);
    expect(guChana.subtotalPaise).toBe(19200);
    expect(guChana.draft.paymentSplit.udhaarPaise).toBe(19200);
    expect(guChana.draft.paymentSplit.cashPaise).toBe(0);

    const ta = parseSandboxUtterance("ரமேஷ் 2 கிலோ அரிசி", "kirana");
    expect(ta.draft.items[0]?.skuId).toBe("SKU_BASMATI_RICE");
    expect(ta.subtotalPaise).toBe(18000);

    const te = parseSandboxUtterance("రమేష్ 2 కిలో బియ్యం", "kirana");
    expect(te.draft.items[0]?.skuId).toBe("SKU_BASMATI_RICE");

    const ml = parseSandboxUtterance("രമേശ് 2 കിലോ അരി", "kirana");
    expect(ml.draft.items[0]?.skuId).toBe("SKU_BASMATI_RICE");
  });

  it("parses code-mixed Latin sale with split payment and ambiguous Ramesh candidates", () => {
    const res = parseSandboxUtterance(
      "Ramesh ko 2 kilo chawal, 1 litre doodh, 100 rupaye jama, baaki mahine ke end mein",
      "kirana"
    );

    expect(res.draft.intent).toBe("SALE");
    expect(res.draft.items.length).toBeGreaterThanOrEqual(2);
    expect(res.draft.paymentSplit.cashPaise).toBe(10000);
    expect(res.draft.paymentSplit.udhaarPaise).toBe(13400);
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

  it("defaults walk-in sales without credit keywords to cash and rejects unrelated fuzzy noise", () => {
    const cashSale = parseSandboxUtterance("2 kilo chawal", "kirana");
    expect(cashSale.draft.paymentSplit.cashPaise).toBe(18000);
    expect(cashSale.draft.paymentSplit.udhaarPaise).toBe(0);

    const unknown = parseSandboxUtterance("2 kilo zzzunknown", "kirana");
    expect(unknown.draft.items.length).toBe(0);
    expect(unknown.draft.ambiguousFields).toContain("items");

    const tea = parseSandboxUtterance("1 pack chai patti", "kirana");
    expect(tea.draft.intent).toBe("SALE");
    expect(tea.draft.items[0]?.skuId).toBe("SKU_TEA");
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
