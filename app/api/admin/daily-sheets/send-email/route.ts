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
        const qty = sheetType === "STANDARD" ? (item.received ?? 0) : (item.dispatched ?? item.received ?? 0);
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

function renderHtml(sheet: any, hotelCompanyName?: string | null) {
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
  const protectorsTotal =
    sheet.sheetType === "STANDARD" && sheet.totalPrice
      ? sheet.totalPrice
      : protectors.reduce((sum: number, p: any) => {
          const price = Number(p.price ?? 0);
          const qty = Number(p.received ?? 0);
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
    <div style="font-family:Arial,sans-serif;color:#222;">
      <div style="display:flex;align-items:center;gap:30px;margin-bottom:16px;">
        <img src="cid:logo" alt="Logo" style="width:100px;height:100px;border-radius:50%;object-fit:cover;" />
        <div style="text-align:center;">
          <h2 style="margin:0 0 8px 0;">დღის ფურცელი</h2>
          <p style="margin:0 0 4px 0;"><strong>თარიღი:</strong> ${date}</p>
          <p style="margin:0 0 4px 0;"><strong>სასტუმრო:</strong> ${sheet.hotelName || "-"}</p>
        </div>
      </div>
     
      ${sheet.roomNumber ? `<p style="margin:0 0 8px 0;"><strong>ოთახი:</strong> ${sheet.roomNumber}</p>` : ""}
      ${sheet.description ? `<p style="margin:0 0 8px 0;"><strong>აღწერა:</strong> ${sheet.description}</p>` : ""}
      ${sheet.notes ? `<p style="margin:0 0 8px 0;"><strong>შენიშვნები:</strong> ${sheet.notes}</p>` : ""}

      <div style="margin:10px 0; padding:10px; border:1px solid #ddd; border-radius:6px; background:#f9f9f9;">
        <p style="margin:4px 0;"><strong>სულ მიღებული:</strong> ${totals.received} ც.</p>
        <p style="margin:4px 0;"><strong>სულ რეცხვის რაოდენობა:</strong> ${totals.washCount} ც.</p>
        <p style="margin:4px 0;"><strong>სულ გაგზავნილი:</strong> ${totals.dispatched} ც.</p>
        <p style="margin:4px 0;"><strong>სულ დეფიციტი:</strong> ${totals.shortage} ც.</p>
        <p style="margin:4px 0;"><strong>მთლიანი წონა:</strong> ${totals.totalWeight.toFixed(2)} კგ</p>
        ${sheet.pricePerKg ? `<p style="margin:4px 0;"><strong>1 კგ-ის ფასი:</strong> ${sheet.pricePerKg.toFixed(2)} ₾</p>` : ""}
        ${hasProtectors ? `<p style="margin:4px 0;"><strong>დამცავების ფასი:</strong> ${protectorsTotal.toFixed(2)} ₾</p>` : ""}
        ${totalPrice > 0 ? `<p style="margin:4px 0;"><strong>მთლიანი ფასი:</strong> ${totalPrice.toFixed(2)} ₾</p>` : ""}
      </div>

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
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">დეფიციტი (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">სულ წონა (კგ)</th>
                `
                : `
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">მიღებული (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">გაგზავნილი (ც.)</th>
                  <th style="border:1px solid #ccc;padding:6px;text-align:center;">დეფიციტი (ც.)</th>
                `
            }
            ${hasProtectors ? '<th style="border:1px solid #ccc;padding:6px;text-align:center;">1 ც-ის ფასი</th>' : ""}
            ${hasProtectors ? '<th style="border:1px solid #ccc;padding:6px;text-align:center;">ჯამი (₾)</th>' : ""}
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">შენიშვნა</th>
          </tr>
        </thead>
        <tbody>
          ${renderSection("პირსახოცები", towels, false, sheet.sheetType)}
          ${renderSection("თეთრეული", linen, false, sheet.sheetType)}
          ${hasProtectors ? renderSection("დამცავები", protectors, true, sheet.sheetType) : ""}
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
            ${hasProtectors ? '<td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>' : ""}
            ${hasProtectors ? `<td style="border:1px solid #ccc;padding:6px;text-align:center;">${protectorsTotal.toFixed(2)} ₾</td>` : ""}
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
          </tr>
          ${
            sheet.sheetType === "STANDARD" && sheet.totalWeight
              ? `
                <tr style="background:#e8f2ff;font-weight:600;">
                  <td colspan="3" style="border:1px solid #ccc;padding:6px;text-align:right;">მთლიანი წონა:</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;">${sheet.totalWeight.toFixed(2)} კგ</td>
                  <td style="border:1px solid #ccc;padding:6px;text-align:center;" colspan="${hasProtectors ? 3 : 1}">-</td>
                </tr>
              `
              : ""
          }
        </tfoot>
      </table>
    </div>
  `;
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { sheetId, to } = body;

    if (!sheetId || !to) {
      return NextResponse.json({ error: "sheetId და მიმღები ელფოსტა სავალდებულოა" }, { status: 400 });
    }

    const sheet = await prisma.dailySheet.findUnique({
      where: { id: sheetId },
      include: { items: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "ფურცელი ვერ მოიძებნა" }, { status: 404 });
    }

    // Try to fetch companyName for the hotel
    let companyName: string | null = null;
    if (sheet.hotelName) {
      const hotel = await prisma.hotel.findFirst({
        where: { hotelName: sheet.hotelName },
        select: { companyName: true },
      });
      companyName = hotel?.companyName ?? null;
    }

    // Calculate amounts for persistence
    const protectorsTotal =
      sheet.sheetType === "STANDARD" && sheet.totalPrice
        ? sheet.totalPrice
        : sheet.items
            .filter((p: any) => p.category === "PROTECTORS")
            .reduce((sum: number, p: any) => {
              const price = Number(p.price ?? 0);
              const qty = Number(p.received ?? 0);
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

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `დღის ფურცელი - ${sheet.hotelName || "სასტუმრო"} - ${new Date(sheet.date).toISOString().split("T")[0]}`,
      html: renderHtml(sheet, companyName),
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

    // Mark sheet as emailed
    await prisma.$transaction([
      prisma.dailySheet.update({
        where: { id: sheetId },
        data: {
          emailedAt: new Date(),
          emailedTo: to,
          emailSendCount: { increment: 1 },
        },
      }),
     
      prisma.dailySheetEmailSend.create({
        data: {
          dailySheetId: sheet.id,
          hotelName: sheet.hotelName,
          date: sheet.date,
          sentTo: to,
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
  } catch (error) {
    console.error("Daily sheet email send error:", error);
    return NextResponse.json({ error: "გაგზავნისას მოხდა შეცდომა" }, { status: 500 });
  }
}

