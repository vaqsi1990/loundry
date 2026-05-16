/** Case-insensitive email comparison for profile updates. */
export function emailsMatch(
  a: string | undefined | null,
  b: string | undefined | null
): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

/**
 * True when the submitted email should update User.email (login).
 * Skips when the value is unchanged hotel contact email — avoids false
 * "email already in use" when editing other hotel fields.
 */
export function shouldUpdateUserLoginEmail(
  incoming: string | undefined,
  userEmail: string | null | undefined,
  hotelEmail: string | null | undefined
): boolean {
  const trimmed = incoming?.trim();
  if (!trimmed) return false;
  if (emailsMatch(trimmed, userEmail)) return false;
  if (emailsMatch(trimmed, hotelEmail)) return false;
  return true;
}
