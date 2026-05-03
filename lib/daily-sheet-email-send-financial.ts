/**
 * იგივე ფასის ლოგიკა რაც `send-email` routes-ს აქვს, მაგრამ გამოითვლება ლაივად
 * `dailySheet`-ის მიხედვით — რადგან ფურცელი შეიძლება შეიცვალოს გაგზავნის შემდეგ.
 */

import {
  HEAVY_WEIGHT_ITEM_KA,
  HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY,
  heavyWeightProtectorsLineAmountGel,
} from "./daily-sheet-heavy-weight";

export type DailySheetForTotals = {
  sheetType?: string | null;
  totalWeight?: number | null;
  totalPrice?: number | null;
  pricePerKg?: number | null;
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
  if (sheet.sheetType === "STANDARD" && sheet.totalWeight != null) {
    return num(sheet.totalWeight);
  }
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
export function liveHeavyWeightProtectorsAmount(
  sheet: DailySheetForTotals | null | undefined
): number {
  return heavyWeightProtectorsLineAmountGel(
    sheet?.items ?? [],
    HEAVY_WEIGHT_AMOUNT_FALLBACK_GEL_ONLY
  );
}

/** დამცავები (სტანდარტულ ლუმპში შედება სრული თანხა — მძიმეს ვიკლავთ ხაზებიდან გამოთვლით) — მძიმე წონის გარეშე */
export function liveProtectorsAmount(
  sheet: DailySheetForTotals | null | undefined
): number {
  if (!sheet?.items?.length) return 0;
  const heavyAmt = liveHeavyWeightProtectorsAmount(sheet);
  if (sheet.sheetType === "STANDARD" && sheet.totalPrice != null) {
    return Math.max(0, num(sheet.totalPrice) - heavyAmt);
  }
  return sheet.items
    .filter(
      (p) =>
        p.category === "PROTECTORS" &&
        p.itemNameKa !== HEAVY_WEIGHT_ITEM_KA
    )
    .reduce((sum, p) => sum + num(p.price) * num(p.dispatched), 0);
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
    liveProtectorsAmount(sheet) +
    liveHeavyWeightProtectorsAmount(sheet)
  );
}
