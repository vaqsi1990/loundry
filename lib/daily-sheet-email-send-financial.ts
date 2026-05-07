/**
 * იგივე ფასის ლოგიკა რაც `send-email` routes-ს აქვს, მაგრამ გამოითვლება ლაივად
 * `dailySheet`-ის მიხედვით — რადგან ფურცელი შეიძლება შეიცვალოს გაგზავნის შემდეგ.
 */

import {
  HEAVY_WEIGHT_ITEM_KA,
  HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY,
  heavyWeightProtectorsDispatchedQty,
  heavyWeightProtectorsKgUnitPriceGel,
  heavyWeightProtectorsLineAmountGel,
} from "./daily-sheet-heavy-weight";

export type DailySheetForTotals = {
  sheetType?: string | null;
  totalWeight?: number | null;
  totalPrice?: number | null;
  pricePerKg?: number | null;
  heavyWeight?: number | null;
  heavyPricePerKg?: number | null;
  items?: Array<{
    category?: string | null;
    itemNameKa?: string | null;
    weight?: unknown;
    totalWeight?: unknown;
    dispatched?: unknown;
    price?: unknown;
  }> | null;
};

export function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function summedItemLineWeightKg(
  sheet: DailySheetForTotals | null | undefined
): number {
  const items = sheet?.items ?? [];
  return items.reduce((s, i) => s + num(i.totalWeight ?? i.weight), 0);
}

/** როგორც send-email ში `weightForPrice` — თეთრეულის ₾/კგ საორდეში (სანამ სუფრებს იყოფ). */
export function liveLinensWeightBasisKg(
  sheet: DailySheetForTotals | null | undefined
): number {
  if (!sheet) return 0;
  const summed = summedItemLineWeightKg(sheet);
  if (sheet.totalWeight != null && num(sheet.totalWeight) > 0) return num(sheet.totalWeight);
  return summed;
}

/** იგივე ველი რასაც DailySheetEmailSend.totalWeight ინახავდა გაგზავნისას */
export function liveDisplayedTotalWeightKg(
  sheet: DailySheetForTotals | null | undefined
): number {
  if (!sheet) return 0;
  if (sheet.totalWeight != null) return num(sheet.totalWeight);
  return summedItemLineWeightKg(sheet);
}

/** მძიმე წონის ₾ ჯამი დამოუკიდებლად — დამცავების ზოგად ჯამში არ მოიაზრება. */
export function liveHeavyWeightAmountGel(
  sheet: DailySheetForTotals | null | undefined
): number {
  // Prefer explicit sheet fields; fall back to legacy «მძიმე წონა» PROTECTORS line.
  // In the wild we sometimes see BOTH representations populated but inconsistent
  // (e.g. a stale heavyWeight field + a correct legacy row). To avoid undercounting
  // on invoices and monthly summaries, we take the larger of the two totals.
  const byFieldKg = num(sheet?.heavyWeight);
  const byFieldUnit = num(sheet?.heavyPricePerKg);
  const byField = byFieldKg > 0 && byFieldUnit > 0 ? byFieldKg * byFieldUnit : 0;

  const legacy = heavyWeightProtectorsLineAmountGel(
    sheet?.items ?? [],
    HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY
  );

  return Math.max(byField, legacy);
}

/** მძიმე წონის კგ — `sheet.heavyWeight`, თორემ legacy «მძიმე წონა» ხაზის dispatched ჯამი. */
export function liveHeavyWeightKg(
  sheet: DailySheetForTotals | null | undefined
): number {
  const byField = num(sheet?.heavyWeight);
  const legacy = heavyWeightProtectorsDispatchedQty(sheet?.items ?? []);
  if (byField <= 0 && legacy <= 0) return 0;
  // Avoid undercount when both exist but disagree.
  return Math.max(byField, legacy);
}

/** მძიმე წონის ₾/კგ — `sheet.heavyPricePerKg`, თორემ legacy «მძიმე წონა» ხაზის price. */
export function liveHeavyWeightPricePerKgGel(
  sheet: DailySheetForTotals | null | undefined
): number {
  const byField = num(sheet?.heavyPricePerKg);
  if (byField > 0) return byField;
  return heavyWeightProtectorsKgUnitPriceGel(
    sheet?.items ?? [],
    HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY
  );
}

/**
 * ინვოისის PDF / ჩვენება: legacy ხაზზე ხშირია ₾/კგ მომრგვალება (მაგ. 2.47); თუ სტანდარტულ მძიმე ტარიფთან ახლოსაა,
 * ვაჩვენებთ ტარიფს (იგივე რაც `HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY`-ში).
 */
export function liveHeavyWeightInvoiceDisplayPricePerKgGel(
  sheet: DailySheetForTotals | null | undefined
): number {
  const tariff =
    HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY[HEAVY_WEIGHT_ITEM_KA] ?? 0;
  const p = liveHeavyWeightPricePerKgGel(sheet);
  const nearTariff = (x: number) =>
    tariff > 0 && x > 0 && Math.abs(x - tariff) <= 0.08;

  if (nearTariff(p)) return tariff;
  if (p > 0) return p;

  const amt = liveHeavyWeightAmountGel(sheet);
  const kg = liveHeavyWeightKg(sheet);
  if (kg > 0 && amt > 0 && nearTariff(amt / kg)) return tariff;

  return p;
}

/** დამცავები — მძიმე წონა გამოყოფილია (sheet.heavyWeight ველებში), ამიტომ STANDARD-ისთვის
 * `sheet.totalPrice` ბრუნდება როგორც-არის, INDIVIDUAL-ისთვის — items-ის ხაზობრივი ჯამი
 * (მძიმე წონის ხაზის გარდა). ძველ ფურცლებზე, სადაც totalPrice-ში მძიმე წონაც იყო ჩათვლილი,
 * მას ვაკლებთ. */
export function liveProtectorsAmount(
  sheet: DailySheetForTotals | null | undefined
): number {
  if (sheet?.totalPrice != null && num(sheet.totalPrice) > 0) {
    const items = sheet.items ?? [];
    if (!items.length) return num(sheet.totalPrice);
    const legacyHeavyAmt = heavyWeightProtectorsLineAmountGel(
      items,
      HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY
    );
    return Math.max(0, num(sheet.totalPrice) - legacyHeavyAmt);
  }
  if (!sheet?.items?.length) return 0;
  return sheet.items
    .filter(
      (p) =>
        p.category === "PROTECTORS" &&
        p.itemNameKa !== HEAVY_WEIGHT_ITEM_KA
    )
    .reduce((sum, p) => sum + num(p.price) * num(p.dispatched), 0);
}

/** «მძიმე წონა»-ს გარდა დამცავების ხაზების წონის ჯამი (ხაზის totalWeight/weight). */
export function liveProtectorsWeightKg(
  sheet: DailySheetForTotals | null | undefined
): number {
  if (!sheet?.items?.length) return 0;
  return sheet.items
    .filter(
      (p) =>
        p.category === "PROTECTORS" &&
        p.itemNameKa !== HEAVY_WEIGHT_ITEM_KA
    )
    .reduce((sum, p) => sum + num(p.totalWeight ?? p.weight), 0);
}

/** დამცავების ხაზებზე გაგზავნილი (ცალი) ჯამი — იგივე ფილტრი რაც ფასზე. */
export function liveProtectorsDispatchedPieces(
  sheet: DailySheetForTotals | null | undefined
): number {
  if (!sheet?.items?.length) return 0;
  return sheet.items
    .filter(
      (p) =>
        p.category === "PROTECTORS" &&
        p.itemNameKa !== HEAVY_WEIGHT_ITEM_KA
    )
    .reduce((sum, p) => sum + num(p.dispatched), 0);
}

/** ჯერ ცდილობს `sheet.pricePerKg`, წინააღმდეგ შემთხვევაში სასტუმროს default (ან email-send snapshot). */
export function effectiveKgPriceFromSheetAndDefault(
  sheet: DailySheetForTotals | null | undefined,
  defaultPricePerKg: number
): number {
  const p = sheet?.pricePerKg;
  const n = p != null ? num(p) : 0;
  return n > 0 ? n : num(defaultPricePerKg) || 1.8;
}

const TABLECLOTH_KG_PRICE = 3.0;

/**
 * თეთრეული + პირსახოცები (სუფრების დაშლით) იგივე წესით რაც იურიდიული ინვოისების როუტს ჰქონდა.
 */
export function liveLinenTowelsAmountGel(
  sheet: DailySheetForTotals | null | undefined,
  defaultPricePerKg: number
): number {
  const items = sheet?.items ?? [];
  if (!items.length) return 0;

  const priceKg = effectiveKgPriceFromSheetAndDefault(sheet, defaultPricePerKg);

  // A tablecloth line counts only if it has a real (positive) weight.
  // Otherwise, an empty template-row named "სუფრები" (e.g. on STANDARD sheets where weights live on `sheet.totalWeight`)
  // would zero-out the entire linens amount.
  const tableclothsItems = items.filter(
    (item) =>
      item.itemNameKa?.toLowerCase().includes("სუფრ") &&
      num(item.totalWeight ?? item.weight) > 0
  );
  const hasTablecloths = tableclothsItems.length > 0;

  if (!hasTablecloths) {
    const wfp = liveLinensWeightBasisKg(sheet);
    return wfp > 0 ? wfp * priceKg : 0;
  }

  const tableclothsWeight = tableclothsItems.reduce(
    (sum, item) => sum + num(item.totalWeight ?? item.weight),
    0
  );

  const regularItems = items.filter(
    (item) => !item.itemNameKa?.toLowerCase().includes("სუფრ")
  );
  const regularItemsWeight = regularItems.reduce(
    (sum, item) => sum + num(item.totalWeight ?? item.weight),
    0
  );
  const regularWeight =
    regularItemsWeight > 0
      ? regularItemsWeight
      : Math.max(0, liveLinensWeightBasisKg(sheet) - tableclothsWeight);

  let itemAmount = 0;
  if (regularWeight > 0) itemAmount += regularWeight * priceKg;
  if (tableclothsWeight > 0)
    itemAmount += tableclothsWeight * TABLECLOTH_KG_PRICE;
  return itemAmount;
}

export function liveGrandTotalAmountGel(
  sheet: DailySheetForTotals | null | undefined,
  defaultPricePerKg: number
): number {
  return (
    liveLinenTowelsAmountGel(sheet, defaultPricePerKg) +
    liveHeavyWeightAmountGel(sheet) +
    liveProtectorsAmount(sheet)
  );
}

/** Set by invoice PATCH after this feature: `totalAmount` is always BASE (no heavy). Legacy rows omit this. */
export const INVOICE_MANUAL_TOTAL_STORED_AS_BASE_KEY = "invoiceManualTotalStoredAsBase";

export function invoiceManualTotalStoredAsBaseFromPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  return (
    (payload as Record<string, unknown>)[INVOICE_MANUAL_TOTAL_STORED_AS_BASE_KEY] === true
  );
}

/** Merge payload when saving manual total: mark new saves as base-only; clear flag when override cleared. */
export function mergeInvoiceManualTotalPayload(
  existingPayload: unknown,
  totalAmountVal: number | null
): Record<string, unknown> {
  const base =
    existingPayload &&
    typeof existingPayload === "object" &&
    !Array.isArray(existingPayload)
      ? { ...(existingPayload as Record<string, unknown>) }
      : {};
  if (totalAmountVal === null || !(totalAmountVal > 0)) {
    delete base[INVOICE_MANUAL_TOTAL_STORED_AS_BASE_KEY];
  } else {
    base[INVOICE_MANUAL_TOTAL_STORED_AS_BASE_KEY] = true;
  }
  return base;
}

/**
 * Normalizes stored `emailSend.totalAmount` into manual BASE total (linens+towels+protectors, excluding heavy).
 * Some legacy rows stored a grand total (heavy already included).
 */
export function effectiveManualBaseOverrideGel(
  storedTotalAmount: number | null | undefined,
  sheet: DailySheetForTotals | null | undefined,
  defaultPricePerKg: number,
  opts?: { storedManualTotalAsBase?: boolean }
): number | null {
  if (storedTotalAmount == null) return null;
  const raw = num(storedTotalAmount);
  if (!(raw > 0)) return null;

  const heavy = liveHeavyWeightAmountGel(sheet);
  const grand = liveGrandTotalAmountGel(sheet, defaultPricePerKg);

  // Saves after PATCH always store BASE; never reinterpret as legacy grand.
  if (opts?.storedManualTotalAsBase === true) {
    return raw;
  }

  const baseFromGrand = Math.max(0, num(grand) - num(heavy));
  const epsilon = 0.02;
  const looksLikeGrand =
    heavy > 0 &&
    (Math.abs(raw - grand) <= epsilon || raw > baseFromGrand + heavy * 0.9);

  return looksLikeGrand ? Math.max(0, raw - heavy) : raw;
}

/** Base total for invoice list/API rows: manual override when set, else computed from sheet. */
export function invoiceListBaseTotalAmountGel(
  storedTotalAmount: number | null | undefined,
  sheet: DailySheetForTotals | null | undefined,
  defaultPricePerKg: number,
  payload?: unknown
): number {
  const storedAsBase = invoiceManualTotalStoredAsBaseFromPayload(payload);
  const manualEff = effectiveManualBaseOverrideGel(
    storedTotalAmount,
    sheet,
    defaultPricePerKg,
    { storedManualTotalAsBase: storedAsBase }
  );
  if (manualEff != null) return manualEff;

  const heavy = liveHeavyWeightAmountGel(sheet);
  const grand = liveGrandTotalAmountGel(sheet, defaultPricePerKg);
  return Math.max(0, num(grand) - num(heavy));
}

export type InvoicePdfLineItem = {
  description: string;
  quantity: string;
  unitPrice: number;
  total: number;
};

export type InvoicePdfEmailSendLike = {
  date: Date | string;
  dailySheet: DailySheetForTotals | null | undefined;
  /** Optional manual override for the whole day's total (₾). When set, PDF uses this instead of recalculating from dailySheet. */
  totalAmountOverrideGel?: number | null;
  /** When true, override value was saved as BASE (post-fix PATCH); skip legacy grand reinterpretation. */
  invoiceManualTotalStoredAsBase?: boolean;
};

function invoicePdfDateLabelDdMmYy(d: Date | string): string {
  const x = new Date(d);
  return `${x.getDate().toString().padStart(2, "0")}.${(x.getMonth() + 1).toString().padStart(2, "0")}.${x.getFullYear().toString().slice(-2)}`;
}

function invoicePdfDaySortKey(d: Date | string): string {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** PDF «მძიმე წონა» ხაზის ₾/კგ სვეტი: ნომინალური ფასი ფურცლიდან (არა ჯამი÷კგ — იქ მომრგვალება იძლევა მაგ. 2.47-ს 2.5-ის ნაცვლად). */
function accumulateHeavyPdfDisplayUnit(
  ds: DailySheetForTotals | null | undefined,
  hwAmt: number,
  hwKg: number,
  state: { numerator: number; kg: number }
): void {
  if (hwKg <= 0 || hwAmt <= 0) return;
  const tariff =
    HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY[HEAVY_WEIGHT_ITEM_KA] ?? 0;
  const inferred = hwAmt / hwKg;
  const nearTariff =
    tariff > 0 && inferred > 0 && Math.abs(inferred - tariff) <= 0.08;

  // Prefer nominal tariff when this day's billed ₾/kg (amount÷kg) matches it — before using
  // sheet row `price`, which can disagree with max(byField, legacy) amount/kg and skew an
  // invoice-level weighted average (e.g. blended column shows 2.47 instead of 2.5).
  if (nearTariff) {
    state.numerator += tariff * hwKg;
    state.kg += hwKg;
    return;
  }

  const p = liveHeavyWeightInvoiceDisplayPricePerKgGel(ds);
  if (p > 0) {
    state.numerator += p * hwKg;
    state.kg += hwKg;
  } else {
    state.numerator += hwAmt;
    state.kg += hwKg;
  }
}

/**
 * ინვოისის PDF: თითო დღეზე აღწერაში DD.MM.YY, «წონა (კგ)/ცალი» სვეტში კგ; ბოლოს მძიმე/დამცავების ჯამები იგივე სვეტით შევსებული.
 */
export function invoicePdfLineItemsFromSortedSends(
  sends: ReadonlyArray<InvoicePdfEmailSendLike>,
  defaultPricePerKg: number
): InvoicePdfLineItem[] {
  const linenByDay = new Map<
    string,
    { dateStr: string; kg: number; amt: number }
  >();
  let heavySum = 0;
  let heavyKgSum = 0;
  const heavyPdfDisplayUnit = { numerator: 0, kg: 0 };
  let protSum = 0;
  let protKgSum = 0;
  let protPiecesSum = 0;
  const manualTotalByDay = new Map<string, { dateStr: string; total: number }>();

  for (const send of sends) {
    const ds = send.dailySheet;
    const key = invoicePdfDaySortKey(send.date);

    const manual = num(send.totalAmountOverrideGel);
    if (manual > 0) {
      // `manual` (saved `emailSend.totalAmount`) is the BASE total for the day —
      // linens + towels + protectors, EXCLUDING heavy weight. Heavy weight is added
      // as a separate line so it stays visible on the invoice. This matches the
      // admin/manager UI which renders heavy weight as a distinct column and the
      // grand total as base + heavy.
      if (ds) {
        const hwAmt = liveHeavyWeightAmountGel(ds);
        const hwKg = liveHeavyWeightKg(ds);
        const pAmt = liveProtectorsAmount(ds);
        const pKg = liveProtectorsWeightKg(ds);
        const pPieces = liveProtectorsDispatchedPieces(ds);

        // Legacy: grand stored in `totalAmount` — normalize via same rule as invoice list.
        const manualBase =
          effectiveManualBaseOverrideGel(manual, ds, defaultPricePerKg, {
            storedManualTotalAsBase: send.invoiceManualTotalStoredAsBase === true,
          }) ?? manual;

        heavySum += hwAmt;
        heavyKgSum += hwKg;
        accumulateHeavyPdfDisplayUnit(ds, hwAmt, hwKg, heavyPdfDisplayUnit);
        protSum += pAmt;
        protKgSum += pKg;
        protPiecesSum += pPieces;

        const kg = liveLinensWeightBasisKg(ds);
        const linenAmt = Math.max(0, manualBase - pAmt);
        if (kg > 0 || linenAmt > 0) {
          const prev = linenByDay.get(key);
          if (prev) {
            linenByDay.set(key, {
              dateStr: prev.dateStr,
              kg: prev.kg + kg,
              amt: prev.amt + linenAmt,
            });
          } else {
            linenByDay.set(key, {
              dateStr: invoicePdfDateLabelDdMmYy(send.date),
              kg,
              amt: linenAmt,
            });
          }
        }
        continue;
      }

      manualTotalByDay.set(key, {
        dateStr: invoicePdfDateLabelDdMmYy(send.date),
        total: manual,
      });
      continue;
    }

    const kg = liveLinensWeightBasisKg(ds);
    const amt = liveLinenTowelsAmountGel(ds, defaultPricePerKg);
    if (kg > 0 || amt > 0) {
      const prev = linenByDay.get(key);
      if (prev) {
        linenByDay.set(key, {
          dateStr: prev.dateStr,
          kg: prev.kg + kg,
          amt: prev.amt + amt,
        });
      } else {
        linenByDay.set(key, {
          dateStr: invoicePdfDateLabelDdMmYy(send.date),
          kg,
          amt,
        });
      }
    }
    const hwAmt = liveHeavyWeightAmountGel(ds);
    const hwKg = liveHeavyWeightKg(ds);
    heavySum += hwAmt;
    heavyKgSum += hwKg;
    accumulateHeavyPdfDisplayUnit(ds, hwAmt, hwKg, heavyPdfDisplayUnit);
    protSum += liveProtectorsAmount(ds);
    protKgSum += liveProtectorsWeightKg(ds);
    protPiecesSum += liveProtectorsDispatchedPieces(ds);
  }

  const rows: InvoicePdfLineItem[] = [];
  const sortedKeys = Array.from(linenByDay.keys()).sort();
  for (const key of sortedKeys) {
    const { dateStr, kg, amt } = linenByDay.get(key)!;
    const unitPrice = kg > 0 ? amt / kg : amt > 0 ? amt : 0;
    const kgDisplay = kg > 0 ? kg.toFixed(1) : "0.0";
    rows.push({
      description: dateStr,
      quantity: `${kgDisplay} კგ.`,
      unitPrice,
      total: amt,
    });
  }

  if (heavySum > 0) {
    const heavyQty =
      heavyKgSum > 0 ? `${heavyKgSum.toFixed(1)} კგ.` : "1 ც.";
    let heavyUnitDisplay =
      heavyPdfDisplayUnit.kg > 0
        ? heavyPdfDisplayUnit.numerator / heavyPdfDisplayUnit.kg
        : heavyKgSum > 0
          ? heavySum / heavyKgSum
          : heavySum;

    const tariffHeavyPdfRow =
      HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY[HEAVY_WEIGHT_ITEM_KA] ?? 0;
    if (
      heavyKgSum > 0 &&
      tariffHeavyPdfRow > 0 &&
      Math.abs(heavySum / heavyKgSum - tariffHeavyPdfRow) <= 0.08
    ) {
      heavyUnitDisplay = tariffHeavyPdfRow;
    }

    rows.push({
      description: "მძიმე წონა - ჯამი",
      quantity: heavyQty,
      unitPrice: heavyKgSum > 0 ? heavyUnitDisplay : heavySum,
      total: heavySum,
    });
  }

  if (protSum > 0) {
    let protQty: string;
    if (protKgSum > 0) {
      protQty = `${protKgSum.toFixed(1)} კგ.`;
    } else if (protPiecesSum > 0) {
      const p = protPiecesSum;
      protQty =
        Math.abs(p - Math.round(p)) < 1e-6
          ? `${Math.round(p)} ც.`
          : `${p.toFixed(1)} ც.`;
    } else {
      protQty = "1 ც.";
    }
    const protUnit =
      protKgSum > 0
        ? protSum / protKgSum
        : protPiecesSum > 0
          ? protSum / protPiecesSum
          : protSum;
    rows.push({
      description: "დამცავები - ჯამი",
      quantity: protQty,
      unitPrice: protUnit,
      total: protSum,
    });
  }

  // Append manual-total rows at the end (so they are visible even when there is a normal breakdown list).
  const manualKeys = Array.from(manualTotalByDay.keys()).sort();
  for (const key of manualKeys) {
    const m = manualTotalByDay.get(key)!;
    rows.push({
      description: `${m.dateStr} `,
      quantity: "1 ც.",
      unitPrice: m.total,
      total: m.total,
    });
  }

  return rows;
}
