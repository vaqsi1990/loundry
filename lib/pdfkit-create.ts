/**
 * pdfkit is published as CommonJS. Under Next.js / Turbopack, `require("pdfkit")`
 * may be the constructor directly or `{ default: constructor }` — the latter
 * causes "PDFDocument is not a constructor" if used naively.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPdfDocument(options?: any): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("pdfkit") as any;
  const Ctor = typeof mod === "function" ? mod : mod?.default;
  if (typeof Ctor !== "function") {
    throw new Error("pdfkit: PDFDocument constructor not found");
  }
  return new Ctor(options);
}
