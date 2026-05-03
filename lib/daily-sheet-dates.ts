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
