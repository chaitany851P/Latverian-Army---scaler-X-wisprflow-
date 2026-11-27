import QRCode from "qrcode";

export async function generateUpiQrDataUrl(params: {
  vpa: string;
  payeeName: string;
  amountRupees: string;
  note?: string;
}): Promise<string> {
  const url = new URL("upi://pay");
  url.searchParams.set("pa", params.vpa);
  url.searchParams.set("pn", params.payeeName);
  url.searchParams.set("am", params.amountRupees);
  url.searchParams.set("cu", "INR");
  if (params.note) {
    url.searchParams.set("tn", params.note);
  }
  return QRCode.toDataURL(url.toString(), { margin: 1, width: 220 });
}
