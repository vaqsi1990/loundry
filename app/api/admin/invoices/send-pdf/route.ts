 

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

// Create transporter with proper Gmail configuration
const getTransporter = () => {
  // If custom SMTP settings are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });
  }

  // Default to Gmail with TLS (port 587) as fallback
  // Don't use service: "gmail" as it defaults to port 465
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // false for 587 (TLS), true for 465 (SSL)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: "SSLv3",
    },
  });
};

const transporter = getTransporter();

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
      
      // Helper function to draw bold text by drawing with small offsets to simulate bold
      const drawBoldText = (text: string, x: number, y: number, options?: any) => {
        doc.font("Sylfaen").fillColor("#000");
        // Draw text with small offsets to simulate bold effect
        const offset = 0.25;
        const centerOffset = 0.15; // Smaller offset for center-aligned text
        // If center alignment, use smaller horizontal offsets to maintain centering
        if (options?.align === "center") {
          doc.text(text, x - centerOffset, y, options);
          doc.text(text, x + centerOffset, y, options);
          doc.text(text, x, y, options); // Final centered draw
        } else {
          // For other alignments, use normal horizontal offsets
          doc.text(text, x - offset, y, options);
          doc.text(text, x + offset, y, options);
          doc.text(text, x, y, options); // Final centered draw
        }
      };

      // =========================
      // HEADER + LOGO (120px)
      // =========================
      const headerY = 40;

      // RIGHT SIDE (LOGO)
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      if (fs.existsSync(logoPath)) {
        const logoWidth = 260;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, logoX, headerY - 40, { width: logoWidth });
      }

      // Draw horizontal divider under header + logo
      const headerLineY = headerY + 110;
      doc
        .strokeColor("#000")
        .lineWidth(1)
        .moveTo(doc.page.margins.left, headerLineY)
        .lineTo(pageWidth - doc.page.margins.right, headerLineY)
        .stroke();

      // Start body below header/logo (extra spacing)
      doc.y = headerLineY + 20;
 
      // =========================
      // INVOICE INFO / SELLER / BUYER (Three columns)
      // =========================
      const colGap = 20;
      const colWidth = (contentWidth - colGap * 2) / 3;

      const rowStartY = doc.y;
      const infoX = doc.page.margins.left;
      const sellerX = infoX + colWidth + colGap;
      const buyerX = sellerX + colWidth + colGap;

      // Pre-build column text to measure height consistently
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
      // Render each line individually without width constraint to prevent wrapping
      let currentInfoY = rowStartY + 16;
      invoiceBodyLines.forEach((line) => {
        doc.text(line, infoX, currentInfoY);
        currentInfoY += 14;
      });

      doc.fontSize(12);
      drawBoldText("გამყიდველი", sellerX, rowStartY, { width: colWidth, underline: true });
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      // Render each line individually without width constraint to prevent wrapping
      let currentSellerY = rowStartY + 16;
      sellerBodyLines.forEach((line) => {
        doc.text(line, sellerX, currentSellerY);
        currentSellerY += 14;
      });

      doc.fontSize(12);
      drawBoldText("მყიდველი", buyerX, rowStartY, { width: colWidth, underline: true });
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      // Render each line individually without width constraint to prevent wrapping
      let currentBuyerY = rowStartY + 16;
      buyerBodyLines.forEach((line) => {
        doc.text(line, buyerX, currentBuyerY);
        currentBuyerY += 14;
      });

      // Keep vertical spacing aligned to tallest column
      // Calculate height based on number of lines (header + body lines)
      const infoHeight = 16 + (invoiceBodyLines.length * 14);
      const sellerHeight = 16 + (sellerBodyLines.length * 14);
      const buyerHeight = 16 + (buyerBodyLines.length * 14);
      const maxHeight = Math.max(sellerHeight, buyerHeight, infoHeight);
      doc.y = rowStartY + maxHeight + 15;

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
      // Push table down by 50px for spacing
      const tableTop = doc.y + 10;
      const tableLeft = doc.page.margins.left;
      const tableWidthPixels = contentWidth;

      const col = {
        number: 30,
        description: 150, // shrink service period
        quantity: 90,     // widen
        unitPrice: 120,   // widen
        total: tableWidthPixels - (30 + 200 + 90 + 120), // widen remainder
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

      let currentY = tableTop + 22;

      // =========================
      // TABLE ROWS
      // =========================
      items.forEach((item, index) => {
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

      // =========================
      // TOTAL ROW — ONLY ONCE
      // =========================
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

      drawBoldText("სულ გადასახდელი", totalLabelX, currentY + 5, {
        width: totalLabelWidth,
        align: "center",
      });

      drawBoldText(formatCurrency(totalAmount), tableLeft + tableWidthPixels - totalAmountWidth, currentY + 5, {
        width: totalAmountWidth,
        align: "center",
      });

      // =========================
      // NO NOTES
      // NO SECOND TOTAL
      // =========================

      // =========================
      // FOOTER (Page 1 of 1)
      // =========================
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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const body = await request.json();
    const { hotelName, email, dateDetails } = body;

    if (!hotelName) {
      return NextResponse.json(
        { error: "სასტუმროს სახელი სავალდებულოა" },
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

    // Use provided email or hotel's email, prioritize provided email
    const recipientEmail = email || hotel.email;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "სასტუმროს ელფოსტა არ არის მითითებული" },
        { status: 400 }
      );
    }

    // Get invoice data for this hotel
    // If dateDetails are provided, only get emailSends for those specific dates
    let emailSends;
    if (dateDetails && Array.isArray(dateDetails) && dateDetails.length > 0) {
      // Collect all emailSendIds from dateDetails
      const emailSendIds = dateDetails
        .flatMap((detail: any) => detail.emailSendIds || [])
        .filter((id: string) => id !== undefined && id !== null);
      
      if (emailSendIds.length === 0) {
        return NextResponse.json({ error: "ინვოისის ID-ები არ მოიძებნა" }, { status: 400 });
      }
      
      // Query from both legal and physical tables
      const [legalEmailSends, physicalEmailSends] = await Promise.all([
        prisma.legalDailySheetEmailSend.findMany({
          where: {
            id: {
              in: emailSendIds,
            },
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
        }),
        prisma.physicalDailySheetEmailSend.findMany({
          where: {
            id: {
              in: emailSendIds,
            },
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
        }),
      ]);
      emailSends = [...legalEmailSends, ...physicalEmailSends];
    } else {
      // Get all emailSends for this hotel from both legal and physical tables
      const [legalEmailSends, physicalEmailSends] = await Promise.all([
        prisma.legalDailySheetEmailSend.findMany({
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
        }),
        prisma.physicalDailySheetEmailSend.findMany({
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
        }),
      ]);
      emailSends = [...legalEmailSends, ...physicalEmailSends];
    }

    if (emailSends.length === 0) {
      return NextResponse.json({ error: "ამ სასტუმროსთვის ინვოისის მონაცემები არ მოიძებნა" }, { status: 404 });
    }

    // Generate sequential invoice number starting from 1
    const lastInvoice = await prisma.adminInvoice.findFirst({
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

      // Show only the send date in parentheses; fallback to sheet date if missing
      let sentLabel = dateStr;
      if (emailSend.sentAt) {
        const sentAt = new Date(emailSend.sentAt);
        sentLabel = ` ${sentAt.getDate().toString().padStart(2, '0')}.${(sentAt.getMonth() + 1).toString().padStart(2, '0')}.${sentAt.getFullYear().toString().slice(-2)}`;
      }

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
              description: sentLabel,
              quantity: `${regularWeight.toFixed(1)} კგ`,
              unitPrice: pricePerKg,
              total: regularWeight * pricePerKg,
            });
          }
          
          // Add tablecloths item
          if (tableclothsWeight > 0) {
            const tableclothsPrice = 3.00; // Price for tablecloths
            items.push({
              description: `${sentLabel} - სუფრები`,
              quantity: `${tableclothsWeight.toFixed(1)} კგ`,
              unitPrice: tableclothsPrice,
              total: tableclothsWeight * tableclothsPrice,
            });
          }
        } else {
          // Regular linen item (no tablecloths)
          items.push({
            description: sentLabel,
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
    const totalWeightKg = items.reduce((sum, item) => {
      // quantity is like "12.3 კგ" or "1" for protectors
      const match = item.quantity.match(/([\d.]+)/);
      const num = match ? parseFloat(match[1]) : 0;
      return sum + num;
    }, 0);
    const protectorsAmount = emailSends.reduce((sum, es) => sum + (es.protectorsAmount ?? 0), 0);

    // Save invoice to AdminInvoice table (with retry if duplicate)
    let savedInvoice;
    try {
      savedInvoice = await prisma.adminInvoice.create({
        data: {
          invoiceNumber,
          customerName: hotel.hotelName,
          customerEmail: email,
          amount: totalAmount,
          totalWeightKg,
          protectorsAmount,
          totalAmount,
          status: "PENDING",
          dueDate: dueDate,
        },
      });
    } catch (error: any) {
      // If invoice number already exists, get next number from AdminInvoice
      if (error.code === "P2002" && error.meta?.target?.includes("invoiceNumber")) {
        const lastInvoice = await prisma.adminInvoice.findFirst({
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
        savedInvoice = await prisma.adminInvoice.create({
          data: {
            invoiceNumber,
            customerName: hotel.hotelName,
            customerEmail: email,
            amount: totalAmount,
            totalWeightKg,
            protectorsAmount,
            totalAmount,
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

    // Verify transporter configuration
    console.log("Verifying SMTP connection...");
    try {
      await transporter.verify();
      console.log("SMTP connection verified successfully");
    } catch (verifyError: any) {
      console.error("SMTP verification failed:", verifyError);
      throw new Error(`SMTP კონფიგურაცია არასწორია: ${verifyError?.message || verifyError}`);
    }

    const fromEmail = process.env.EMAIL_USER;
    if (!fromEmail) {
      throw new Error("EMAIL_USER არ არის მითითებული environment variables-ში");
    }
    const fromName = process.env.EMAIL_FROM_NAME || "ქინგ ლონდრი";
    const replyTo = process.env.EMAIL_REPLY_TO || fromEmail;
    const subject = `ინვოისი - ${hotel.hotelName}`;
    
    console.log("Sending invoice email:", {
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: subject,
    });

    // Send email with PDF attachment
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      replyTo: replyTo,
      subject: subject,
      text: `გთხოვთ იხილოთ მიმაგრებული ინვოისი ${hotel.hotelName}-ისთვის.`,
      html: `<div style="font-family:Arial,sans-serif;padding:20px;">
        <p>გთხოვთ იხილოთ მიმაგრებული ინვოისი <strong>${hotel.hotelName}</strong>-ისთვის.</p>
        <p>თუ გაქვთ შეკითხვები, გთხოვთ დაგვიკავშირდეთ.</p>
      </div>`,
      headers: {
        "Message-ID": `<${Date.now()}-${Math.random().toString(36)}@${fromEmail.split("@")[1]}>`,
        "X-Mailer": "NodeMailer",
        "X-Priority": "3",
        "Importance": "normal",
        "MIME-Version": "1.0",
      },
      date: new Date(),
      attachments: [
        {
          filename: `ინვოისი_${hotel.hotelName}_${new Date().toISOString().split("T")[0]}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log("Invoice email sent successfully to:", recipientEmail);
    
    // After successful email send, confirm all emailSends that were included in the PDF
    const emailSendIdsToConfirm = emailSends
      .filter((es) => es.confirmedAt === null || es.confirmedAt === undefined)
      .map((es) => es.id);
    
    if (emailSendIdsToConfirm.length > 0) {
      // Update both legal and physical email sends
      const [legalUpdateResult, physicalUpdateResult] = await Promise.all([
        prisma.legalDailySheetEmailSend.updateMany({
          where: {
            id: {
              in: emailSendIdsToConfirm,
            },
            confirmedAt: null, // Only update email sends that are not already confirmed
          },
          data: {
            confirmedBy: session.user.id,
            confirmedAt: new Date(),
          },
        }),
        prisma.physicalDailySheetEmailSend.updateMany({
          where: {
            id: {
              in: emailSendIdsToConfirm,
            },
            confirmedAt: null, // Only update email sends that are not already confirmed
          },
          data: {
            confirmedBy: session.user.id,
            confirmedAt: new Date(),
          },
        }),
      ]);
      const totalConfirmed = legalUpdateResult.count + physicalUpdateResult.count;
      console.log(`Confirmed ${totalConfirmed} email sends after PDF send`);
    }
    
    return NextResponse.json({ message: "PDF ინვოისი წარმატებით გაიგზავნა" });
  } catch (error: any) {
    console.error("=== PDF invoice send error ===");
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error response:", error?.response);
    console.error("Error responseCode:", error?.responseCode);
    console.error("Error command:", error?.command);
    console.error("Error syscall:", error?.syscall);
    console.error("Error address:", error?.address);
    console.error("Error port:", error?.port);
    console.error("Full error:", JSON.stringify(error, null, 2));
    console.error("Error stack:", error?.stack);
    console.error("================================");
    
    // More detailed error message for user
    let errorMessage = "PDF-ის გაგზავნისას მოხდა შეცდომა";
    if (error?.code === "ECONNREFUSED") {
      errorMessage = `SMTP სერვერთან დაკავშირება ვერ მოხერხდა. შეამოწმეთ SMTP კონფიგურაცია (${error?.address}:${error?.port})`;
    } else if (error?.code === "EAUTH") {
      errorMessage = "SMTP ავტორიზაცია ვერ მოხერხდა. შეამოწმეთ EMAIL_USER და EMAIL_PASSWORD";
    } else if (error?.message) {
      errorMessage = `შეცდომა: ${error.message}`;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}