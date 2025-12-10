# ფონტის დამატება PDF-ისთვის

## პრობლემა
თუ PDF-ში ქართული ტექსტი არასწორად გამოიყურება სხვა კომპიუტერზე, ეს იმიტომ ხდება, რომ ფონტი არ არის ჩაშენებული PDF-ში.

## გამოსავალი

1. გადადით ამ ლინკზე:
   https://fonts.google.com/noto/specimen/Noto+Sans+Georgian

2. დააჭირეთ "Download family" ღილაკს

3. გახსენით ZIP ფაილი

4. იპოვეთ ფაილი `NotoSansGeorgian-Regular.ttf`

5. დააკოპირეთ ეს ფაილი აქ:
   `public/fonts/NotoSansGeorgian-Regular.ttf`

6. გადატვირთეთ Next.js სერვერი

## ალტერნატიული მეთოდი (PowerShell)

თუ PowerShell-ში გაქვთ curl ან wget:
```powershell
New-Item -ItemType Directory -Force -Path "public\fonts"
# შემდეგ ჩამოტვირთეთ ფონტი ხელით და დააყენეთ public/fonts/NotoSansGeorgian-Regular.ttf
```

## შემოწმება

ფონტის დამატების შემდეგ, PDF-ის გენერირებისას ქართული ტექსტი სწორად უნდა გამოჩნდეს ყველა კომპიუტერზე.

