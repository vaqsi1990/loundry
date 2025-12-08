import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP კონფიგურაცია არასრულია (SMTP_HOST/SMTP_USER/SMTP_PASS)");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function renderSection(title: string, items: any[]) {
  const rows = items
    .map(
      (item: any) => `
        <tr>
          <td style="border:1px solid #ccc;padding:6px;">${item.itemNameKa}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.weight?.toFixed(3) ?? "0.000"}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.received ?? 0}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.washCount ?? 0}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.dispatched ?? 0}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.shortage ?? 0}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.totalWeight?.toFixed(2) ?? "0.00"}</td>
          <td style="border:1px solid #ccc;padding:6px;">${item.comment || ""}</td>
        </tr>`
    )
    .join("");

  return `
    <tr style="background:#fde9d9;">
      <td colspan="8" style="border:1px solid #ccc;padding:6px;font-weight:600;">${title}</td>
    </tr>
    ${rows}
  `;
}

function renderHtml(sheet: any) {
  const date = new Date(sheet.date).toLocaleDateString("ka-GE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const towels = sheet.items.filter((i: any) => i.category === "TOWELS");
  const linen = sheet.items.filter((i: any) => i.category === "LINEN");

  const totals = sheet.items.reduce(
    (acc: any, item: any) => {
      acc.received += item.received ?? 0;
      acc.washCount += item.washCount ?? 0;
      acc.dispatched += item.dispatched ?? 0;
      acc.shortage += item.shortage ?? 0;
      acc.totalWeight += item.totalWeight ?? 0;
      return acc;
    },
    { received: 0, washCount: 0, dispatched: 0, shortage: 0, totalWeight: 0 }
  );

  return `
    <div style="font-family:Arial,sans-serif;color:#222;">
      <h2 style="margin:0 0 8px 0;">დღის ფურცელი</h2>
      <p style="margin:0 0 4px 0;"><strong>თარიღი:</strong> ${date}</p>
      <p style="margin:0 0 4px 0;"><strong>სასტუმრო:</strong> ${sheet.hotelName || "-"}</p>
      ${sheet.roomNumber ? `<p style="margin:0 0 8px 0;"><strong>ოთახი:</strong> ${sheet.roomNumber}</p>` : ""}
      ${sheet.description ? `<p style="margin:0 0 8px 0;"><strong>აღწერა:</strong> ${sheet.description}</p>` : ""}

      <table style="border-collapse:collapse;width:100%;margin-top:8px;font-size:14px;">
        <thead>
          <tr style="background:#fde9d9;">
            <th style="border:1px solid #ccc;padding:6px;text-align:left;">ერთეული</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">წონა (კგ)</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">მიღებული (ც.)</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">რეცხვის რაოდენობა (ც.)</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">გაგზავნილი (ც.)</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">დეფიციტი (ც.)</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">სულ წონა (კგ)</th>
            <th style="border:1px solid #ccc;padding:6px;text-align:center;">შენიშვნა</th>
          </tr>
        </thead>
        <tbody>
          ${renderSection("პირსახოცები", towels)}
          ${renderSection("თეთრეული", linen)}
        </tbody>
        <tfoot>
          <tr style="background:#f5f5f5;font-weight:600;">
            <td style="border:1px solid #ccc;padding:6px;text-align:left;">სულ</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.received}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.washCount}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.dispatched}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.shortage}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">${totals.totalWeight.toFixed(2)}</td>
            <td style="border:1px solid #ccc;padding:6px;text-align:center;">-</td>
          </tr>
        </tfoot>
      </table>
      ${sheet.notes ? `<p style="margin-top:8px;"><strong>შენიშვნები:</strong> ${sheet.notes}</p>` : ""}
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

    const transporter = createTransport();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `დღის ფურცელი - ${sheet.hotelName || "სასტუმრო"} - ${new Date(sheet.date).toISOString().split("T")[0]}`,
      html: renderHtml(sheet),
    });

    return NextResponse.json({ message: "გაგზავნილია" });
  } catch (error) {
    console.error("Daily sheet email send error:", error);
    return NextResponse.json({ error: "გაგზავნისას მოხდა შეცდომა" }, { status: 500 });
  }
}

