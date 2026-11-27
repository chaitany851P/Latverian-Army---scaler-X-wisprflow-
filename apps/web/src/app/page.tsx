"use client";

import { formatPaiseAsRupees, StorePresetSchema } from "@voicekhata/shared";
import { Mic } from "lucide-react";
import { useTranslations } from "next-intl";

const PRESETS = StorePresetSchema.options;

export default function HomePage() {
  const t = useTranslations("app");

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">{t("statusReady")}</p>
            <p className="text-sm text-slate-500">{t("micPrompt")}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Sample integer-paise formatting check: ₹{formatPaiseAsRupees(18050)} | Presets: {PRESETS.join(", ")}
        </p>
      </section>
    </main>
  );
}
