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
  hotelName: string,
  hotelRegistrationNumber: string,
  hotelAddress: string | null,
  hotelPhone: string,
  dateDetails: Array<{
    date: string;
    emailSendCount: number;
    weightKg: number;
    protectorsAmount: number;
    totalAmount: number;
  }>,
  totals: {
    totalWeightKg: number;
    protectorsAmount: number;
    totalAmount: number;
    totalEmailSendCount: number;
  }
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Use regular require instead of dynamic import since PDFKit is excluded from bundling
      // This allows PDFKit to use its internal __dirname correctly
      const PDFDocument = require("pdfkit");
      
      const doc = new PDFDocument({ 
        margin: 50, 
        autoFirstPage: true
      });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Register a font that supports Georgian characters
      // Try multiple font paths that might support Georgian
      const fontPaths = [
        path.join(process.cwd(), "public", "fonts", "NotoSansGeorgian-Regular.ttf"), // Custom font (preferred)
        "C:\\Windows\\Fonts\\ARIALUNI.TTF", // Arial Unicode MS (supports Georgian if installed)
        "C:\\Windows\\Fonts\\calibri.ttf",  // Calibri (may support Georgian)
        "C:\\Windows\\Fonts\\tahoma.ttf",   // Tahoma (may support Georgian)
        "C:\\Windows\\Fonts\\arial.ttf",    // Arial (fallback, may not support Georgian)
      ];

      let fontRegistered = false;
      let registeredFontName = "GeorgianFont";
      
      for (const fontPath of fontPaths) {
        if (fs.existsSync(fontPath)) {
          try {
            doc.registerFont(registeredFontName, fontPath);
            doc.font(registeredFontName);
            fontRegistered = true;
            console.log(`Successfully registered Georgian font from: ${fontPath}`);
            break;
          } catch (err) {
            // Continue to next font if registration fails
            console.warn(`Failed to register font at ${fontPath}:`, err);
          }
        }
      }

      // If no font was registered, use default (will show garbled text but won't crash)
      if (!fontRegistered) {
        console.warn("WARNING: No Georgian font found! Georgian text will display incorrectly.");
        console.warn("To fix this, download Noto Sans Georgian from:");
        console.warn("https://fonts.google.com/noto/specimen/Noto+Sans+Georgian");
        console.warn("And place it in: public/fonts/NotoSansGeorgian-Regular.ttf");
      }

      // Add logo at the top
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      if (fs.existsSync(logoPath)) {
        try {
          // Center the logo - PDF width is typically 612 points (8.5 inches)
          const pageWidth = 612;
          const logoWidth = 150; // Adjust logo width as needed
          const logoX = (pageWidth - logoWidth) / 2;
          
          doc.image(logoPath, logoX, 50, { 
            width: logoWidth,
            align: "center"
          });
          
          // Move down after logo
          doc.moveDown(3);
        } catch (err) {
          console.warn("Failed to add logo to PDF:", err);
          // Continue without logo if it fails
        }
      }

      // Title
      doc.fontSize(20).text("ინვოისი", { align: "center" });
      doc.moveDown();

    // Buyer section (first)
    doc.fontSize(14).text("მყიდველი", { underline: true });
    doc.fontSize(12);
    doc.text(`სასტუმროს სახელი: ${hotelName}`);
    doc.text(`სასტუმროს საიდენტიფიკაციო კოდი: ${hotelRegistrationNumber}`);
    if (hotelAddress) {
      doc.text(`მისამართი: ${hotelAddress}`);
    }
    doc.moveDown(2);

    // Seller section (second)
    doc.fontSize(14).text("გამყიდველი", { underline: true });
    doc.fontSize(12);
    doc.text(SELLER_INFO.name);
    doc.text(SELLER_INFO.address);
    doc.text(SELLER_INFO.city);
    doc.text(`საიდენტიფიკაციო კოდი: ${SELLER_INFO.identificationCode}`);
    doc.text(`ელფოსტა: ${SELLER_INFO.email}`);
    doc.text(`ტელეფონი: ${SELLER_INFO.phone}`);
    doc.text(`ანგარიში: ${SELLER_INFO.account}`);
    doc.text(`ბანკი: ${SELLER_INFO.bank}`);
    doc.text(`SWIFT: ${SELLER_INFO.swift}`);
    doc.moveDown(2);

    // Invoice details table
    doc.fontSize(14).text("დეტალური ინფორმაცია", { underline: true });
    doc.moveDown();

    // Table header
    const tableTop = doc.y;
    const itemHeight = 20;
    const tableLeft = 50;
    const tableWidth = 500;
    const colWidths = {
      date: 100,
      count: 80,
      weight: 80,
      protectors: 100,
      total: 100,
    };

    let currentY = tableTop;

    // Header row
    doc.fontSize(10);
    doc.rect(tableLeft, currentY, tableWidth, itemHeight).stroke();
    doc.text("თარიღი", tableLeft + 5, currentY + 5, { width: colWidths.date - 10 });
    doc.text("გაგზავნილი", tableLeft + colWidths.date, currentY + 5, {
      width: colWidths.count - 10,
      align: "center",
    });
    doc.text("წონა (კგ)", tableLeft + colWidths.date + colWidths.count, currentY + 5, {
      width: colWidths.weight - 10,
      align: "center",
    });
    doc.text("დამცავები (₾)", tableLeft + colWidths.date + colWidths.count + colWidths.weight, currentY + 5, {
      width: colWidths.protectors - 10,
      align: "center",
    });
    doc.text("სულ (₾)", tableLeft + colWidths.date + colWidths.count + colWidths.weight + colWidths.protectors, currentY + 5, {
      width: colWidths.total - 10,
      align: "center",
    });

    currentY += itemHeight;

    // Data rows
    doc.fontSize(10);
    dateDetails.forEach((detail) => {
      const date = new Date(detail.date);
      const formattedDate = `${date.getDate()} ${["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"][date.getMonth()]}, ${date.getFullYear()}`;

      doc.rect(tableLeft, currentY, tableWidth, itemHeight).stroke();
      doc.text(formattedDate, tableLeft + 5, currentY + 5, { width: colWidths.date - 10 });
      doc.text(detail.emailSendCount.toString(), tableLeft + colWidths.date, currentY + 5, {
        width: colWidths.count - 10,
        align: "center",
      });
      doc.text(detail.weightKg.toFixed(2), tableLeft + colWidths.date + colWidths.count, currentY + 5, {
        width: colWidths.weight - 10,
        align: "center",
      });
      doc.text(detail.protectorsAmount.toFixed(2), tableLeft + colWidths.date + colWidths.count + colWidths.weight, currentY + 5, {
        width: colWidths.protectors - 10,
        align: "center",
      });
      doc.text(detail.totalAmount.toFixed(2), tableLeft + colWidths.date + colWidths.count + colWidths.weight + colWidths.protectors, currentY + 5, {
        width: colWidths.total - 10,
        align: "center",
      });

      currentY += itemHeight;
    });

    // Total row
    currentY += 5;
    doc.fontSize(11);
    doc.rect(tableLeft, currentY, tableWidth, itemHeight).stroke();
    doc.text("სულ", tableLeft + 5, currentY + 5, { width: colWidths.date - 10 });
    doc.text(totals.totalEmailSendCount.toString(), tableLeft + colWidths.date, currentY + 5, {
      width: colWidths.count - 10,
      align: "center",
    });
    doc.text(totals.totalWeightKg.toFixed(2), tableLeft + colWidths.date + colWidths.count, currentY + 5, {
      width: colWidths.weight - 10,
      align: "center",
    });
    doc.text(totals.protectorsAmount.toFixed(2), tableLeft + colWidths.date + colWidths.count + colWidths.weight, currentY + 5, {
      width: colWidths.protectors - 10,
      align: "center",
    });
    doc.text(totals.totalAmount.toFixed(2), tableLeft + colWidths.date + colWidths.count + colWidths.weight + colWidths.protectors, currentY + 5, {
      width: colWidths.total - 10,
      align: "center",
    });

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
        dailySheet: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    if (emailSends.length === 0) {
      return NextResponse.json({ error: "ამ სასტუმროსთვის ინვოისის მონაცემები არ მოიძებნა" }, { status: 404 });
    }

    // Aggregate date details
    const dateDetailsMap = new Map<string, { date: string; emailSendCount: number; weightKg: number; protectorsAmount: number; totalAmount: number }>();

    emailSends.forEach((emailSend) => {
      const dateKey = new Date(emailSend.date).toISOString().split("T")[0];
      const existing = dateDetailsMap.get(dateKey) || {
        date: dateKey,
        emailSendCount: 0,
        weightKg: 0,
        protectorsAmount: 0,
        totalAmount: 0,
      };

      existing.emailSendCount += 1;
      existing.weightKg += emailSend.totalWeight ?? 0;
      existing.protectorsAmount += emailSend.protectorsAmount ?? 0;
      existing.totalAmount += emailSend.totalAmount ?? 0;

      dateDetailsMap.set(dateKey, existing);
    });

    const dateDetails = Array.from(dateDetailsMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const totals = {
      totalWeightKg: dateDetails.reduce((sum, d) => sum + d.weightKg, 0),
      protectorsAmount: dateDetails.reduce((sum, d) => sum + d.protectorsAmount, 0),
      totalAmount: dateDetails.reduce((sum, d) => sum + d.totalAmount, 0),
      totalEmailSendCount: dateDetails.reduce((sum, d) => sum + d.emailSendCount, 0),
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(
      hotel.hotelName,
      hotel.hotelRegistrationNumber,
      hotel.address,
      hotel.mobileNumber,
      dateDetails,
      totals
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

