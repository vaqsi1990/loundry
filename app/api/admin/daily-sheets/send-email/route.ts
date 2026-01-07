import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
function renderSection(
  title: string,
  items: any[],
  showPriceColumn: boolean,
  sheetType: "INDIVIDUAL" | "STANDARD"
) {
  const rows = items
    .map(
      (item: any) => {
        const price = item.price ?? "";
        // დამცავებისთვის: გამოიყენე dispatched (გაგზავნილი), სხვებისთვის: received (მიღებული)
        const isProtector = item.category === "PROTECTORS";
        const qty = isProtector ? (item.dispatched ?? 0) : (sheetType === "STANDARD" ? (item.received ?? 0) : (item.dispatched ?? item.received ?? 0));
        const lineTotal = price ? (Number(price) * Number(qty)).toFixed(2) : "";
        if (sheetType === "INDIVIDUAL") {
          return `
            <tr>
              <td style="border:1px solid #ccc;padding:6px;">${item.itemNameKa}</td>
              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.weight?.toFixed(3) ?? "0.000"}</td>
              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.received ?? 0}</td>
              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.washCount ?? 0}</td>
              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.dispatched ?? 0}</td>
              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.shortage ?? 0}</td>
              <td style="border:1px solid #ccc;padding:6px;text-align:center;">${(item.totalWeight ?? item.weight ?? 0).toFixed(2)}</td>
              ${showPriceColumn ? `<td style="border:1px solid #ccc;padding:6px;text-align:center;">${price ? `${price} ₾` : "-"}</td>` : ""}
              ${showPriceColumn ? `<td style="border:1px solid #ccc;padding:6px;text-align:center;">${lineTotal ? `${lineTotal} ₾` : "-"}</td>` : ""}
              <td style="border:1px solid #ccc;padding:6px;">${item.comment || ""}</td>
            </tr>`;
        }

        // STANDARD layout: no weight/washCount columns, uses received/dispatched/shortage
        return `
          <tr>
            <td style="border:1px solid #ccc;padding:6px;">${item.itemNameKa}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.received ?? 0}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.dispatched ?? 0}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.shortage ?? 0}</td>
            ${showPriceColumn ? `<td style="border:1px solid #ccc;padding:6px;text-align:center;">${price ? `${price} ₾` : "-"}</td>` : ""}
            ${showPriceColumn ? `<td style="border:1px solid #ccc;padding:6px;text-align:center;">${lineTotal ? `${lineTotal} ₾` : "-"}</td>` : ""}
            <td style="border:1px solid #ccc;padding:6px;">${item.comment || ""}</td>
          </tr>`;
      }
    )
    .join("");

  const colSpan = (() => {
    if (sheetType === "INDIVIDUAL") return showPriceColumn ? 10 : 8;
    return showPriceColumn ? 7 : 5;
  })();

  return `
    <tr style="background:#fde9d9;">
      <td colspan="${colSpan}" style="border:1px solid #ccc;padding:6px;font-weight:600;">${title}</td>
    </tr>
    ${rows}
  `;
}

function renderHtml(sheet: any, hotelCompanyName?: string | null, managerName?: string | null) {
  const date = new Date(sheet.date).toLocaleDateString("ka-GE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const towels = sheet.items.filter((i: any) => i.category === "TOWELS");
  const linen = sheet.items.filter((i: any) => i.category === "LINEN");
  const protectors = sheet.items.filter((i: any) => i.category === "PROTECTORS");
  const hasProtectors = protectors.length > 0;
  const hasLinenOrTowels = linen.length > 0 || towels.length > 0;
  const showPriceColumn = hasProtectors || hasLinenOrTowels; // იგივე ლოგიკა, როგორც DailySheetsSection-ში

  const totals = sheet.items.reduce(
    (acc: any, item: any) => {
      acc.received += item.received ?? 0;
      acc.washCount += item.washCount ?? 0;
      acc.dispatched += item.dispatched ?? 0;
      acc.shortage += item.shortage ?? 0;
      // UI totals in DailySheetsSection use raw weight (not multiplied)
      acc.totalWeight += item.totalWeight ?? item.weight ?? 0;
      return acc;
    },
    { received: 0, washCount: 0, dispatched: 0, shortage: 0, totalWeight: 0 }
  );

  // Prices (mirror DailySheetsSection)
  // დამცავების ფასი: გაგზავნილი (dispatched) * ფასი
  const protectorsTotal =
    sheet.sheetType === "STANDARD" && sheet.totalPrice
      ? sheet.totalPrice
      : protectors.reduce((sum: number, p: any) => {
          const price = Number(p.price ?? 0);
          const qty = Number(p.dispatched ?? 0); // გამოიყენე dispatched-ის ნაცვლად received-ის
          return sum + price * qty;
        }, 0);

  const weightForPrice =
    sheet.sheetType === "STANDARD" && sheet.totalWeight
      ? sheet.totalWeight
      : totals.totalWeight;

  const linenTowelsPrice =
    sheet.pricePerKg && weightForPrice ? sheet.pricePerKg * weightForPrice : 0;

  const totalPrice = linenTowelsPrice + protectorsTotal;

  return `
    <!DOCTYPE html>
    <html lang="ka">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>დღის ფურცელი</title>
    </head>
    <body style="margin:0;padding:20px;font-family:Arial,sans-serif;color:#222;background-color:#f5f5f5;">
      <div style="max-width:800px;margin:0 auto;background-color:#ffffff;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <div style="display:flex;align-items:center;gap:30px;margin-bottom:16px;border-bottom:2px solid #fde9d9;padding-bottom:16px;">
          <img src="cid:logo" alt="Logo" style="width:100px;height:100px;border-radius:50%;object-fit:cover;" />
          <div style="text-align:left;">
            <h2 style="margin:0 0 8px 0;color:#333;">დღის ფურცელი</h2>
            <p style="margin:0 0 4px 0;color:#666;"><strong>თარიღი:</strong> ${date}</p>
            <p style="margin:0 0 4px 0;color:#666;"><strong>სასტუმრო:</strong> ${sheet.hotelName || "-"}</p>
            ${managerName ? `<p style="margin:0 0 4px 0;color:#666;"><strong>მენეჯერი:</strong> ${managerName}</p>` : ""}
          </div>
        </div>
     
      ${sheet.roomNumber ? `<p style="margin:0 0 8px 0;"><strong>ოთახი:</strong> ${sheet.roomNumber}</p>` : ""}
      ${sheet.description ? `<p style="margin:0 0 8px 0;"><strong>აღწერა:</strong> ${sheet.description}</p>` : ""}
      ${sheet.notes ? `<p style="margin:0 0 8px 0;"><strong>შენიშვნები:</strong> ${sheet.notes}</p>` : ""}

      <table style="border-collapse:collapse;width:100%;margin-top:8px;font-size:14px;">
        <thead>
          <tr style="background:#fde9d9;">
            <th style="border:1px solid #ccc;padding:6px;text-align:left;">ერთეული</th>
            ${
              sheet.sheetType === "INDIVIDUAL"
                ? `
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">წონა (კგ)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">მიღებული (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">რეცხვის რაოდენობა (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">გაგზავნილი (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">დატოვებული (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">სულ წონა (კგ)</th>
                `
                : `
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">მიღებული (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">გაგზავნილი (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">დატოვებული (ც.)</th>
                `
            }
            ${showPriceColumn ? '<th style="border:1px solid #ccc;padding:6px;text-align:center;">1 ც-ის ფასი (₾) *</th>' : ""}
            ${showPriceColumn ? '<th style="border:1px solid #ccc;padding:6px;text-align:center;">ჯამი (₾)</th>' : ""}
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">შენიშვნა</th>
          </tr>
        </thead>
        <tbody>
        ${renderSection("თეთრეული", linen, showPriceColumn, sheet.sheetType)}
          ${renderSection("პირსახოცები", towels, showPriceColumn, sheet.sheetType)}
          ${hasProtectors ? renderSection("დამცავები", protectors, showPriceColumn, sheet.sheetType) : ""}
        </tbody>
        <tfoot>
          <tr style="background:#f5f5f5;font-weight:600;">
            <td style="border:1px solid #ccc;padding:6px;text-align:left;">სულ</td>
            ${
              sheet.sheetType === "INDIVIDUAL"
                ? `
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.received}</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.washCount}</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.dispatched}</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.shortage}</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.totalWeight.toFixed(2)}</td>
                `
                : `
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.received}</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.dispatched}</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.shortage}</td>
                `
            }
            ${showPriceColumn ? '<td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>' : ""}
            ${showPriceColumn ? `<td style="border:1px solid #ccc;padding:6px;text-align:center;">${protectorsTotal > 0 ? protectorsTotal.toFixed(2) + " ₾" : "-"}</td>` : ""}
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
          </tr>
          ${
            sheet.sheetType === "STANDARD" && sheet.totalWeight
              ? `
                <tr style="background:#e8f2ff;font-weight:600;">
                  <td colspan="${sheet.sheetType === "INDIVIDUAL" ? 6 : 3}" style="border:1px solid #ccc;padding:6px;text-align:right;">მთლიანი წონა:</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${sheet.totalWeight.toFixed(2)} კგ</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
                </tr>
              `
              : ""
          }
          ${
            sheet.pricePerKg
              ? `
                <tr style="background:#e8f2ff;font-weight:600;">
                  <td colspan="${sheet.sheetType === "INDIVIDUAL" ? 6 : 3}" style="border:1px solid #ccc;padding:6px;text-align:right;">1 კგ-ის ფასი:</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${sheet.pricePerKg.toFixed(2)} ₾</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
                </tr>
              `
              : ""
          }
          ${
            hasProtectors && protectorsTotal > 0
              ? `
                <tr style="background:#f3e5f5;font-weight:600;">
                  <td colspan="${sheet.sheetType === "INDIVIDUAL" ? (showPriceColumn ? 6 : 6) : (showPriceColumn ? 3 : 3)}" style="border:1px solid #ccc;padding:6px;text-align:right;">დამცავების ფასი (იც):</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${protectorsTotal.toFixed(2)} ₾</td>
                  ${showPriceColumn ? '<td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>' : ""}
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
                </tr>
              `
              : ""
          }
          ${
            totalPrice > 0
              ? `
                <tr style="background:#e8f5e9;font-weight:700;">
                  <td colspan="${sheet.sheetType === "INDIVIDUAL" ? 6 : 3}" style="border:1px solid #ccc;padding:6px;text-align:right;">მთლიანი ფასი:</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totalPrice.toFixed(2)} ₾</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
                </tr>
              `
              : ""
          }
        </tfoot>
      </table>
      </div>
    </body>
    </html>
  `;
}

function renderText(sheet: any, managerName?: string | null) {
  const date = new Date(sheet.date).toLocaleDateString("ka-GE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let text = `დღის ფურცელი\n`;
  text += `თარიღი: ${date}\n`;
  text += `სასტუმრო: ${sheet.hotelName || "-"}\n`;
  if (managerName) text += `მენეჯერი: ${managerName}\n`;
  text += `\n`;
  
  if (sheet.roomNumber) text += `ოთახი: ${sheet.roomNumber}\n`;
  if (sheet.description) text += `აღწერა: ${sheet.description}\n`;
  if (sheet.notes) text += `შენიშვნები: ${sheet.notes}\n`;
  
  text += `\nდეტალური ინფორმაცია HTML ვერსიაში.\n`;
  
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const body = await req.json();
    const { sheetId, to } = body;

    if (!sheetId) {
      return NextResponse.json({ error: "sheetId სავალდებულოა" }, { status: 400 });
    }

    const sheet = await prisma.dailySheet.findUnique({
      where: { id: sheetId },
      include: { items: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "ფურცელი ვერ მოიძებნა" }, { status: 404 });
    }

    // Fetch hotel information including email
    let companyName: string | null = null;
    let hotelEmail: string | null = null;
    if (sheet.hotelName) {
      const hotel = await prisma.hotel.findFirst({
        where: { hotelName: sheet.hotelName },
        select: { companyName: true, email: true },
      });
      companyName = hotel?.companyName ?? null;
      hotelEmail = hotel?.email ?? null;
    }

    // Use provided email or hotel's email, prioritize provided email
    const recipientEmail = to || hotelEmail;

    if (!recipientEmail) {
      return NextResponse.json({ error: "სასტუმროს ელფოსტა არ არის მითითებული" }, { status: 400 });
    }

    // Calculate amounts for persistence
    // დამცავების ფასი: გაგზავნილი (dispatched) * ფასი
    const protectorsTotal =
      sheet.sheetType === "STANDARD" && sheet.totalPrice
        ? sheet.totalPrice
        : sheet.items
            .filter((p: any) => p.category === "PROTECTORS")
            .reduce((sum: number, p: any) => {
              const price = Number(p.price ?? 0);
              const qty = Number(p.dispatched ?? 0); // გამოიყენე dispatched-ის ნაცვლად received-ის
              return sum + price * qty;
            }, 0);

    const totalsForSend = sheet.items.reduce(
      (acc: any, item: any) => ({
        received: acc.received + (item.received ?? 0),
        washCount: acc.washCount + (item.washCount ?? 0),
        dispatched: acc.dispatched + (item.dispatched ?? 0),
        shortage: acc.shortage + (item.shortage ?? 0),
        totalWeight: acc.totalWeight + (item.totalWeight ?? item.weight ?? 0),
      }),
      { received: 0, washCount: 0, dispatched: 0, shortage: 0, totalWeight: 0 }
    );

    const weightForPrice =
      sheet.sheetType === "STANDARD" && sheet.totalWeight
        ? sheet.totalWeight
        : totalsForSend.totalWeight;

    const linenTowelsPrice =
      sheet.pricePerKg && weightForPrice ? sheet.pricePerKg * weightForPrice : 0;

    const totalPrice = linenTowelsPrice + protectorsTotal;

    // Get logo path
    const logoPath = path.join(process.cwd(), "public", "logo.jpg");
    const logoExists = fs.existsSync(logoPath);

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
    
    const subject = `დღის ფურცელი - ${sheet.hotelName || "სასტუმრო"} - ${new Date(sheet.date).toISOString().split("T")[0]}`;
    
    // Get manager name if user is MANAGER or MANAGER_ASSISTANT
    const managerName = (user.role === "MANAGER" || user.role === "MANAGER_ASSISTANT") ? user.name : null;
    
    console.log("Sending email:", {
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: subject,
    });

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      replyTo: replyTo,
      subject: subject,
      text: renderText(sheet, managerName),
      html: renderHtml(sheet, companyName, managerName),
      headers: {
        "Message-ID": `<${Date.now()}-${Math.random().toString(36)}@${fromEmail.split("@")[1]}>`,
        "X-Mailer": "NodeMailer",
        "X-Priority": "3",
        "Importance": "normal",
        "MIME-Version": "1.0",
      },
      date: new Date(),
      attachments: logoExists
        ? [
            {
              filename: "logo.jpg",
              path: logoPath,
              cid: "logo", // Content-ID for referencing in HTML
            },
          ]
        : [],
    });

    console.log("Email sent successfully to:", recipientEmail);

    // Mark sheet as emailed
    await prisma.$transaction([
      prisma.dailySheet.update({
        where: { id: sheetId },
        data: {
          emailedAt: new Date(),
          emailedTo: recipientEmail,
          emailSendCount: { increment: 1 },
        },
      }),
     
      prisma.dailySheetEmailSend.create({
        data: {
          dailySheetId: sheet.id,
          hotelName: sheet.hotelName,
          date: sheet.date,
          sentTo: recipientEmail,
          subject: `დღის ფურცელი - ${sheet.hotelName || "სასტუმრო"} - ${new Date(sheet.date).toISOString().split("T")[0]}`,
          sheetType: sheet.sheetType,
          pricePerKg: sheet.pricePerKg,
          totalWeight: sheet.totalWeight ?? totalsForSend.totalWeight ?? null,
          protectorsAmount: protectorsTotal,
          totalAmount: totalPrice,
          payload: {
            sheet,
            totals: totalsForSend,
            weightForPrice,
            linenTowelsPrice,
            protectorsTotal,
            totalPrice,
            companyName,
          },
        },
      }),
    ]);

    return NextResponse.json({ message: "გაგზავნილია" });
  } catch (error: any) {
    console.error("=== Daily sheet email send error ===");
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
    let errorMessage = "გაგზავნისას მოხდა შეცდომა";
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

