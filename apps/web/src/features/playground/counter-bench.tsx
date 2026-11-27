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
import { AlertTriangle, CheckCircle2, Database, ExternalLink, Mic, MicOff, Plus, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger
} from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { offlineCounterDb, type OfflinePendingDraft } from "../../lib/offline-db";
import { getSpeechRecognitionConstructor, type BrowserSpeechRecognition } from "../../lib/speech";
import { generateUpiQrDataUrl } from "../../lib/upi-qr";

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
  "Ramesh ko 2 kilo chawal, 1 litre doodh, 100 rupaye jama, baaki mahine ke end mein",
  "dedh kilo chawal aur pao toor dal",
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
  const t = useTranslations("app");
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
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflinePendingDraft[]>([]);
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
    rec.lang = speechLang;
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

  const handleSaveOfflineDraft = async () => {
    if (!activeCart.transcript.trim()) return;
    await offlineCounterDb.pendingDrafts.add({
      idempotencyKey: crypto.randomUUID(),
      rawTranscript: activeCart.transcript,
      createdAt: new Date().toISOString(),
      synced: 0
    });
    await loadOfflineDrafts();
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

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-600">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
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

      <Tabs defaultValue="counter" className="w-full">
        <TabsList>
          <TabsTrigger value="counter">Counter Voice Bench</TabsTrigger>
          <TabsTrigger value="offline">Offline Queue ({offlineDrafts.length})</TabsTrigger>
          <TabsTrigger value="catalog">Catalog &amp; API Status</TabsTrigger>
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
              <Plus className="h-4 w-4" /> Hold New Cart
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
                  {isListening ? "Stop Listening" : "Speak (Mic)"}
                </Button>
                <select
                  aria-label="Speech language"
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value as "hi-IN" | "en-IN")}
                  className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="hi-IN">Hindi / Hinglish</option>
                  <option value="en-IN">English (India)</option>
                </select>
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
              placeholder={t("micPrompt")}
              className="w-full rounded-xl border border-slate-300 p-3 text-base focus:border-emerald-600 focus:outline-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
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
                {isParsing ? "Parsing..." : "Parse Draft"}
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
                          {item.quantityBase} {item.unitLabel === "kg" || item.unitLabel === "g" ? "base g" : item.unitLabel}
                        </span>
                      </div>
                      <span className="font-semibold">₹{formatPaiseAsRupees(item.lineTotalPaise)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Total (MRP Incl.)</p>
                  <p className="font-bold">₹{formatPaiseAsRupees(parsed.subtotalPaise)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Included GST</p>
                  <p className="font-semibold">₹{formatPaiseAsRupees(parsed.taxPaise)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cash / UPI Paid</p>
                  <p className="font-semibold text-emerald-700">
                    ₹{formatPaiseAsRupees(parsed.draft.paymentSplit.cashPaise + parsed.draft.paymentSplit.upiPaise)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Udhaar Remaining</p>
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
                <Button type="button" variant="secondary" onClick={() => void handleSaveOfflineDraft()}>
                  <Database className="h-4 w-4" /> Save to Offline Queue (Dexie)
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" onClick={() => void handleGenerateQr()}>
                      <QrCode className="h-4 w-4" /> Show UPI QR
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
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="offline" className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">IndexedDB Offline Drafts (Dexie.js)</h2>
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
                No offline drafts saved yet. Click &quot;Save to Offline Queue (Dexie)&quot; on the Counter tab to test persistence across refreshes.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {offlineDrafts.map((row) => (
                  <li key={row.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{row.rawTranscript}</p>
                      <p className="text-xs text-slate-500">
                        Key: {row.idempotencyKey.slice(0, 8)}... · {row.createdAt}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
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
    </main>
  );
}
