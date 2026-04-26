import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAdminNotifyTo, sendMessageEmail } from "@/app/api/messages/mail";

const ADMIN_ROLES = new Set(["ADMIN", "MANAGER", "MANAGER_ASSISTANT"] as const);

function senderTypeFromRole(role: string) {
  return role === "ADMIN" ? "ADMIN" : "MANAGER";
}

export async function GET() {
  try {
    // If dev server wasn't restarted after prisma generate, new models may be missing.
    if (!(prisma as any).hotelConversation) {
      return NextResponse.json(
        { error: "Prisma client არ განახლდა. გაუშვი `npx prisma generate` და დაარესტარტე dev server." },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "მომხმარებელი არ მოიძებნა" }, { status: 404 });
    }

    if (ADMIN_ROLES.has(user.role as any)) {
      const threads = await prisma.hotelConversation.findMany({
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        include: {
          hotel: {
            select: {
              id: true,
              hotelName: true,
              type: true,
              email: true,
              mobileNumber: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              body: true,
              senderType: true,
              createdAt: true,
              readByAdminAt: true,
              readByHotelAt: true,
            },
          },
        },
      });

      return NextResponse.json(threads);
    }

    // Hotel user: return (and create if missing) their single thread
    const hotel = await prisma.hotel.findFirst({
      where: { userId: session.user.id },
      select: { id: true, hotelName: true, type: true, email: true, mobileNumber: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: "სასტუმრო არ მოიძებნა" }, { status: 404 });
    }

    const thread =
      (await prisma.hotelConversation.findUnique({
        where: { hotelId: hotel.id },
        include: {
          hotel: true,
          messages: {
            orderBy: { createdAt: "asc" },
            take: 50,
          },
        },
      })) ??
      (await prisma.hotelConversation.create({
        data: {
          hotelId: hotel.id,
        },
        include: {
          hotel: true,
          messages: true,
        },
      }));

    return NextResponse.json([thread]);
  } catch (error) {
    console.error("Threads fetch error:", error);
    return NextResponse.json({ error: "შეტყობინებების ჩატვირთვისას მოხდა შეცდომა" }, { status: 500 });
  }
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
    if (!user) {
      return NextResponse.json({ error: "მომხმარებელი არ მოიძებნა" }, { status: 404 });
    }

    const body = await request.json();
    const messageBody = (body?.body as string | undefined)?.trim();
    const hotelId = body?.hotelId as string | undefined;

    if (!messageBody) {
      return NextResponse.json({ error: "შეტყობინება ცარიელია" }, { status: 400 });
    }

    if (ADMIN_ROLES.has(user.role as any)) {
      if (!hotelId) {
        return NextResponse.json({ error: "hotelId აუცილებელია" }, { status: 400 });
      }

      const thread =
        (await prisma.hotelConversation.findUnique({ where: { hotelId } })) ??
        (await prisma.hotelConversation.create({ data: { hotelId } }));

      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { id: true, hotelName: true, email: true },
      });
      if (!hotel) {
        return NextResponse.json({ error: "სასტუმრო არ მოიძებნა" }, { status: 404 });
      }

      const msg = await prisma.hotelMessage.create({
        data: {
          conversationId: thread.id,
          senderType: senderTypeFromRole(user.role),
          senderUserId: session.user.id,
          body: messageBody,
          readByAdminAt: new Date(),
        },
      });

      await prisma.hotelConversation.update({
        where: { id: thread.id },
        data: { lastMessageAt: msg.createdAt },
      });

      // Email notify hotel about new admin/manager message
      try {
        if (hotel.email) {
          const author = user.role === "ADMIN" ? "ადმინისტრაცია" : "მენეჯერი";
          await sendMessageEmail({
            to: hotel.email,
            subject: `ახალი შეტყობინება - ${hotel.hotelName}`,
            text: `${author}:\n\n${messageBody}\n`,
            html: `<div style="font-family: Arial, sans-serif; padding: 16px;">
<h3 style="margin: 0 0 8px 0;">ახალი შეტყობინება (${author})</h3>
<p style="margin: 0 0 8px 0;"><strong>სასტუმრო:</strong> ${hotel.hotelName}</p>
<pre style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border-radius: 8px; border: 1px solid #eee;">${messageBody}</pre>
</div>`,
          });
        }
      } catch (e) {
        console.error("Message email notify (admin->hotel) failed:", e);
      }

      return NextResponse.json({ threadId: thread.id, message: msg }, { status: 201 });
    }

    // Hotel reply (thread auto-detected by userId)
    const hotel = await prisma.hotel.findFirst({
      where: { userId: session.user.id },
      select: { id: true, hotelName: true, email: true },
    });
    if (!hotel) {
      return NextResponse.json({ error: "სასტუმრო არ მოიძებნა" }, { status: 404 });
    }

    const thread =
      (await prisma.hotelConversation.findUnique({ where: { hotelId: hotel.id } })) ??
      (await prisma.hotelConversation.create({ data: { hotelId: hotel.id } }));

    const msg = await prisma.hotelMessage.create({
      data: {
        conversationId: thread.id,
        senderType: "HOTEL",
        senderUserId: session.user.id,
        body: messageBody,
        readByHotelAt: new Date(),
      },
    });

    await prisma.hotelConversation.update({
      where: { id: thread.id },
      data: { lastMessageAt: msg.createdAt },
    });

    // Email notify admin/manager(s) about new hotel reply
    try {
      const to = getAdminNotifyTo();
      await sendMessageEmail({
        to,
        subject: `ახალი პასუხი ჩატში - ${hotel.hotelName}`,
        text: `სასტუმრო: ${hotel.hotelName}\n\n${messageBody}\n`,
        html: `<div style="font-family: Arial, sans-serif; padding: 16px;">
<h3 style="margin: 0 0 8px 0;">ახალი პასუხი სასტუმროდან</h3>
<p style="margin: 0 0 8px 0;"><strong>სასტუმრო:</strong> ${hotel.hotelName}</p>
<pre style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border-radius: 8px; border: 1px solid #eee;">${messageBody}</pre>
</div>`,
      });
    } catch (e) {
      console.error("Message email notify (hotel->admin) failed:", e);
    }

    return NextResponse.json({ threadId: thread.id, message: msg }, { status: 201 });
  } catch (error) {
    console.error("Thread message create error:", error);
    return NextResponse.json({ error: "შეტყობინების გაგზავნისას მოხდა შეცდომა" }, { status: 500 });
  }
}

