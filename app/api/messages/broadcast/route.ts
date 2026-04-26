import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendMessageEmail } from "@/app/api/messages/mail";

const ADMIN_ROLES = new Set(["ADMIN", "MANAGER", "MANAGER_ASSISTANT"] as const);

function senderTypeFromRole(role: string) {
  return role === "ADMIN" ? "ADMIN" : "MANAGER";
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
    if (!user || !ADMIN_ROLES.has(user.role as any)) {
      return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
    }

    const body = await request.json();
    const messageBody = (body?.body as string | undefined)?.trim();
    const all = Boolean(body?.all);
    const hotelIds = (body?.hotelIds as string[] | undefined) ?? [];

    if (!messageBody) {
      return NextResponse.json({ error: "შეტყობინება ცარიელია" }, { status: 400 });
    }

    if (!all && hotelIds.length === 0) {
      return NextResponse.json({ error: "აირჩიეთ მინიმუმ ერთი სასტუმრო" }, { status: 400 });
    }

    const hotels = await prisma.hotel.findMany({
      where: all ? {} : { id: { in: hotelIds } },
      select: { id: true, hotelName: true, email: true },
      orderBy: { hotelName: "asc" },
    });

    if (hotels.length === 0) {
      return NextResponse.json({ error: "სასტუმროები ვერ მოიძებნა" }, { status: 404 });
    }

    const senderType = senderTypeFromRole(user.role);
    const author = user.role === "ADMIN" ? "ადმინისტრაცია" : "მენეჯერი";

    let sent = 0;
    let emailed = 0;
    const failures: Array<{ hotelId: string; error: string }> = [];

    for (const h of hotels) {
      try {
        const thread = await prisma.hotelConversation.upsert({
          where: { hotelId: h.id },
          create: { hotelId: h.id },
          update: {},
        });

        const msg = await prisma.hotelMessage.create({
          data: {
            conversationId: thread.id,
            senderType,
            senderUserId: session.user.id,
            body: messageBody,
            readByAdminAt: new Date(),
          },
        });

        await prisma.hotelConversation.update({
          where: { id: thread.id },
          data: { lastMessageAt: msg.createdAt },
        });

        sent += 1;

        if (h.email) {
          try {
            await sendMessageEmail({
              to: h.email,
              subject: `ახალი შეტყობინება - ${h.hotelName}`,
              text: `${author}:\n\n${messageBody}\n`,
              html: `<div style="font-family: Arial, sans-serif; padding: 16px;">
<h3 style="margin: 0 0 8px 0;">ახალი შეტყობინება (${author})</h3>
<p style="margin: 0 0 8px 0;"><strong>სასტუმრო:</strong> ${h.hotelName}</p>
<pre style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border-radius: 8px; border: 1px solid #eee;">${messageBody}</pre>
</div>`,
            });
            emailed += 1;
          } catch (e) {
            console.error("Broadcast email failed:", h.id, e);
          }
        }
      } catch (e) {
        console.error("Broadcast send failed:", h.id, e);
        failures.push({ hotelId: h.id, error: e instanceof Error ? e.message : "unknown" });
      }
    }

    return NextResponse.json({
      sent,
      emailed,
      total: hotels.length,
      failures,
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: "გაგზავნისას მოხდა შეცდომა" }, { status: 500 });
  }
}

