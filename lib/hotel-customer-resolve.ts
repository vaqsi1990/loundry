/**
 * ინვოისის customerName შეიძლება იყოს შპს/იურიდიული სახელი ან ფიზ. პირის სახელი,
 * ხოლო UI-ში ვაჩვენებთ სასტუმროს დასახელებას (hotelName).
 */

export type HotelCustomerResolveFields = {
  hotelName: string;
  type: string;
  legalEntityName: string | null;
  companyName: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function normalizeHotelName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function buyerNameFromHotel(hotel: HotelCustomerResolveFields): string {
  return hotel.type === "LEGAL"
    ? hotel.legalEntityName?.trim() ||
        hotel.companyName?.trim() ||
        hotel.hotelName
    : [hotel.firstName?.trim(), hotel.lastName?.trim()].filter(Boolean).join(" ") ||
        hotel.hotelName;
}

/** ყველა ვარიანტი, რომელიც ინვოისზე customerName-ად შეიძლება დაეწეროს. */
export function hotelCustomerNameVariants(hotel: HotelCustomerResolveFields): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string | null | undefined) => {
    const trimmed = (s ?? "").trim();
    const key = normalizeHotelName(trimmed);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  add(hotel.hotelName);
  add(hotel.legalEntityName);
  add(hotel.companyName);
  add(buyerNameFromHotel(hotel));
  return out;
}

export function createHotelDisplayNameResolver(
  hotels: HotelCustomerResolveFields[]
): (customerName: string) => string {
  const byNormalized = new Map<string, HotelCustomerResolveFields>();
  for (const hotel of hotels) {
    for (const variant of hotelCustomerNameVariants(hotel)) {
      const key = normalizeHotelName(variant);
      if (key && !byNormalized.has(key)) {
        byNormalized.set(key, hotel);
      }
    }
  }
  return (customerName: string) => {
    const key = normalizeHotelName(customerName);
    if (!key) return customerName;
    const hotel = byNormalized.get(key);
    return hotel?.hotelName?.trim() || customerName;
  };
}
