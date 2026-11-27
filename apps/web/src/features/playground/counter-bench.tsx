"use client";

import {
  formatPaiseAsRupees,
  getCatalogForPreset,
  parseSandboxUtterance,
  StorePresetSchema,
  type SandboxParseResult,
  type SeedCustomer,
  type StorePreset
} from "@voicekhata/shared";
import { AlertTriangle, CheckCircle2, Database, ExternalLink, FileText, Languages, Mic, MicOff, Plus, QrCode, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { buildGeneratedBill, type GeneratedBill } from "../../lib/bill";
import { offlineCounterDb, type OfflinePendingDraft } from "../../lib/offline-db";
import { getSpeechRecognitionConstructor, type BrowserSpeechRecognition } from "../../lib/speech";
import { generateUpiQrDataUrl } from "../../lib/upi-qr";
import { getLocaleConfig, SUPPORTED_LOCALES, type AppLocale } from "../../messages/translations";
import { BillPreviewDialog } from "./bill-preview-dialog";

const emptySubscribe = () => () => {};

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

const PRESET_LABELS: Record<StorePreset, string> = {
  kirana: "Kirana",
  dairy: "Dairy",
  produce: "Produce",
  stationery: "Stationery",
  general: "General Store",
  mini_supermarket: "Mini Supermarket"
};

const SAMPLE_UTTERANCES = [
  "रमेश भाई के खाते में 2 किलो खान 20 रुपए किलो",
  "Ramesh ko 2 kilo chawal, 1 litre doodh, 100 rupaye jama, baaki mahine ke end mein",
  "200 rupaye chai aur transport kharcha",
  "Nahi 2 nahi 1 kilo"
];

interface HoldCartState {
  id: string;
  label: string;
  transcript: string;
  parsed: SandboxParseResult | null;
  selectedCustomer: SeedCustomer | null;
  source: "api" | "browser" | null;
}

export function CounterBench() {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const t = useTranslations("app");
  const [locale, setLocale] = useState<AppLocale>("hi");
  const localeCfg = getLocaleConfig(locale);

  const [preset, setPreset] = useState<StorePreset>("kirana");
  const [carts, setCarts] = useState<HoldCartState[]>(() => {
    const initialSample = SAMPLE_UTTERANCES[0] ?? "";
    const initialParsed = parseSandboxUtterance(initialSample, "kirana");
    return [
      {
        id: "cart-1",
        label: "Cart 1",
        transcript: initialSample,
        parsed: initialParsed,
        selectedCustomer:
          initialParsed.candidateCustomers.length === 1
            ? (initialParsed.candidateCustomers[0] ?? null)
            : null,
        source: "browser"
      }
    ];
  });
  const [activeCartId, setActiveCartId] = useState("cart-1");
  const [activeTab, setActiveTab] = useState<"counter" | "offline" | "catalog">("counter");
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflinePendingDraft[]>([]);
  const [previewBill, setPreviewBill] = useState<GeneratedBill | null>(null);
  const [previewIsFromOffline, setPreviewIsFromOffline] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<string>("Not checked yet");

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const activeCart = carts.find((c) => c.id === activeCartId) ?? carts[0]!;

  const updateActiveCart = useCallback(
    (updater: (prev: HoldCartState) => HoldCartState) => {
      setCarts((prev) => prev.map((c) => (c.id === activeCartId ? updater(c) : c)));
    },
    [activeCartId]
  );

  const loadOfflineDrafts = useCallback(async () => {
    const rows = await offlineCounterDb.pendingDrafts.orderBy("id").reverse().toArray();
    setOfflineDrafts(rows);
  }, []);

  useEffect(() => {
    void loadOfflineDrafts();
  }, [loadOfflineDrafts]);

  const stopAudioMonitor = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopAudioMonitor();
    };
  }, [stopAudioMonitor]);

  const runParse = useCallback(
    async (textToParse: string, targetPreset: StorePreset) => {
      setIsParsing(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/sandbox/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: textToParse, preset: targetPreset })
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as SandboxParseResult;
        updateActiveCart((prev) => ({
          ...prev,
          transcript: textToParse,
          parsed: data,
          selectedCustomer:
            data.candidateCustomers.length === 1 ? (data.candidateCustomers[0] ?? null) : null,
          source: "api"
        }));
      } catch {
        const localData = parseSandboxUtterance(textToParse, targetPreset);
        updateActiveCart((prev) => ({
          ...prev,
          transcript: textToParse,
          parsed: localData,
          selectedCustomer:
            localData.candidateCustomers.length === 1 ? (localData.candidateCustomers[0] ?? null) : null,
          source: "browser"
        }));
      } finally {
        setIsParsing(false);
      }
    },
    [updateActiveCart]
  );

  const toggleMic = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      stopAudioMonitor();
      setIsListening(false);
      return;
    }

    const SpeechCtor = getSpeechRecognitionConstructor();
    if (!SpeechCtor) {
      setSpeechStatus("Browser SpeechRecognition unavailable here; use Wispr Flow or type directly.");
      return;
    }

    setSpeechStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = ((data[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        const rms = Math.min(100, Math.round(Math.sqrt(sum / data.length) * 350));
        setMicLevel(rms);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setSpeechStatus("Microphone permission denied or no audio device detected.");
    }

    const rec = new SpeechCtor();
    rec.lang = localeCfg.speechLang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (!last) return;
      const transcriptText = last[0]?.transcript ?? "";
      updateActiveCart((prev) => ({ ...prev, transcript: transcriptText }));
      if (last.isFinal) {
        void runParse(transcriptText, preset);
      }
    };
    rec.onerror = (ev) => {
      setSpeechStatus(`Mic error: ${ev.error}`);
      setIsListening(false);
      stopAudioMonitor();
    };
    rec.onend = () => {
      setIsListening(false);
      stopAudioMonitor();
    };
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const handleHoldNewCart = () => {
    const nextNum = carts.length + 1;
    const newId = `cart-${nextNum}`;
    setCarts((prev) => [
      ...prev,
      {
        id: newId,
        label: `Cart ${nextNum}`,
        transcript: "",
        parsed: null,
        selectedCustomer: null,
        source: null
      }
    ]);
    setActiveCartId(newId);
  };

  const handleSaveOfflineDraft = async (billOverride?: GeneratedBill) => {
    const currentParsed = activeCart.parsed;
    if (!activeCart.transcript.trim() && !billOverride) return;

    const resolvedCust =
      activeCart.selectedCustomer ??
      (currentParsed && currentParsed.candidateCustomers.length === 1
        ? (currentParsed.candidateCustomers[0] ?? null)
        : null);

    const record: OfflinePendingDraft = {
      idempotencyKey: crypto.randomUUID(),
      rawTranscript: billOverride?.rawTranscript ?? activeCart.transcript,
      createdAt: billOverride?.issuedAtIso ?? new Date().toISOString(),
      synced: 0,
      preset: billOverride?.preset ?? preset,
      previousBalancePaise: billOverride?.previousBalancePaise ?? resolvedCust?.previousBalancePaise ?? 0,
      subtotalPaise: billOverride?.currentBillPaise ?? currentParsed?.subtotalPaise ?? 0,
      taxPaise: billOverride?.taxPaise ?? currentParsed?.taxPaise ?? 0
    };

    const resolvedName = billOverride?.customerName ?? resolvedCust?.displayName;
    if (resolvedName) record.customerName = resolvedName;

    const summary = billOverride?.englishSummary ?? currentParsed?.englishSummary;
    if (summary) record.englishSummary = summary;

    if (billOverride?.billNumber) record.billNumber = billOverride.billNumber;
    if (currentParsed?.draft) record.draft = currentParsed.draft;

    await offlineCounterDb.pendingDrafts.add(record);
    await loadOfflineDrafts();
    setSaveNotice(
      billOverride
        ? `Saved ${billOverride.billNumber} to Offline Queue (Dexie).`
        : "Saved draft items & totals to Offline Queue (Dexie)."
    );
    setTimeout(() => setSaveNotice(null), 3500);
  };

  const handleOpenGenerateBill = () => {
    const currentParsed = activeCart.parsed;
    if (!currentParsed) return;
    const customer =
      activeCart.selectedCustomer ??
      (currentParsed.candidateCustomers.length === 1 ? currentParsed.candidateCustomers[0] : null);
    const bill = buildGeneratedBill({
      preset,
      ...(customer ? { customerName: customer.displayName, previousBalancePaise: customer.previousBalancePaise } : {}),
      subtotalPaise: currentParsed.subtotalPaise,
      taxPaise: currentParsed.taxPaise,
      englishSummary: currentParsed.englishSummary,
      draft: currentParsed.draft
    });
    setPreviewIsFromOffline(false);
    setPreviewBill(bill);
  };

  const handleInspectOfflineBill = (row: OfflinePendingDraft) => {
    if (!row.draft) return;
    const bill = buildGeneratedBill({
      ...(row.billNumber ? { billNumber: row.billNumber } : {}),
      issuedAtIso: row.createdAt,
      preset: row.preset ?? "kirana",
      ...(row.customerName ? { customerName: row.customerName } : {}),
      previousBalancePaise: row.previousBalancePaise ?? 0,
      subtotalPaise: row.subtotalPaise ?? 0,
      taxPaise: row.taxPaise ?? 0,
      englishSummary: row.englishSummary ?? row.rawTranscript,
      draft: row.draft
    });
    setPreviewIsFromOffline(true);
    setPreviewBill(bill);
  };

  const handleLoadOfflineIntoCounter = (row: OfflinePendingDraft) => {
    if (row.preset) {
      setPreset(row.preset);
    }
    if (row.draft) {
      const localResult = parseSandboxUtterance(row.rawTranscript, row.preset ?? preset);
      updateActiveCart((prev) => ({
        ...prev,
        transcript: row.rawTranscript,
        parsed: {
          ...localResult,
          draft: row.draft ?? localResult.draft,
          subtotalPaise: row.subtotalPaise ?? localResult.subtotalPaise,
          taxPaise: row.taxPaise ?? localResult.taxPaise,
          englishSummary: row.englishSummary ?? localResult.englishSummary
        },
        selectedCustomer:
          localResult.candidateCustomers.find((c) => c.displayName === row.customerName) ?? null,
        source: "browser"
      }));
    } else {
      void runParse(row.rawTranscript, row.preset ?? preset);
    }
    setActiveTab("counter");
  };

  const handleGenerateQr = async () => {
    const parsed = activeCart.parsed;
    const payablePaise = parsed
      ? parsed.draft.paymentSplit.upiPaise > 0
        ? parsed.draft.paymentSplit.upiPaise
        : parsed.subtotalPaise
      : 10000;
    const amountRupees = formatPaiseAsRupees(Math.max(100, payablePaise));
    const dataUrl = await generateUpiQrDataUrl({
      vpa: "voicekhata-demo@upi",
      payeeName: "VoiceKhata Demo Store",
      amountRupees,
      note: "Counter Bill"
    });
    setQrUrl(dataUrl);
  };

  const handleCheckApiHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/health`);
      const json = (await res.json()) as { status: string; service: string };
      setApiHealth(`Online (${json.service}: ${json.status})`);
    } catch {
      setApiHealth(`Offline at ${API_URL} — browser fallback active`);
    }
  };

  const parsed = activeCart.parsed;
  const resolvedCustomer = activeCart.selectedCustomer;
  const hasAmbiguity =
    parsed !== null &&
    (parsed.draft.ambiguousFields.includes("items") ||
      (parsed.draft.ambiguousFields.includes("customerId") && resolvedCustomer === null));
  const presetCatalog = getCatalogForPreset(preset);

  if (!isHydrated) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8" suppressHydrationWarning>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-600">{localeCfg.ui.subtitle}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8" suppressHydrationWarning>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-600">{localeCfg.ui.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 h-10">
            <Languages className="h-4 w-4 text-slate-600" />
            <select
              aria-label="App and voice language"
              value={locale}
              onChange={(e) => {
                const next = e.target.value as AppLocale;
                setLocale(next);
              }}
              className="bg-transparent text-sm font-medium focus:outline-none"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
          <select
            aria-label="Store preset"
            value={preset}
            onChange={(e) => {
              const nextPreset = e.target.value as StorePreset;
              setPreset(nextPreset);
              if (activeCart.transcript.trim()) {
                void runParse(activeCart.transcript, nextPreset);
              }
            }}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
          >
            {StorePresetSchema.options.map((p) => (
              <option key={p} value={p}>
                {PRESET_LABELS[p]}
              </option>
            ))}
          </select>
          <a
            href={`${API_URL}/reference/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Scalar API Docs <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "counter" | "offline" | "catalog")} className="w-full">
        <TabsList>
          <TabsTrigger value="counter">{localeCfg.ui.counterTab}</TabsTrigger>
          <TabsTrigger value="offline">
            {localeCfg.ui.offlineTab} ({offlineDrafts.length})
          </TabsTrigger>
          <TabsTrigger value="catalog">{localeCfg.ui.catalogTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="counter" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {carts.map((cart) => (
              <button
                key={cart.id}
                type="button"
                onClick={() => setActiveCartId(cart.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                  cart.id === activeCartId
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {cart.label}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={handleHoldNewCart}>
              <Plus className="h-4 w-4" /> {localeCfg.ui.holdCartBtn}
            </Button>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="lg"
                  variant={isListening ? "destructive" : "default"}
                  onClick={() => void toggleMic()}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  {isListening ? localeCfg.ui.stopBtn : localeCfg.ui.speakBtn}
                </Button>
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                  Mic: {localeCfg.speechLang}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Noise / RMS</span>
                <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
              </div>
            </div>

            {speechStatus ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{speechStatus}</p>
            ) : null}

            <textarea
              rows={2}
              value={activeCart.transcript}
              onChange={(e) =>
                updateActiveCart((prev) => ({ ...prev, transcript: e.target.value }))
              }
              placeholder={localeCfg.ui.placeholder}
              className="w-full rounded-xl border border-slate-300 p-3 text-base focus:border-emerald-600 focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void runParse(localeCfg.sampleUtterance, preset)}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Test {localeCfg.code.toUpperCase()} Sample
                </button>
                {SAMPLE_UTTERANCES.map((sample, idx) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => void runParse(sample, preset)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    Sample {idx + 1}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                disabled={isParsing}
                onClick={() => void runParse(activeCart.transcript, preset)}
              >
                {isParsing ? "Parsing..." : localeCfg.ui.parseBtn}
              </Button>
            </div>
          </section>

          {parsed ? (
            <section
              className={`rounded-2xl border-2 bg-white p-5 shadow-xs space-y-4 ${
                resolvedCustomer?.riskTier === "RED"
                  ? "border-red-400"
                  : hasAmbiguity
                    ? "border-amber-400"
                    : "border-emerald-500"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {hasAmbiguity ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <span className="font-semibold text-slate-900">
                    Draft Card · Intent: {parsed.draft.intent}
                  </span>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  Engine: {activeCart.source === "api" ? "Fastify API Live" : "Browser Fuse.js Engine"}
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
                <p>
                  <span className="font-semibold">{localeCfg.ui.translatedLabel}:</span>{" "}
                  {parsed.englishSummary}
                </p>
                {parsed.normalizedTranscript ? (
                  <p className="text-slate-500">Phonetic: {parsed.normalizedTranscript}</p>
                ) : null}
              </div>

              {parsed.candidateCustomers.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-600">
                    Customer Match {hasAmbiguity ? "(Tap to disambiguate)" : ""}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {parsed.candidateCustomers.map((cust) => (
                      <button
                        key={cust.customerId}
                        type="button"
                        onClick={() =>
                          updateActiveCart((prev) => ({ ...prev, selectedCustomer: cust }))
                        }
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                          resolvedCustomer?.customerId === cust.customerId
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-slate-50 text-slate-800"
                        }`}
                      >
                        {cust.displayName} · Prev ₹{formatPaiseAsRupees(cust.previousBalancePaise)} ({cust.riskTier})
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {parsed.draft.items.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {parsed.draft.items.map((item) => (
                    <div key={`${item.skuId}-${item.quantityBase}`} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-slate-900">{item.canonicalName}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {item.quantityBase} {item.unitLabel === "kg" || item.unitLabel === "g" ? "base g" : item.unitLabel} @ ₹{formatPaiseAsRupees(item.unitPricePaise)}
                        </span>
                      </div>
                      <span className="font-semibold">₹{formatPaiseAsRupees(item.lineTotalPaise)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">{localeCfg.ui.totalLabel}</p>
                  <p className="font-bold">₹{formatPaiseAsRupees(parsed.subtotalPaise)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{localeCfg.ui.gstLabel}</p>
                  <p className="font-semibold">₹{formatPaiseAsRupees(parsed.taxPaise)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{localeCfg.ui.paidLabel}</p>
                  <p className="font-semibold text-emerald-700">
                    ₹{formatPaiseAsRupees(parsed.draft.paymentSplit.cashPaise + parsed.draft.paymentSplit.upiPaise)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{localeCfg.ui.udhaarLabel}</p>
                  <p className="font-semibold text-amber-700">
                    ₹{formatPaiseAsRupees(parsed.draft.paymentSplit.udhaarPaise)}
                  </p>
                </div>
              </div>

              {parsed.warnings.length > 0 ? (
                <ul className="space-y-1 text-xs text-amber-800">
                  {parsed.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleOpenGenerateBill}
                  disabled={parsed.draft.items.length === 0 && parsed.subtotalPaise === 0}
                >
                  <FileText className="h-4 w-4" /> Generate Bill
                </Button>
                <Button type="button" variant="secondary" onClick={() => void handleSaveOfflineDraft()}>
                  <Database className="h-4 w-4" /> {localeCfg.ui.saveOfflineBtn}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" onClick={() => void handleGenerateQr()}>
                      <QrCode className="h-4 w-4" /> {localeCfg.ui.showQrBtn}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle className="text-lg font-bold">Dynamic UPI Counter QR</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-slate-600">
                      Customer scans exact amount directly without manual typing.
                    </DialogDescription>
                    {qrUrl ? (
                      <div className="mt-4 flex flex-col items-center gap-2">
                        <img src={qrUrl} alt="UPI Payment QR" className="h-52 w-52 rounded-xl border border-slate-200" />
                      </div>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
              {saveNotice ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                  {saveNotice}
                </p>
              ) : null}
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="offline" className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">IndexedDB Offline Saved Bills &amp; Drafts (Dexie.js)</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await offlineCounterDb.pendingDrafts.clear();
                  await loadOfflineDrafts();
                }}
              >
                <Trash2 className="h-4 w-4" /> Clear All
              </Button>
            </div>
            {offlineDrafts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No offline drafts saved yet. Click Save to Offline Queue or Generate Bill on the Counter tab to inspect saved items here.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {offlineDrafts.map((row) => (
                  <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                            {row.billNumber ?? `Draft #${row.id}`}
                          </span>
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Pending Sync
                          </span>
                          {row.customerName ? (
                            <span className="text-xs font-semibold text-slate-800">
                              Customer: {row.customerName}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900">{row.rawTranscript}</p>
                        {row.englishSummary ? (
                          <p className="text-xs text-slate-600">{row.englishSummary}</p>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(row.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {row.draft && row.draft.items.length > 0 ? (
                      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                        {row.draft.items.map((item) => (
                          <div
                            key={`${row.id}-${item.skuId}-${item.quantityBase}`}
                            className="flex items-center justify-between px-3 py-1.5 text-xs"
                          >
                            <span>
                              <strong className="text-slate-900">{item.canonicalName}</strong>{" "}
                              <span className="text-slate-500">
                                ({item.quantityBase}{" "}
                                {item.unitLabel === "kg" || item.unitLabel === "g" ? "g" : item.unitLabel} @ ₹
                                {formatPaiseAsRupees(item.unitPricePaise)})
                              </span>
                            </span>
                            <span className="font-semibold text-slate-900">
                              ₹{formatPaiseAsRupees(item.lineTotalPaise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {row.draft ? (
                      <div className="flex flex-wrap gap-4 text-xs text-slate-700">
                        <span>
                          <strong>Total:</strong> ₹{formatPaiseAsRupees(row.subtotalPaise ?? 0)}
                        </span>
                        <span>
                          <strong>GST:</strong> ₹{formatPaiseAsRupees(row.taxPaise ?? 0)}
                        </span>
                        <span className="text-emerald-700">
                          <strong>Paid:</strong> ₹
                          {formatPaiseAsRupees(
                            row.draft.paymentSplit.cashPaise + row.draft.paymentSplit.upiPaise
                          )}
                        </span>
                        <span className="text-amber-700">
                          <strong>Udhaar:</strong> ₹{formatPaiseAsRupees(row.draft.paymentSplit.udhaarPaise)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Legacy transcript-only entry (Key: {row.idempotencyKey.slice(0, 8)}...).
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {row.draft ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleInspectOfflineBill(row)}
                        >
                          <FileText className="h-3.5 w-3.5" /> View Bill
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleLoadOfflineIntoCounter(row)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Load to Counter
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (row.id !== undefined) {
                            await offlineCounterDb.pendingDrafts.delete(row.id);
                            await loadOfflineDrafts();
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="font-semibold text-slate-900">Backend API Connectivity</p>
              <p className="text-xs text-slate-600">{apiHealth}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleCheckApiHealth()}>
              <RefreshCw className="h-4 w-4" /> Ping /api/v1/health
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">
              Seeded Catalog for {PRESET_LABELS[preset]} ({presetCatalog.length} SKUs)
            </h2>
            <div className="mt-3 divide-y divide-slate-100">
              {presetCatalog.map((item) => (
                <div key={item.skuId} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.canonicalName}</p>
                    <p className="text-xs text-slate-500">
                      {item.skuType.toUpperCase()} · Aliases: {item.aliases.join(", ")}
                    </p>
                  </div>
                  <span className="font-semibold">
                    ₹{formatPaiseAsRupees(item.sellPricePaise)} / {item.unitLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <BillPreviewDialog
        bill={previewBill}
        onClose={() => setPreviewBill(null)}
        {...(!previewIsFromOffline
          ? {
              onSaveOffline: async (bill) => {
                await handleSaveOfflineDraft(bill);
                setPreviewBill(null);
              }
            }
          : {})}
      />
    </main>
  );
}
