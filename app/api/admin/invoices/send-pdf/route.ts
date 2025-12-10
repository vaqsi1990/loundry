import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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

      // =========================
      // HEADER + LOGO (120px)
      // =========================
      const headerY = 40;

      // LEFT SIDE (Invoice Info)
      doc
        .fontSize(16)
        .fillColor("#000")
        .text(`ინვოისი № ${invoiceNumber}`, doc.page.margins.left, headerY, {
          width: contentWidth / 2,
        });

      doc
        .fontSize(10)
        .fillColor("#444")
        .text(
          `გამოშვების თარიღი: ${issueDate.toLocaleDateString("ka-GE")}\n` +
          `გადახდის ვადა: ${dueDate.toLocaleDateString("ka-GE")}\n` +
          `გადახდის ტიპი: ${paymentType}`,
          doc.page.margins.left,
          headerY + 22,
          { width: contentWidth / 2 }
        );

      // RIGHT SIDE (LOGO)
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      if (fs.existsSync(logoPath)) {
        const logoWidth = 120;
        const logoMarginRight = 130;  // add this
        
        const logoX = pageWidth - doc.page.margins.right - logoWidth - logoMarginRight;
        
        doc.image(logoPath, logoX, headerY - 5, { width: logoWidth });
        
      }

      doc.moveDown(4);

      // =========================
      // SELLER / BUYER (Two columns)
      // =========================
      const colWidth = contentWidth / 2;

      const sellerY = doc.y;

      // SELLER
      doc
        .fontSize(12)
        .fillColor("#000")
        .text("გამყიდველი", doc.page.margins.left, sellerY, {
          width: colWidth,
          underline: true,
        });

      doc.fontSize(10);
      doc.text(SELLER_INFO.name);
      doc.text(SELLER_INFO.address);
      doc.text(SELLER_INFO.city);
      doc.text(`საიდენტიფიკაციო კოდი ${SELLER_INFO.identificationCode}`);
      doc.text(SELLER_INFO.email);
      doc.text(`ტელ ${SELLER_INFO.phone}`);
      doc.text(`ანგარიში : ${SELLER_INFO.account}`);
      doc.text(`ბანკი : ${SELLER_INFO.bank}`);
      doc.text(`SWIFT: ${SELLER_INFO.swift}`);

      // BUYER (Right Column)
      const buyerX = doc.page.margins.left + colWidth + 20;

      doc
        .fontSize(12)
        .fillColor("#000")
        .text("მყიდველი", buyerX, sellerY, { width: colWidth, underline: true });

      doc.fontSize(10);
      doc.text(hotelName, buyerX);
      if (hotelAddress) doc.text(hotelAddress, { width: colWidth });
      doc.text(`საიდენტიფიკაციო კოდი ${hotelRegistrationNumber}`);
      if (hotelPhone) doc.text(`ტელეფონი ${hotelPhone}`);

      doc.moveDown(2);

      // =========================
      // TITLE ABOVE TABLE
      // =========================
      doc
        .fontSize(11)
        .fillColor("#000")
      

      doc.moveDown(1);

      // =========================
      // TABLE HEADER
      // =========================
      const tableTop = doc.y;
      const tableLeft = doc.page.margins.left;
      const tableWidthPixels = contentWidth;

      const col = {
        number: 30,
        description: 250,
        quantity: 80,
        unitPrice: 80,
        total: tableWidthPixels - (30 + 250 + 80 + 80)
      };

      // Header background
      doc
        .save()
        .rect(tableLeft, tableTop, tableWidthPixels, 22)
        .fill("#f2f2f2")
        .restore();

      doc.rect(tableLeft, tableTop, tableWidthPixels, 22).stroke();

      const hY = tableTop + 6;
      let x = tableLeft;

      doc.fontSize(10).fillColor("#000");
      doc.text("№", x, hY, { width: col.number, align: "center" });
      x += col.number;

      doc.text("დასახელება", x, hY, { width: col.description });
      x += col.description;

      doc.text("რაოდენობა", x, hY, { width: col.quantity, align: "center" });
      x += col.quantity;

      doc.text("ცალის ფასი", x, hY, { width: col.unitPrice, align: "center" });
      x += col.unitPrice;

      doc.text("სულ", x, hY, { width: col.total, align: "center" });

      let currentY = tableTop + 22;

      // =========================
      // TABLE ROWS
      // =========================
      items.forEach((item, index) => {
        doc.rect(tableLeft, currentY, tableWidthPixels, 20).stroke();

        let xx = tableLeft;

        doc.fontSize(9).fillColor("#000");
        doc.text((index + 1).toString(), xx, currentY + 6, {
          width: col.number,
          align: "center",
        });
        xx += col.number;

        doc.text(item.description, xx, currentY + 6, {
          width: col.description,
        });
        xx += col.description;

        doc.text(item.quantity, xx, currentY + 6, {
          width: col.quantity,
          align: "center",
        });
        xx += col.quantity;

        doc.text(formatCurrency(item.unitPrice), xx, currentY + 6, {
          width: col.unitPrice,
          align: "center",
        });
        xx += col.unitPrice;

        doc.text(formatCurrency(item.total), xx, currentY + 6, {
          width: col.total - 5,
          align: "right",
        });

        currentY += 20;
      });

      // =========================
      // TOTAL ROW — ONLY ONCE
      // =========================
      doc
        .save()
        .rect(tableLeft, currentY, tableWidthPixels, 22)
        .fill("#e5f3ff")
        .restore();

      doc.rect(tableLeft, currentY, tableWidthPixels, 22).stroke();

      doc.fontSize(11).fillColor("#000");

      doc.text("სულ", tableLeft + tableWidthPixels - 150, currentY + 5, {
        width: 60,
        align: "right",
      });

      doc.text(formatCurrency(totalAmount), tableLeft + tableWidthPixels - 80, currentY + 5, {
        width: 70,
        align: "right",
      });

      // =========================
      // NO NOTES
      // NO SECOND TOTAL
      // =========================

      // =========================
      // FOOTER (Page 1 of 1)
      // =========================
      doc.fontSize(8).fillColor("#777");
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



export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const body = await request.json();
    const { hotelName, email } = body;

    if (!hotelName || !email) {
      return NextResponse.json(
        { error: "სასტუმროს სახელი და ელფოსტა სავალდებულოა" },
        { status: 400 }
      );
    }

    // Get hotel information
    const hotel = await prisma.hotel.findFirst({
      where: { hotelName: hotelName },
    });

    if (!hotel) {
      return NextResponse.json({ error: "სასტუმრო ვერ მოიძებნა" }, { status: 404 });
    }

    // Get invoice data for this hotel
    const emailSends = await prisma.dailySheetEmailSend.findMany({
      where: {
        hotelName: hotelName,
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

    if (emailSends.length === 0) {
      return NextResponse.json({ error: "ამ სასტუმროსთვის ინვოისის მონაცემები არ მოიძებნა" }, { status: 404 });
    }

    // Generate sequential invoice number starting from 1
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
    dueDate.setDate(dueDate.getDate() + 3); // 3 days from issue
    
    // Build items array - each emailSend gets its own row (detailed)
    const items: Array<{ description: string; quantity: string; unitPrice: number; total: number }> = [];
    const pricePerKg = hotel.pricePerKg || 1.8; // Default price
    
    // Sort email sends by date
    const sortedEmailSends = [...emailSends].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Create a separate item for each emailSend
    sortedEmailSends.forEach((emailSend) => {
      const date = new Date(emailSend.date);
      const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear().toString().slice(-2)}`;
      const weight = emailSend.totalWeight ?? 0;
      
      if (weight > 0) {
        // Check if this sheet has tablecloths (სუფრები)
        const hasTablecloths = emailSend.dailySheet?.items?.some(
          (item: any) => item.itemNameKa?.toLowerCase().includes("სუფრ")
        ) || false;
        
        if (hasTablecloths) {
          // Separate regular linen and tablecloths
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
          
          // Add regular linen item
          if (regularWeight > 0) {
            items.push({
              description: dateStr,
              quantity: `${regularWeight.toFixed(1)} კგ`,
              unitPrice: pricePerKg,
              total: regularWeight * pricePerKg,
            });
          }
          
          // Add tablecloths item
          if (tableclothsWeight > 0) {
            const tableclothsPrice = 3.00; // Price for tablecloths
            items.push({
              description: `${dateStr} - სუფრები`,
              quantity: `${tableclothsWeight.toFixed(1)} კგ`,
              unitPrice: tableclothsPrice,
              total: tableclothsWeight * tableclothsPrice,
            });
          }
        } else {
          // Regular linen item (no tablecloths)
          items.push({
            description: dateStr,
            quantity: `${weight.toFixed(1)} კგ`,
            unitPrice: pricePerKg,
            total: weight * pricePerKg,
          });
        }
      }
    });
    
    // Add protectors if any (as separate item)
    const totalProtectors = emailSends.reduce((sum, es) => sum + (es.protectorsAmount ?? 0), 0);
    if (totalProtectors > 0) {
      items.push({
        description: "დამცავები",
        quantity: "1",
        unitPrice: totalProtectors,
        total: totalProtectors,
      });
    }
    
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    // Save invoice to database to track the number (with retry if duplicate)
    let savedInvoice;
    try {
      savedInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          customerName: hotel.hotelName,
          customerEmail: email,
          amount: totalAmount,
          status: "PENDING",
          dueDate: dueDate,
        },
      });
    } catch (error: any) {
      // If invoice number already exists, get next number
      if (error.code === "P2002" && error.meta?.target?.includes("invoiceNumber")) {
        const lastInvoice = await prisma.invoice.findFirst({
          orderBy: {
            createdAt: "desc",
          },
          select: {
            invoiceNumber: true,
          },
        });
        if (lastInvoice && lastInvoice.invoiceNumber) {
          const lastNumber = parseInt(lastInvoice.invoiceNumber);
          if (!isNaN(lastNumber) && lastNumber > 0) {
            invoiceNumber = (lastNumber + 1).toString();
          }
        }
        // Retry with new number
        savedInvoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerName: hotel.hotelName,
            customerEmail: email,
            amount: totalAmount,
            status: "PENDING",
            dueDate: dueDate,
          },
        });
      } else {
        throw error;
      }
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(
      invoiceNumber,
      issueDate,
      dueDate,
      "გადარიცხვით",
      hotel.hotelName,
      hotel.hotelRegistrationNumber,
      hotel.address,
      hotel.mobileNumber,
      items,
      totalAmount
    );

    // Send email with PDF attachment
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `ინვოისი - ${hotel.hotelName}`,
      text: `გთხოვთ იხილოთ მიმაგრებული ინვოისი ${hotel.hotelName}-ისთვის.`,
      html: `<p>გთხოვთ იხილოთ მიმაგრებული ინვოისი <strong>${hotel.hotelName}</strong>-ისთვის.</p>`,
      attachments: [
        {
          filename: `ინვოისი_${hotel.hotelName}_${new Date().toISOString().split("T")[0]}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return NextResponse.json({ message: "PDF ინვოისი წარმატებით გაიგზავნა" });
  } catch (error) {
    console.error("PDF invoice send error:", error);
    return NextResponse.json({ error: "PDF-ის გაგზავნისას მოხდა შეცდომა" }, { status: 500 });
  }
}

