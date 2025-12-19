import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import path from "path";

function generateSalaryStatementPDF(
  firstName: string | null,
  lastName: string | null,
  employeeName: string,
  personalId: string | null,
  accruedAmount: number | null,
  issuedAmount: number | null,
  month: number,
  year: number,
  issuedDate?: Date | null
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

      // Get month name
      const months = [
        "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
        "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
      ];
      const monthName = months[month - 1] || month.toString();

      // =========================
      // HEADER
      // =========================
      const headerY = 50;
      
      // Logo
      const logoPath = path.join(process.cwd(), "public", "logo.jpg");
      if (require("fs").existsSync(logoPath)) {
        const logoWidth = 200;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, logoX, headerY - 30, { width: logoWidth });
      }

      // Title
      doc.y = headerY + 100;
      doc.fontSize(20);
      drawBoldText("ხელფასის უწყისი", doc.page.margins.left, doc.y, {
        width: contentWidth,
        align: "center",
      });

      // Company information below title (left side)
      doc.y += 35;
      doc.fontSize(11);
      doc.font("Sylfaen").fillColor("#000");
      doc.text('შპს "ქინგ ლონდრი"', doc.page.margins.left, doc.y);
      doc.y += 15;
      doc.text("ს/კ: 416386645", doc.page.margins.left, doc.y);

      // Draw horizontal divider
      const headerLineY = doc.y + 20;
      doc
        .strokeColor("#000")
        .lineWidth(1)
        .moveTo(doc.page.margins.left, headerLineY)
        .lineTo(pageWidth - doc.page.margins.right, headerLineY)
        .stroke();

      doc.y = headerLineY + 30;

      // =========================
      // EMPLOYEE INFORMATION
      // =========================
      const infoStartY = doc.y;
      const labelWidth = 200;
      const valueWidth = contentWidth - labelWidth - 20;
      const lineHeight = 20;

      // Full name
      const fullName = (firstName && lastName) 
        ? `${firstName} ${lastName}` 
        : employeeName;
      
      let currentY = infoStartY;
      doc.fontSize(12);
      drawBoldText("სახელი და გვარი:", doc.page.margins.left, currentY);
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      doc.text(fullName, doc.page.margins.left + labelWidth, currentY);
      currentY += lineHeight;

      // Personal ID
      if (personalId) {
        doc.fontSize(12);
        drawBoldText("პირადობის ნომერი:", doc.page.margins.left, currentY);
        doc.font("Sylfaen").fontSize(11).fillColor("#000");
        doc.text(personalId, doc.page.margins.left + labelWidth, currentY);
        currentY += lineHeight;
      }

      // Work period
      doc.fontSize(12);
      drawBoldText("სამუშაო პერიოდი:", doc.page.margins.left, currentY);
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      doc.text(`${monthName} ${year}`, doc.page.margins.left + labelWidth, currentY);
      currentY += lineHeight;

      // Date
      const dateToUse = issuedDate || new Date();
      const dateStr = `${dateToUse.getDate().toString().padStart(2, '0')}.${(dateToUse.getMonth() + 1).toString().padStart(2, '0')}.${dateToUse.getFullYear()}`;
      doc.fontSize(12);
      drawBoldText("თარიღი:", doc.page.margins.left, currentY);
      doc.font("Sylfaen").fontSize(11).fillColor("#000");
      doc.text(dateStr, doc.page.margins.left + labelWidth, currentY);
      currentY += lineHeight * 2;
      
      doc.y = currentY;

      // =========================
      // SALARY INFORMATION TABLE
      // =========================
      const tableTop = doc.y;
      const tableLeft = doc.page.margins.left;
      const tableWidth = contentWidth;
      const rowHeight = 25;

      // Table header
      doc
        .save()
        .rect(tableLeft, tableTop, tableWidth, rowHeight)
        .fill("#d0d0d0")
        .restore();
      doc.rect(tableLeft, tableTop, tableWidth, rowHeight).stroke();

      const headerYPos = tableTop + 8;
      doc.fontSize(11);
      drawBoldText("დარიცხული თანხა", tableLeft + 10, headerYPos, {
        width: tableWidth / 2 - 10,
        align: "left",
      });
      drawBoldText("გაცემული თანხა", tableLeft + tableWidth / 2 + 10, headerYPos, {
        width: tableWidth / 2 - 10,
        align: "left",
      });

      // Vertical line
      doc.strokeColor("#000").lineWidth(1);
      doc.moveTo(tableLeft + tableWidth / 2, tableTop)
        .lineTo(tableLeft + tableWidth / 2, tableTop + rowHeight)
        .stroke();

      // Table row
      const rowY = tableTop + rowHeight;
      doc.rect(tableLeft, rowY, tableWidth, rowHeight).stroke();
      doc.strokeColor("#000").lineWidth(1);
      doc.moveTo(tableLeft + tableWidth / 2, rowY)
        .lineTo(tableLeft + tableWidth / 2, rowY + rowHeight)
        .stroke();

      doc.fontSize(12);
      const accruedText = accruedAmount !== null && accruedAmount !== undefined 
        ? formatCurrency(accruedAmount) 
        : "-";
      const issuedText = issuedAmount !== null && issuedAmount !== undefined 
        ? formatCurrency(issuedAmount) 
        : "-";
      
      doc.font("Sylfaen").fontSize(12).fillColor("#000");
      doc.text(accruedText, tableLeft + 10, rowY + 8, {
        width: tableWidth / 2 - 10,
        align: "left",
      });
      doc.text(issuedText, tableLeft + tableWidth / 2 + 10, rowY + 8, {
        width: tableWidth / 2 - 10,
        align: "left",
      });

      doc.y = rowY + rowHeight + 30;

      // =========================
      // AMOUNT IN WORDS AND NOTES
      // =========================
      const amountInWordsY = doc.y;
      const fieldSpacing = 50;
      
      // Amount in words
      doc.fontSize(11);
      drawBoldText("თანხა სიტყვიერად:", doc.page.margins.left, amountInWordsY);
      doc.moveTo(doc.page.margins.left, amountInWordsY + 20)
        .lineTo(doc.page.margins.left + contentWidth, amountInWordsY + 20)
        .stroke();
      
      // Notes
      const notesY = amountInWordsY + fieldSpacing;
      doc.fontSize(11);
      drawBoldText("შენიშვნა:", doc.page.margins.left, notesY);
      doc.moveTo(doc.page.margins.left, notesY + 20)
        .lineTo(doc.page.margins.left + contentWidth, notesY + 20)
        .stroke();

      doc.y = notesY + fieldSpacing;

      // =========================
      // SIGNATURE SECTION
      // =========================
      const signatureY = doc.y;
      const signatureWidth = contentWidth / 2 - 10;

      // Name and Surname (left side)
      doc.fontSize(11);
      drawBoldText("სახელი და გვარი:", doc.page.margins.left, signatureY);
      doc.moveTo(doc.page.margins.left, signatureY + 20)
        .lineTo(doc.page.margins.left + signatureWidth, signatureY + 20)
        .stroke();
      
      // Employee signature (right side, same row)
      doc.fontSize(11);
      drawBoldText("თანამშრომლის ხელმოწერა:", doc.page.margins.left + contentWidth / 2 + 10, signatureY);
      doc.moveTo(doc.page.margins.left + contentWidth / 2 + 10, signatureY + 20)
        .lineTo(doc.page.margins.left + contentWidth, signatureY + 20)
        .stroke();

      // Employer signature (below)
      const employerSignatureY = signatureY + 60;
      doc.fontSize(11);
      drawBoldText("დამსაქმებლის ხელმოწერა:", doc.page.margins.left, employerSignatureY);
      doc.moveTo(doc.page.margins.left, employerSignatureY + 20)
        .lineTo(doc.page.margins.left + signatureWidth, employerSignatureY + 20)
        .stroke();
      doc.font("Sylfaen").fontSize(10).fillColor("#666");
      doc.text("", doc.page.margins.left, employerSignatureY + 25, {
        width: signatureWidth,
        align: "center",
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const salary = await prisma.salary.findUnique({
      where: { id },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "ხელფასი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    // Calculate accrued amount from table if employeeId exists
    let accruedAmount = salary.accruedAmount;
    if (salary.employeeId) {
      const monthStr = `${salary.year}-${String(salary.month).padStart(2, '0')}`;
      const firstDay = new Date(salary.year, salary.month - 1, 1);
      const lastDay = new Date(salary.year, salary.month, 0, 23, 59, 59, 999);
      
      const timeEntries = await prisma.employeeTimeEntry.findMany({
        where: {
          employeeId: salary.employeeId,
          date: {
            gte: firstDay,
            lte: lastDay,
          },
        },
      });

      // Sum dailySalary for all entries
      const totalAccrued = timeEntries.reduce((sum, entry) => {
        return sum + (entry.dailySalary || 0);
      }, 0);

      if (totalAccrued > 0) {
        accruedAmount = totalAccrued;
      }
    }

    // Generate PDF
    const pdfBuffer = await generateSalaryStatementPDF(
      salary.firstName,
      salary.lastName,
      salary.employeeName,
      salary.personalId,
      accruedAmount,
      salary.issuedAmount,
      salary.month,
      salary.year,
      salary.updatedAt
    );

    // Generate filename
    const fullName = (salary.firstName && salary.lastName)
      ? `${salary.firstName}_${salary.lastName}`
      : salary.employeeName.replace(/\s+/g, '_');
    const months = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
    ];
    const monthName = months[salary.month - 1] || salary.month.toString();
    const filename = `ხელფასის_უწყისი_${fullName}_${monthName}_${salary.year}.pdf`;

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

