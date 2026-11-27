import { z } from "zod";

export const StorePresetSchema = z.enum([
  "kirana",
  "dairy",
  "produce",
  "stationery",
  "general",
  "mini_supermarket"
]);
export type StorePreset = z.infer<typeof StorePresetSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.string(),
  timestamp: z.string()
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const PaymentSplitSchema = z.object({
  cashPaise: z.number().int().nonnegative(),
  upiPaise: z.number().int().nonnegative(),
  udhaarPaise: z.number().int().nonnegative()
});

export const DraftLineItemSchema = z.object({
  skuId: z.string().min(1),
  canonicalName: z.string().min(1),
  quantityBase: z.number().int().positive(),
  unitLabel: z.string().min(1),
  unitPricePaise: z.number().int().nonnegative(),
  lineTotalPaise: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1)
});

export const TransactionDraftSchema = z.object({
  intent: z.enum(["SALE", "PURCHASE", "EXPENSE", "PAYMENT", "QUERY", "CORRECTION"]),
  rawTranscript: z.string(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(DraftLineItemSchema),
  paymentSplit: PaymentSplitSchema,
  needsConfirmation: z.literal(true),
  ambiguousFields: z.array(z.string()).default([])
});
export type TransactionDraft = z.infer<typeof TransactionDraftSchema>;

export const SandboxParseRequestSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  preset: StorePresetSchema.default("kirana")
});
export type SandboxParseRequest = z.infer<typeof SandboxParseRequestSchema>;
