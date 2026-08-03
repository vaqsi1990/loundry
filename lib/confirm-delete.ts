const DEFAULT_SECOND_MESSAGE =
  "ეს მოქმედება შეუქცევადია. გთხოვთ, კიდევ ერთხელ დაადასტუროთ.";

/** Requires two consecutive confirmations before a delete proceeds. */
export function confirmDelete(
  message: string,
  secondMessage: string = DEFAULT_SECOND_MESSAGE
): boolean {
  if (!confirm(message)) return false;
  return confirm(secondMessage);
}
