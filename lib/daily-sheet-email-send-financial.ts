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
  // Manual override: if totalWeight is set, prefer it regardless of sheetType.
  // This enables invoice edits to affect totals even for INDIVIDUAL sheets.
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

/** მძიმე წონის ₾ ჯამი დამოუკიდებლად — დამცავების ზოგად ჯამში არ მოიაზრება */
export function liveHeavyWeightAmountGel(
  sheet: DailySheetForTotals | null | undefined
): number {
  const hw = sheet?.heavyWeight;
  const hp = sheet?.heavyPricePerKg;
  const byFields = num(hw) * num(hp);
  if (byFields > 0) return byFields;
  return heavyWeightProtectorsLineAmountGel(
    sheet?.items ?? [],
    HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY
  );
}

/** მძიმე წონის კგ (sheet.heavyWeight თუ არის, თორემ legacy «მძიმე წონა» ხაზის dispatched ჯამი). */
export function liveHeavyWeightKg(
  sheet: DailySheetForTotals | null | undefined
): number {
  const hw = sheet?.heavyWeight;
  const byFields = num(hw);
  if (byFields > 0) return byFields;
  return heavyWeightProtectorsDispatchedQty(
    sheet?.items ?? []
  );
}

/** მძიმე წონის ₾/კგ (sheet.heavyPricePerKg თუ არის, თორემ legacy «მძიმე წონა» ხაზის price). */
export function liveHeavyWeightPricePerKgGel(
  sheet: DailySheetForTotals | null | undefined
): number {
  const hp = sheet?.heavyPricePerKg;
  const byFields = num(hp);
  if (byFields > 0) return byFields;
  return heavyWeightProtectorsKgUnitPriceGel(
    sheet?.items ?? [],
    HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY
  );
}

/** დამცავები (სტანდარტულ ლუმპში შედება სრული თანხა — მძიმეს ვიკლავთ ხაზებიდან გამოთვლით) — მძიმე წონის გარეშე */
export function liveProtectorsAmount(
  sheet: DailySheetForTotals | null | undefined
): number {
  // Manual override: if totalPrice is set, prefer it even if items are missing.
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
  // New: heavy weight is stored separately on the sheet, so do not subtract it from protectors totalPrice.
  // Back-compat: some legacy data stored heavy-weight line inside protectors totalPrice (handled in override branch above).
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

  const hasTablecloths = items.some((item) =>
    item.itemNameKa?.toLowerCase().includes("სუფრ")
  );

  if (!hasTablecloths) {
    const wfp = liveLinensWeightBasisKg(sheet);
    return wfp > 0 ? wfp * priceKg : 0;
  }

  const tableclothsItems = items.filter((item) =>
    item.itemNameKa?.toLowerCase().includes("სუფრ")
  );
  const regularItems = items.filter(
    (item) => !item.itemNameKa?.toLowerCase().includes("სუფრ")
  );

  const tableclothsWeight = tableclothsItems.reduce(
    (sum, item) => sum + num(item.totalWeight ?? item.weight),
    0
  );
  const regularWeight = regularItems.reduce(
    (sum, item) => sum + num(item.totalWeight ?? item.weight),
    0
  );

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
  let protSum = 0;
  let protKgSum = 0;
  let protPiecesSum = 0;
  const manualTotalByDay = new Map<string, { dateStr: string; total: number }>();

  for (const send of sends) {
    const ds = send.dailySheet;
    const key = invoicePdfDaySortKey(send.date);

    const manual = num(send.totalAmountOverrideGel);
    if (manual > 0) {
      // If a manual total is provided for this day, prefer it and skip component breakdowns for that send.
      // This makes the PDF total match the edited "სულ (₾)" in invoices UI.
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
    heavySum += liveHeavyWeightAmountGel(ds);
    heavyKgSum += liveHeavyWeightKg(ds);
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
    rows.push({
      description: "მძიმე წონა - ჯამი",
      quantity: heavyQty,
      unitPrice: heavyKgSum > 0 ? heavySum / heavyKgSum : heavySum,
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
