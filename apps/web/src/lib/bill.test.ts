import { parseSandboxUtterance } from "@voicekhata/shared";
import { describe, expect, it } from "vitest";
import { buildGeneratedBill } from "./bill";

describe("bill generation & ledger separation math", () => {
  it("keeps previous udhaar separate from current bill total and calculates net remaining", () => {
    const parsed = parseSandboxUtterance("રમેશભાઈ ના ખાતામાં બે કિલો ચણા દાળ", "kirana");
    const bill = buildGeneratedBill({
      billNumber: "VK-TEST-1001",
      issuedAtIso: "2026-11-27T12:00:00.000Z",
      preset: "kirana",
      customerName: "Ramesh (Gali-3)",
      previousBalancePaise: 12000, // ₹120.00 previous udhaar
      subtotalPaise: parsed.subtotalPaise, // ₹192.00 current bill
      taxPaise: parsed.taxPaise,
      englishSummary: parsed.englishSummary,
      draft: parsed.draft
    });

    expect(bill.currentBillPaise).toBe(19200);
    expect(bill.previousBalancePaise).toBe(12000);
    expect(bill.totalPayablePaise).toBe(31200); // ₹312.00
    expect(bill.paidNowPaise).toBe(0);
    expect(bill.netRemainingPaise).toBe(31200);
    expect(bill.plainTextReceipt).toContain("Bill No: VK-TEST-1001");
    expect(bill.plainTextReceipt).toContain("Chana Dal (Loose)");
    expect(bill.plainTextReceipt).toContain("Previous Udhaar: ₹120.00");
  });

  it("handles split cash payment against current bill + previous balance", () => {
    const parsed = parseSandboxUtterance("Ramesh ko 2 kilo chawal, 100 rupaye jama", "kirana");
    const bill = buildGeneratedBill({
      billNumber: "VK-TEST-1002",
      issuedAtIso: "2026-11-27T12:00:00.000Z",
      preset: "kirana",
      customerName: "Ramesh Dudhwala",
      previousBalancePaise: 5000,
      subtotalPaise: parsed.subtotalPaise, // ₹180.00
      taxPaise: parsed.taxPaise,
      englishSummary: parsed.englishSummary,
      draft: parsed.draft
    });

    expect(bill.totalPayablePaise).toBe(23000);
    expect(bill.paidNowPaise).toBe(10000);
    expect(bill.netRemainingPaise).toBe(13000);
  });

  it("handles pure PAYMENT settlement without adding payment to bill total", () => {
    const parsed = parseSandboxUtterance("રમેશ ના 200 જમા", "kirana");
    const bill = buildGeneratedBill({
      billNumber: "VK-TEST-1003",
      issuedAtIso: "2026-11-27T12:00:00.000Z",
      dueDateIso: "2026-12-05",
      preset: "kirana",
      customerName: "Ramesh (Gali-3)",
      previousBalancePaise: 50000,
      subtotalPaise: parsed.subtotalPaise,
      taxPaise: parsed.taxPaise,
      englishSummary: parsed.englishSummary,
      draft: parsed.draft
    });

    expect(bill.currentBillPaise).toBe(0);
    expect(bill.totalPayablePaise).toBe(50000);
    expect(bill.paidNowPaise).toBe(20000);
    expect(bill.netRemainingPaise).toBe(30000);
    expect(bill.dueDateIso).toBe("2026-12-05");
  });
});
