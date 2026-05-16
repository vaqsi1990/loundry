/** YYYY-MM საერთო ფურცლის date-ზე (Date @db.Date ან ISO სტრიქონი) — UTC-safe. */
export function monthKeyFromSheetDate(date: string | Date): string {
  if (typeof date === "string") {
    const part = date.split("T")[0] ?? "";
    const segs = part.split("-");
    if (segs.length >= 2 && segs[0] && segs[1]) {
      const y = segs[0];
      const m = segs[1].padStart(2, "0");
      return `${y}-${m}`;
    }
  }
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const GEORGIAN_MONTH_NAMES = [
  "იანვარი",
  "თებერვალი",
  "მარტი",
  "აპრილი",
  "მაისი",
  "ივნისი",
  "ივლისი",
  "აგვისტო",
  "სექტემბერი",
  "ოქტომბერი",
  "ნოემბერი",
  "დეკემბერი",
] as const;

/** Distinct YYYY-MM keys from sheet list (for month filter dropdown). */
export function monthKeysFromSheetList<T extends { date: string | Date }>(
  sheets: T[]
): string[] {
  const months = new Set<string>();
  for (const sheet of sheets) {
    const key = monthKeyFromSheetDate(sheet.date);
    if (key) months.add(key);
  }
  return Array.from(months).sort().reverse();
}

export function formatMonthGeLabel(monthKey: string): string {
  const [year, monthNum] = monthKey.split("-");
  const monthIndex = parseInt(monthNum, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return monthKey;
  return `${GEORGIAN_MONTH_NAMES[monthIndex]} ${year}`;
}

/** YYYY-MM-DD იგივე წყაროდან. */
export function dayKeyFromSheetDate(date: string | Date): string {
  if (typeof date === "string") return date.split("T")[0] ?? "";
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
