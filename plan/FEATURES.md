# Product Features & MVP Scope Cutline

## 1. Core Architectural Rules
1. **No lossy `Regional -> English` pivot before NLU:** Code-mixed Indian speech (Hinglish, Marathi-English, Gujarati-English, Tamil-English) is parsed directly into structured JSON against the shop's SKU/customer aliases (`pg_trgm`), preserving Indian product names (`toor dal`, `amul taaza`) and *khata* terms (`jama`, `baaki`, `udhaar`, `galla`).
2. **Draft -> Confirm Gate:** Voice commands **never** mutate inventory or *khata* balances silently. Every write stages a Draft Card requiring 1-tap or spoken confirmation (`"Haan confirm"`).
3. **Integer Math Only:** Currency is stored in integer **paise** (`₹12.50 -> 1250`), stock in integer **base units** (`g`, `ml`, `pcs`).
4. **MRP-Inclusive Retail Tax:** Packaged Indian goods are sold at printed MRP; GST is back-calculated from MRP (`splitMrpInclusiveTax`), never illegally added on top.

---

## 2. MVP Feature Scope (Build First)

### F1. Zero-Typing Store Onboarding
* Shopkeeper selects 1 of **6 Store Presets**: `kirana`, `dairy`, `produce` (fruits & vegetables), `stationery`, `general`, `mini_supermarket`.
* Pre-seeds 30–50 realistic Indian SKUs with `packed | loose` type, UoM (`purchase_unit -> base_unit`), regional aliases (`arhar/toor`, `kanda/pyaaz`), and default GST slab.
* Voice shelf-walk sets stock and local price overrides: *"Toor dal 145 kilo, 25 kilo hai; Amul doodh 28 rupaye, 30 packet."*

### F2. Live Counter Voice Billing & Parallel Hold-Carts
* Single-tap / Push-to-Talk mic with VAD silence trimming.
* Supports multi-item code-mixed billing + split payments (`Cash + UPI + Udhaar`) + due date scheduling (default: end of month) + tax/discounts.
* **Walk-in default:** Cash/UPI sales need zero customer ID; customer identity is required only when `udhaar > 0`.
* **Hold-Carts:** *"Iska hold karo, naya bill"* parks Cart #1 in top tabs and opens Cart #2 for interrupting buyers.
* **Mid-flow voice edits:** *"Nahi, 2 nahi 1 kilo"* or *"Last item hatao"* mutates the active Draft Card in place.
* **Disambiguation:** Multiple matches (e.g., two `"Ramesh"` customers) highlight candidate chips and prompt briefly by voice.

### F3. Immutable *Khata* Ledger & Behavioral Risk Traffic Light
* **Append-only `ledger_entries`:** Never rolls unpaid *udhaar* into new bill line items (avoids double-counting sales and corrupting GST). Receipts print `Current Bill + Previous Balance = Total Payable`.
* **Void & Returns:** Uses `VOID_REVERSAL` / `RETURN_CREDIT` entries—never `DELETE`.
* **Risk Indicator:** `GREEN` / `AMBER` / `RED` badge on Draft Card when extending credit. Distinguishes **consistent monthly-cycle payers** (e.g., settles on the 5th) from chronic overdue accounts.

### F4. *Chhota Kharcha* (*Galla* Cash Expenses)
* Voice-logged cash drawer outflows: *"200 rupaye chai aur transport kharcha"* (`CASH_EXPENSE`) vs. *"Ghar ke liye 500 nikala"* (`OWNER_DRAW`) vs. supplier payments (`SUPPLIER_PAY`).
* Keeps EOD `Expected Cash in Galla` accurate.

### F5. Inventory, Bulk UoM & Dual Expiration Engine
* **Bulk UoM Conversion:** Buy in `bori`/`peti`, deduct in `g`/`ml`/`pcs`.
* **Packed Items (`inventory_batches`):** Multiple expiry batches per SKU; sales deduct via **FEFO (First-Expired, First-Out)**; alerts within configurable days (`<= 5 days`).
* **Loose Items (`loose_bins`):** Tracks `last_restocked_at`, `bin_last_emptied_at`, and category `freshness_window_days` (e.g., loose *atta* 35d, whole dal 120d) to flag stale/unrotated bins.
* **Dynamic Reorder Thresholds:** `(Weighted 7/30-day velocity * supplier lead time) + safety buffer`, with manual threshold fallback during the first 14 days (cold-start protection).
* **Dead-Stock Alert:** Flags slow-moving inventory (`0` sales in 30 days) with seasonal snooze option.

### F6. Voice Q&A (*"Bol ke Poocho"*) & Daily Copilot (`pg-boss`)
* **Parameterized Voice Q&A:** Maps spoken questions (*"Aaj galla mein kitna cash hona chahiye?"*, *"Paisa kahan phansa hai?"*) to audited read-only SQL templates—never raw LLM-generated SQL.
* **EOD Report (21:30 cron / manual trigger):** Drawer cash reconciliation (`Opening + Cash Sales + Cash Collections - Cash Expenses - Supplier Cash Paid`), UPI total, and supplier-grouped restock list.
* **Morning Copilot (07:00 cron / manual trigger):** Surfaces near-expiry clearance markdowns, stale loose bins, overdue *udhaar* call/SMS list, and optional loose-commodity mandi price advisories for **shopkeeper approval** (never auto-mutates prices).

---

## 3. Deferred to V2 (Out of Active Hackathon Build)
* **WhatsApp Business Cloud API Bot:** Currently on hold. Keep `reminder_outbox` table as a clean outbox hook; in V1 show on-screen receipts + dynamic UPI QR (`upi://pay?...`) + native call/SMS buttons.
* **Android Silent UPI SMS Listener:** Blocked in PWA; simulate payment confirmation via 1-tap or test webhook button in V1.
* **Distributor *Parchaa* Photo OCR:** Stretch goal (`Gemini Flash Vision` -> `PurchaseDraft` review); add only after Flows F1–F6 pass E2E QA.
