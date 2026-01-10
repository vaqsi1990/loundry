import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs";

// Seller information
const SELLER_INFO = {
  name: 'შპს "ქინგ ლონდრი"',
  address: "რუსთავის გზატკეცილი #71",
  city: "თბილისი, საქართველო",
  identificationCode: "416386645",
  email: "kl.kinglaundry@gmail.com",
  phone: "574002102",
  account: "GE73CD0360000061227199",
  bank: "Credo Bank",
  swift: "JSCRGE22",
};

// Normalize hotel name for case-insensitive matching
const normalizeHotel = (name: string | null) => {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
};

function generateInvoicePDF(
  invoiceNumber: string,
  issueDate: Date,
  dueDate: Date,
  paymentType: string,
  hotelName: string,
  hotelRegistrationNumber: string,
  hotelAddress: string | null,
  hotelPhone: string,
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: number;
    total: number;
  }>,
  totalAmount: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument({
        margin: 50,
        autoFirstPage: true,
        size: 'A4',
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // FONT
      const sylfaenFontPath = path.join(process.cwd(), "public", "fonts", "sylfaen.ttf");
      doc.registerFont("Sylfaen", sylfaenFontPath);
      doc.font("Sylfaen");

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
      const formatCurrency = (n: number) => `${n.toFixed(2)} ₾`;
      
      // Helper function to draw bold text
      const drawBoldText = (text: string, x: number, y: number, options?: any) => {
        doc.font("Sylfaen").fillColor("#000");
        const offset = 0.25;
        const centerOffset = 0.15;
        if (options?.align === "center") {
          doc.text(text, x - centerOffset, y, options);
          doc.text(text, x + centerOffset, y, options);
          doc.text(text, x, y, options);
        } else {
          doc.text(text, x - offset, y, options);
          doc.text(text, x + offset, y, options);
          doc.text(text, x, y, options);
        }
      };

      // HEADER + LOGO
      const headerY = 40;
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      if (fs.existsSync(logoPath)) {
        const logoWidth = 260;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, logoX, headerY - 40, { width: logoWidth });
      }

      const headerLineY = headerY + 110;
      doc
        .strokeColor("#000")
        .lineWidth(1)
        .moveTo(doc.page.margins.left, headerLineY)
        .lineTo(pageWidth - doc.page.margins.right, headerLineY)
        .stroke();

      doc.y = headerLineY + 20;

      // INVOICE INFO / SELLER / BUYER
      const colGap = 20;
      const colWidth = (contentWidth - colGap * 2) / 3;
      const rowStartY = doc.y;
      const infoX = doc.page.margins.left;
      const sellerX = infoX + colWidth + colGap;
      const buyerX = sellerX + colWidth + colGap;

      const sellerBodyLines = [
        SELLER_INFO.name,
        SELLER_INFO.address,
        SELLER_INFO.city,
        `ს/კ: ${SELLER_INFO.identificationCode}`,
        SELLER_INFO.email,
        `ტელ: ${SELLER_INFO.phone}`,
        `ანგარიში: ${SELLER_INFO.account}`,
        `ბანკი: ${SELLER_INFO.bank}`,
        `SWIFT: ${SELLER_INFO.swift}`,
      ];

      const buyerBodyLines = [
        hotelName,
        ...(hotelAddress ? [hotelAddress] : []),
        `ს/კ: ${hotelRegistrationNumber}`,
        ...(hotelPhone ? [`ტელ: ${hotelPhone}`] : []),
      ];

      const invoiceBodyLines = [
        `ინვოისი № ${invoiceNumber}`,
        `გამოშვების თარიღი: ${issueDate.toLocaleDateString("ka-GE")}`,
        `გადახდის ვადა: ${dueDate.toLocaleDateString("ka-GE")}`,
        `გადახდის ტიპი: ${paymentType}`,
      ];

      doc.fontSize(12);
      drawBoldText("ინვოისის დეტალები", infoX, rowStartY, { width: colWidth, underline: true });
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      let currentInfoY = rowStartY + 16;
      invoiceBodyLines.forEach((line) => {
        doc.text(line, infoX, currentInfoY);
        currentInfoY += 14;
      });

      doc.fontSize(12);
      drawBoldText("გამყიდველი", sellerX, rowStartY, { width: colWidth, underline: true });
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      let currentSellerY = rowStartY + 16;
      sellerBodyLines.forEach((line) => {
        doc.text(line, sellerX, currentSellerY);
        currentSellerY += 14;
      });

      doc.fontSize(12);
      drawBoldText("მყიდველი", buyerX, rowStartY, { width: colWidth, underline: true });
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      let currentBuyerY = rowStartY + 16;
      buyerBodyLines.forEach((line) => {
        doc.text(line, buyerX, currentBuyerY);
        currentBuyerY += 14;
      });

      const infoHeight = 16 + (invoiceBodyLines.length * 14);
      const sellerHeight = 16 + (sellerBodyLines.length * 14);
      const buyerHeight = 16 + (buyerBodyLines.length * 14);
      const maxHeight = Math.max(sellerHeight, buyerHeight, infoHeight);
      doc.y = rowStartY + maxHeight + 15;

      doc.moveDown(1);

      // TABLE HEADER
      const tableTop = doc.y + 10;
      const tableLeft = doc.page.margins.left;
      const tableWidthPixels = contentWidth;

      // Column widths matching admin invoices PDF
      const col = {
        number: 30,
        description: 150, // shrink service period
        quantity: 90,     // widen
        unitPrice: 120,   // widen
        total: tableWidthPixels - (30 + 150 + 90 + 120), // remainder
      };

      // Header background
      doc
        .save()
        .rect(tableLeft, tableTop, tableWidthPixels, 22)
        .fill("#d0d0d0")
        .restore();

      doc.rect(tableLeft, tableTop, tableWidthPixels, 22).stroke();

      const hY = tableTop + 6;
      let x = tableLeft;

      doc.fontSize(11);
      drawBoldText("№", x, hY, { width: col.number, align: "center" });
      x += col.number;

      drawBoldText("მომსახურების პერიოდი", x, hY, { width: col.description, align: "center" });
      x += col.description;

      drawBoldText("წონა (კგ)", x, hY, { width: col.quantity, align: "center" });
      x += col.quantity;

      drawBoldText("კგ-ის ფასი (₾)", x, hY, { width: col.unitPrice, align: "center" });
      x += col.unitPrice;

      drawBoldText("ჯამი (₾)", x, hY, { width: col.total, align: "center" });

      // Draw vertical lines in header
      doc.strokeColor("#000");
      doc.lineWidth(1);
      let headerVX = tableLeft + col.number;
      doc.moveTo(headerVX, tableTop).lineTo(headerVX, tableTop + 22).stroke();
      headerVX += col.description;
      doc.moveTo(headerVX, tableTop).lineTo(headerVX, tableTop + 22).stroke();
      headerVX += col.quantity;
      doc.moveTo(headerVX, tableTop).lineTo(headerVX, tableTop + 22).stroke();
      headerVX += col.unitPrice;
      doc.moveTo(headerVX, tableTop).lineTo(headerVX, tableTop + 22).stroke();

      // TABLE ROWS
      let currentY = tableTop + 22;

      items.forEach((item, index) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = doc.page.margins.top;
        }

        doc.rect(tableLeft, currentY, tableWidthPixels, 20).stroke();

        // Draw vertical lines in each row
        doc.strokeColor("#000");
        doc.lineWidth(1);
        let vX = tableLeft + col.number;
        doc.moveTo(vX, currentY).lineTo(vX, currentY + 20).stroke();
        vX += col.description;
        doc.moveTo(vX, currentY).lineTo(vX, currentY + 20).stroke();
        vX += col.quantity;
        doc.moveTo(vX, currentY).lineTo(vX, currentY + 20).stroke();
        vX += col.unitPrice;
        doc.moveTo(vX, currentY).lineTo(vX, currentY + 20).stroke();

        let xx = tableLeft;

        doc.fontSize(11);
        drawBoldText((index + 1).toString(), xx, currentY + 6, {
          width: col.number,
          align: "center",
        });
        xx += col.number;

        drawBoldText(item.description, xx, currentY + 6, {
          width: col.description,
          align: "center",
        });
        xx += col.description;

        drawBoldText(item.quantity, xx, currentY + 6, {
          width: col.quantity,
          align: "center",
        });
        xx += col.quantity;

        drawBoldText(formatCurrency(item.unitPrice), xx, currentY + 6, {
          width: col.unitPrice,
          align: "center",
        });
        xx += col.unitPrice;

        drawBoldText(formatCurrency(item.total), xx, currentY + 6, {
          width: col.total - 5,
          align: "right",
        });

        currentY += 20;
      });

      // TOTAL ROW
      if (currentY > doc.page.height - 80) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      doc
        .save()
        .rect(tableLeft, currentY, tableWidthPixels, 22)
        .fill("#ffffff")
        .restore();

      doc.rect(tableLeft, currentY, tableWidthPixels, 22).stroke();

      // Draw vertical lines in total row
      doc.strokeColor("#000");
      doc.lineWidth(1);
      let totalVX = tableLeft + col.number;
      doc.moveTo(totalVX, currentY).lineTo(totalVX, currentY + 22).stroke();
      totalVX += col.description;
      doc.moveTo(totalVX, currentY).lineTo(totalVX, currentY + 22).stroke();
      totalVX += col.quantity;
      doc.moveTo(totalVX, currentY).lineTo(totalVX, currentY + 22).stroke();
      totalVX += col.unitPrice;
      doc.moveTo(totalVX, currentY).lineTo(totalVX, currentY + 22).stroke();

      doc.fontSize(11);

      const totalLabelWidth = 200;
      const totalAmountWidth = 80;
      const totalLabelX = tableLeft + tableWidthPixels - (totalLabelWidth + totalAmountWidth);

      drawBoldText("სულ ", totalLabelX, currentY + 5, {
        width: totalLabelWidth,
        align: "center",
      });

      drawBoldText(formatCurrency(totalAmount), tableLeft + tableWidthPixels - totalAmountWidth, currentY + 5, {
        width: totalAmountWidth,
        align: "center",
      });

      // FOOTER (Page 1 of 1)
      doc.fontSize(11).fillColor("#777");
      doc.text(
        "გვერდი 1 -დან 1",
        doc.page.margins.left,
        doc.page.height - doc.page.margins.bottom - 20
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        hotels: {
          where: { type: "LEGAL" },
        },
      },
    });

    if (!user || !user.hotels || user.hotels.length === 0) {
      return NextResponse.json(
        { error: "იურიდიული პირის სასტუმრო არ მოიძებნა" },
        { status: 404 }
      );
    }

    const hotel = user.hotels[0];
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM format
    const dateParam = searchParams.get("date"); // YYYY-MM-DD format (optional, for single invoice)
    const amountParam = searchParams.get("amount"); // Optional: filter by specific amount
    const weightParam = searchParams.get("weight"); // Optional: filter by specific weight
    const protectorsParam = searchParams.get("protectors"); // Optional: filter by specific protectors amount

    if (!month) {
      return NextResponse.json(
        { error: "თვე სავალდებულოა" },
        { status: 400 }
      );
    }

    // Build date filter
    let dateFilter: any = {};
    if (dateParam) {
      // Filter by specific date
      const targetDate = new Date(dateParam);
      const startOfDay = new Date(Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        0, 0, 0, 0
      ));
      const endOfDay = new Date(Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        23, 59, 59, 999
      ));
      dateFilter = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else {
      // Filter by month
      const [year, monthNum] = month.split("-");
      const startOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999));
      dateFilter = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const allEmailSends = await prisma.dailySheetEmailSend.findMany({
      where: {
        hotelName: {
          not: null,
        },
        date: dateFilter,
      },
      include: {
        dailySheet: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    const normalizedHotelName = normalizeHotel(hotel.hotelName);
    let emailSends = allEmailSends.filter(
      (es) => normalizeHotel(es.hotelName) === normalizedHotelName
    );

    // If specific invoice parameters are provided, filter to match exact invoice
    // This allows downloading PDF for a specific invoice row (unique combination of date, weight, protectors)
    if (dateParam && weightParam !== null && protectorsParam !== null) {
      const targetWeight = parseFloat(weightParam);
      const targetProtectors = parseFloat(protectorsParam || "0");
      
      // Filter emailSends to match the exact invoice criteria (date, weight, protectors)
      // We match by weight and protectors because these uniquely identify an invoice row
      emailSends = emailSends.filter((es) => {
        const esWeight = es.totalWeight ?? 0;
        const esProtectors = es.protectorsAmount ?? 0;
        
        // Match if weight and protectors match (with small tolerance for floating point)
        return Math.abs(esWeight - targetWeight) < 0.01 &&
               Math.abs(esProtectors - targetProtectors) < 0.01;
      });
    }

    if (emailSends.length === 0) {
      return NextResponse.json(
        { error: dateParam ? "ამ თარიღისთვის ინვოისის მონაცემები არ მოიძებნა" : "ამ თვისთვის ინვოისის მონაცემები არ მოიძებნა" },
        { status: 404 }
      );
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        invoiceNumber: true,
      },
    });
    
    let invoiceNumber = "1";
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber);
      if (!isNaN(lastNumber) && lastNumber > 0) {
        invoiceNumber = (lastNumber + 1).toString();
      }
    }

    // Calculate dates
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    // Build items array - deduplicate same invoices (same date, amount, weight, protectors)
    const items: Array<{ description: string; quantity: string; unitPrice: number; total: number }> = [];
    const pricePerKg = hotel.pricePerKg || 1.8;

    // Track unique invoices to avoid duplicates
    const uniqueInvoiceMap = new Map<string, {
      description: string;
      quantity: string;
      unitPrice: number;
      total: number;
    }>();

    // Sort email sends by date
    const sortedEmailSends = [...emailSends].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Create items for each unique invoice (deduplicate same date, amount, weight, protectors)
    sortedEmailSends.forEach((emailSend) => {
      const date = new Date(emailSend.date);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
      const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear().toString().slice(-2)}`;

      let sentLabel = dateStr;
      if (emailSend.sentAt) {
        const sentAt = new Date(emailSend.sentAt);
        sentLabel = `${sentAt.getDate().toString().padStart(2, '0')}.${(sentAt.getMonth() + 1).toString().padStart(2, '0')}.${sentAt.getFullYear().toString().slice(-2)}`;
      }

      const weight = emailSend.totalWeight ?? 0;
      const protectorsAmount = emailSend.protectorsAmount ?? 0;

      if (weight > 0) {
        const hasTablecloths = emailSend.dailySheet?.items?.some(
          (item: any) => item.itemNameKa?.toLowerCase().includes("სუფრ")
        ) || false;
        
        if (hasTablecloths) {
          const tableclothsItems = emailSend.dailySheet?.items?.filter(
            (item: any) => item.itemNameKa?.toLowerCase().includes("სუფრ")
          ) || [];
          const regularItems = emailSend.dailySheet?.items?.filter(
            (item: any) => !item.itemNameKa?.toLowerCase().includes("სუფრ")
          ) || [];
          
          const tableclothsWeight = tableclothsItems.reduce(
            (sum, item: any) => sum + (item.totalWeight || item.weight || 0), 
            0
          );
          const regularWeight = regularItems.reduce(
            (sum, item: any) => sum + (item.totalWeight || item.weight || 0), 
            0
          );
          
          // Add regular linen item (deduplicate)
          if (regularWeight > 0) {
            const regularTotal = regularWeight * pricePerKg;
            const regularKey = `${dateKey}-regular-${regularWeight.toFixed(2)}-${regularTotal.toFixed(2)}`;
            if (!uniqueInvoiceMap.has(regularKey)) {
              uniqueInvoiceMap.set(regularKey, {
                description: sentLabel,
                quantity: `${regularWeight.toFixed(1)} კგ`,
                unitPrice: pricePerKg,
                total: regularTotal,
              });
            }
          }
          
          // Add tablecloths item (deduplicate)
          if (tableclothsWeight > 0) {
            const tableclothsTotal = tableclothsWeight * pricePerKg;
            const tableclothsKey = `${dateKey}-tablecloths-${tableclothsWeight.toFixed(2)}-${tableclothsTotal.toFixed(2)}`;
            if (!uniqueInvoiceMap.has(tableclothsKey)) {
              uniqueInvoiceMap.set(tableclothsKey, {
                description: `${sentLabel} (სუფრები)`,
                quantity: `${tableclothsWeight.toFixed(1)} კგ`,
                unitPrice: pricePerKg,
                total: tableclothsTotal,
              });
            }
          }
        } else {
          // Regular linen item (no tablecloths) - deduplicate
          const regularTotal = weight * pricePerKg;
          const regularKey = `${dateKey}-regular-${weight.toFixed(2)}-${regularTotal.toFixed(2)}`;
          if (!uniqueInvoiceMap.has(regularKey)) {
            uniqueInvoiceMap.set(regularKey, {
              description: sentLabel,
              quantity: `${weight.toFixed(1)} კგ`,
              unitPrice: pricePerKg,
              total: regularTotal,
            });
          }
        }
      }
    });

    // Add protectors if any (as separate item, deduplicate by amount)
    // First, collect all unique protector amounts per date
    const protectorsMap = new Map<string, number>();
    sortedEmailSends.forEach((emailSend) => {
      const protectorsAmount = emailSend.protectorsAmount ?? 0;
      if (protectorsAmount > 0) {
        const date = new Date(emailSend.date);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
        const protectorsKey = `${dateKey}-protectors-${protectorsAmount.toFixed(2)}`;
        // Only add if we haven't seen this exact protector amount for this date
        if (!protectorsMap.has(protectorsKey)) {
          protectorsMap.set(protectorsKey, protectorsAmount);
        }
      }
    });
    
    // Add unique protectors to items
    protectorsMap.forEach((protectorsAmount) => {
      items.push({
        description: "დამცავები",
        quantity: "1",
        unitPrice: protectorsAmount,
        total: protectorsAmount,
      });
    });
    
    // Convert map values to array (add regular items)
    items.push(...Array.from(uniqueInvoiceMap.values()));
    
    // Sort items by description (date) to maintain order
    items.sort((a, b) => {
      // Extract date from description for sorting
      const dateA = a.description.match(/(\d{2}\.\d{2}\.\d{2})/)?.[1] || "";
      const dateB = b.description.match(/(\d{2}\.\d{2}\.\d{2})/)?.[1] || "";
      return dateA.localeCompare(dateB);
    });

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(
      invoiceNumber,
      issueDate,
      dueDate,
      "ნაღდი",
      hotel.hotelName,
      hotel.hotelRegistrationNumber,
      hotel.address,
      hotel.mobileNumber,
      items,
      totalAmount
    );

    // Generate filename
    let filename: string;
    if (dateParam) {
      // Single invoice - use date in format "ინვოისი - DD.MM.YYYY"
      const date = new Date(dateParam);
      const day = date.getUTCDate().toString().padStart(2, '0');
      const monthNum = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      filename = `ინვოისი - ${day}.${monthNum}.${year}.pdf`;
    } else {
      // Monthly invoice - use month range
      const monthParts = month.split("-");
      filename = `ინვოისი - ${monthParts[0]}-${monthParts[1]}.pdf`;
    }

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "PDF-ის გენერირებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}
