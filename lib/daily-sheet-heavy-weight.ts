/** Protector line labeled «მძიმე წონა» in daily sheets (per-unit surcharge). */

export const HEAVY_WEIGHT_ITEM_KA = "მძიმე წონა";

type ItemLike = {
  category?: string | null;
  itemNameKa?: string | null;
  dispatched?: unknown;
  price?: unknown;
};

/** Same unit logic as UI: `price` on the line, else `unitPriceFallbackByItemNameKa`. */
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
