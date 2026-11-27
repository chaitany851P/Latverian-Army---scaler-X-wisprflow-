"use client";

import { formatPaiseAsRupees } from "@voicekhata/shared";
import { Check, Copy, Database, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from "../../components/ui/dialog";
import type { GeneratedBill } from "../../lib/bill";
import { generateUpiQrDataUrl } from "../../lib/upi-qr";

interface BillPreviewDialogProps {
  bill: GeneratedBill | null;
  onClose: () => void;
  onSaveOffline?: (bill: GeneratedBill) => Promise<void>;
}

export function BillPreviewDialog({ bill, onClose, onSaveOffline }: BillPreviewDialogProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!bill) {
      setQrUrl(null);
      return;
    }

    const qrAmountPaise =
      bill.upiPaidPaise > 0
        ? bill.upiPaidPaise
        : bill.netRemainingPaise > 0
          ? bill.netRemainingPaise
          : bill.currentBillPaise;

    if (qrAmountPaise <= 0) {
      setQrUrl(null);
      return;
    }

    void generateUpiQrDataUrl({
      vpa: "voicekhata-demo@upi",
      payeeName: "VoiceKhata Store",
      amountRupees: formatPaiseAsRupees(qrAmountPaise),
      note: bill.billNumber
    }).then((url) => {
      if (!cancelled) {
        setQrUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [bill]);

  if (!bill) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bill.plainTextReceipt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogTitle className="text-lg font-bold text-slate-900">
          Retail Bill · {bill.billNumber}
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          {bill.issuedAtLabel} · Preset: {bill.preset.toUpperCase()}
        </DialogDescription>

        <div className="mt-4 space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">Customer</span>
            <span className="font-semibold text-slate-900">{bill.customerName}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bill.items.length > 0 ? (
                  bill.items.map((item) => (
                    <tr key={`${item.skuId}-${item.quantityBase}`}>
                      <td className="px-3 py-2 font-medium text-slate-900">{item.canonicalName}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {item.quantityBase}{" "}
                        {item.unitLabel === "kg" || item.unitLabel === "g" ? "g" : item.unitLabel}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        ₹{formatPaiseAsRupees(item.unitPricePaise)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                        ₹{formatPaiseAsRupees(item.lineTotalPaise)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-slate-600">
                      {bill.englishSummary}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Current Bill (MRP Incl.)</span>
              <span className="font-semibold text-slate-900">
                ₹{formatPaiseAsRupees(bill.currentBillPaise)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Included GST</span>
              <span className="text-slate-600">₹{formatPaiseAsRupees(bill.taxPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Previous Udhaar Balance</span>
              <span className="font-medium text-slate-800">
                ₹{formatPaiseAsRupees(bill.previousBalancePaise)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold">
              <span>Total Payable</span>
              <span>₹{formatPaiseAsRupees(bill.totalPayablePaise)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Paid Now (Cash ₹{formatPaiseAsRupees(bill.cashPaidPaise)} + UPI ₹{formatPaiseAsRupees(bill.upiPaidPaise)})</span>
              <span className="font-semibold">₹{formatPaiseAsRupees(bill.paidNowPaise)}</span>
            </div>
            <div className="flex justify-between font-bold text-amber-700">
              <span>
                Net Remaining Udhaar {bill.netRemainingPaise > 0 ? `(Due ${bill.dueDateLabel})` : ""}
              </span>
              <span>₹{formatPaiseAsRupees(bill.netRemainingPaise)}</span>
            </div>
          </div>

          {qrUrl ? (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 p-3">
              <img src={qrUrl} alt="Bill UPI QR" className="h-36 w-36 rounded-lg" />
              <span className="text-xs text-slate-500">Scan to pay via UPI</span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Receipt"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Bill
            </Button>
            {onSaveOffline ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void onSaveOffline(bill)}
              >
                <Database className="h-4 w-4" /> Save Bill Offline
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
