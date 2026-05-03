/** UI / API `comment` და ძველი `notes` იკრიბება ერთ `notes` ველში ბაზაში. */
export function sheetNotesFromBody(
  comment: unknown,
  notes: unknown
): string | null {
  const c =
    typeof comment === "string" && comment.trim() ? comment.trim() : "";
  const n =
    typeof notes === "string" && notes.trim() ? notes.trim() : "";
  return c || n || null;
}

/** JSON პასუხში იგივე ტექსტი იძლევა როგორც `comment` (კომენტარი), ისე როგორც `notes`. */
export function serializeDailySheetForClient<T extends Record<string, unknown>>(
  sheet: T
): T & { comment: string | null } {
  const notesVal =
    typeof sheet.notes === "string"
      ? sheet.notes
      : sheet.notes == null
        ? null
        : String(sheet.notes);
  return {
    ...sheet,
    comment: notesVal,
  };
}
