/** Protector line labeled «მძიმე წონა» in daily sheets (per-kg surcharge). */

export const HEAVY_WEIGHT_ITEM_KA = "მძიმე წონა";

type ItemLike = {
  category?: string | null;
  itemNameKa?: string | null;
  dispatched?: unknown;
  price?: unknown;
};

/** ₾ per 1 kg for the «მძიმე წონა» line (`price` on row, else fallback map). First matching row wins. */
export function heavyWeightProtectorsKgUnitPriceGel(
  items: ReadonlyArray<ItemLike>,
  unitPriceFallbackByItemNameKa: Record<string, number>
): number {
  for (const item of items) {
    if (item.category !== "PROTECTORS" || item.itemNameKa !== HEAVY_WEIGHT_ITEM_KA)
      continue;
    return (
      Number(item.price) ||
      unitPriceFallbackByItemNameKa[item.itemNameKa ?? ""] ||
      0
    );
  }
  return 0;
}

/** Line total ₾ — per-kg price × გაგზავნილი (ც.), summed if several rows match. */
export function heavyWeightProtectorsLineAmountGel(
  items: ReadonlyArray<ItemLike>,
  unitPriceFallbackByItemNameKa: Record<string, number>
): number {
  return items.reduce((sum, item) => {
    if (item.category !== "PROTECTORS" || item.itemNameKa !== HEAVY_WEIGHT_ITEM_KA)
      return sum;
    const unitPrice =
      Number(item.price) ||
      unitPriceFallbackByItemNameKa[item.itemNameKa ?? ""] ||
      0;
    const qty = Number(item.dispatched ?? 0);
    const q = Number.isFinite(qty) ? qty : 0;
    return sum + unitPrice * q;
  }, 0);
}
