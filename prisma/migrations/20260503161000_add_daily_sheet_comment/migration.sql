-- კომენტარი ინახება `notes`-ში; სვეტი sheet_comment იშლება (თუ არსებობს), მისი მნიშვნელობა იწერება notes-ში.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'LegalDailySheet' AND column_name = 'sheet_comment'
  ) THEN
    UPDATE "LegalDailySheet"
    SET "notes" =
      CASE
        WHEN trim(COALESCE("sheet_comment", '')) = '' THEN "notes"
        WHEN trim(COALESCE("notes", '')) = '' THEN trim("sheet_comment")
        ELSE trim("notes") || E'\n' || trim("sheet_comment")
      END
    WHERE trim(COALESCE("sheet_comment", '')) <> '';

    ALTER TABLE "LegalDailySheet" DROP COLUMN "sheet_comment";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PhysicalDailySheet' AND column_name = 'sheet_comment'
  ) THEN
    UPDATE "PhysicalDailySheet"
    SET "notes" =
      CASE
        WHEN trim(COALESCE("sheet_comment", '')) = '' THEN "notes"
        WHEN trim(COALESCE("notes", '')) = '' THEN trim("sheet_comment")
        ELSE trim("notes") || E'\n' || trim("sheet_comment")
      END
    WHERE trim(COALESCE("sheet_comment", '')) <> '';

    ALTER TABLE "PhysicalDailySheet" DROP COLUMN "sheet_comment";
  END IF;
END $$;
