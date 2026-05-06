import fs from "fs";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfKitDoc = any;

function firstExistingPath(paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Ensures a Georgian-capable font is embedded in the PDF.
 *
 * PDF viewers will substitute fonts if a glyph is missing, which often produces
 * garbled Georgian text on some machines. Embedding Noto Sans Georgian fixes it.
 */
export function useGeorgianPdfFont(doc: PdfKitDoc): { fontName: string; fontPath: string } {
  const fontsDir = path.join(process.cwd(), "public", "fonts");

  const notoPath = path.join(fontsDir, "NotoSansGeorgian.ttf");
  const sylfaenPath = path.join(fontsDir, "sylfaen.ttf");

  const fontPath = firstExistingPath([notoPath, sylfaenPath]);
  if (!fontPath) {
    throw new Error(
      'Missing Georgian PDF font. Add `public/fonts/NotoSansGeorgian.ttf` (recommended) or `public/fonts/sylfaen.ttf`.'
    );
  }

  const fontName = fontPath === notoPath ? "NotoSansGeorgian" : "Sylfaen";
  doc.registerFont(fontName, fontPath);
  doc.font(fontName);

  return { fontName, fontPath };
}

