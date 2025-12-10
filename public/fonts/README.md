# Georgian Font for PDF Generation

To display Georgian characters correctly in PDF invoices, you need to add a font that supports Georgian script.

## Quick Setup

1. Download **Noto Sans Georgian** from Google Fonts:
   - Visit: https://fonts.google.com/noto/specimen/Noto+Sans+Georgian
   - Click "Download family" or download the Regular weight
   - Extract the ZIP file

2. Copy the font file:
   - Find `NotoSansGeorgian-Regular.ttf` in the extracted folder
   - Copy it to this directory: `public/fonts/NotoSansGeorgian-Regular.ttf`

3. Restart your Next.js server

## Alternative Fonts

If Noto Sans Georgian is not available, the code will try these system fonts (in order):
- Arial Unicode MS (if installed on Windows)
- Calibri
- Tahoma
- Arial

However, these may not fully support Georgian characters. Noto Sans Georgian is recommended for best results.

## Verification

After adding the font, the PDF invoices should display Georgian text correctly instead of garbled characters.

