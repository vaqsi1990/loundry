import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendMessageEmail } from "@/app/api/messages/mail";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true, name: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const body = await request.json();
    const { hotelId, to, subject, message } = body ?? {};

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId სავალდებულოა" }, { status: 400 });
    }
    if (!subject || String(subject).trim().length === 0) {
      return NextResponse.json({ error: "სათაური სავალდებულოა" }, { status: 400 });
    }
    if (!message || String(message).trim().length === 0) {
      return NextResponse.json({ error: "ტექსტი სავალდებულოა" }, { status: 400 });
    }

    const hotel = await prisma.hotelDatabase.findUnique({
      where: { id: String(hotelId) },
      select: { hotelName: true, email: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "სასტუმრო ვერ მოიძებნა" }, { status: 404 });
    }

    const recipient = String(to ?? hotel.email ?? "").trim();
    if (!recipient) {
      return NextResponse.json({ error: "სასტუმროს ელ. ფოსტა არ არის მითითებული" }, { status: 400 });
    }

    const safeSubject = String(subject).trim();
    const safeMessage = String(message).trim();

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        <p><strong>სასტუმრო:</strong> ${escapeHtml(hotel.hotelName)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
        <div style="white-space:pre-wrap;">${escapeHtml(safeMessage)}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
        <p style="font-size:12px;color:#6b7280;margin:0;">
          გამგზავნი: ${escapeHtml(user.name || "")}${user.email ? ` (${escapeHtml(user.email)})` : ""}
        </p>
      </div>
    `;

    const result = await sendMessageEmail({
      to: recipient,
      subject: safeSubject,
      html,
      text: safeMessage,
      replyTo: user.email || undefined,
    });

    if (result.skipped) {
      return NextResponse.json(
        { message: "Email არ არის დაკონფიგურებული (გაგზავნა გამოტოვებულია)", skipped: true },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "გაგზავნილია", skipped: false });
  } catch (error) {
    console.error("Hotel email send error:", error);
    return NextResponse.json({ error: "გაგზავნისას მოხდა შეცდომა" }, { status: 500 });
  }
}

