/** Hotel VAT flag (დღგ). */
export const HOTEL_HAS_DGG_LABEL = "დღგ";

export function normalizeHotelNameForMatch(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hasDggLookupFromHotels(
  hotels: Array<{ hotelName: string; hasDgg: boolean }>
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const hotel of hotels) {
    map.set(normalizeHotelNameForMatch(hotel.hotelName), hotel.hasDgg);
  }
  return map;
}

export function parseHasDggInput(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return Boolean(value);
}
