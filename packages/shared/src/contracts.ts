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

export const SeedCustomerSchema = z.object({
  customerId: z.string(),
  displayName: z.string(),
  aliases: z.array(z.string()),
  previousBalancePaise: z.number(),
  riskTier: z.enum(["GREEN", "AMBER", "RED"])
});

export const SeedSkuSchema = z.object({
  skuId: z.string(),
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  presets: z.array(StorePresetSchema),
  skuType: z.enum(["packed", "loose"]),
  unitLabel: z.string(),
  baseMultiplier: z.number(),
  sellPricePaise: z.number(),
  gstPercent: z.number(),
  isMrpInclusive: z.boolean()
});

export const SandboxParseResultSnapshotSchema = z.object({
  draft: TransactionDraftSchema,
  normalizedTranscript: z.string(),
  englishSummary: z.string(),
  subtotalPaise: z.number().int().nonnegative(),
  taxPaise: z.number().int().nonnegative(),
  candidateCustomers: z.array(SeedCustomerSchema),
  candidateSkus: z.array(SeedSkuSchema),
  warnings: z.array(z.string())
});

export const SandboxParseRequestSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  preset: StorePresetSchema.default("kirana"),
  activeResult: SandboxParseResultSnapshotSchema.nullish()
});
export type SandboxParseRequest = z.infer<typeof SandboxParseRequestSchema>;
