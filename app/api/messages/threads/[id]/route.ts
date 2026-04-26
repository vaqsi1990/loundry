import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAdminNotifyTo, sendMessageEmail } from "@/app/api/messages/mail";

const ADMIN_ROLES = new Set(["ADMIN", "MANAGER", "MANAGER_ASSISTANT"] as const);

async function getUserRole(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ?? null;
}

function senderTypeFromRole(role: string) {
  return role === "ADMIN" ? "ADMIN" : "MANAGER";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRole(session.user.id);
    if (!role) {
      return NextResponse.json({ error: "მომხმარებელი არ მოიძებნა" }, { status: 404 });
    }

    const thread = await prisma.hotelConversation.findUnique({
      where: { id },
      include: {
        hotel: {
          select: {
            id: true,
            hotelName: true,
            type: true,
            email: true,
            mobileNumber: true,
            userId: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200,
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "ჩატი არ მოიძებნა" }, { status: 404 });
    }

    // Authorization: admin roles can read all; hotel user can only read their hotel thread
    if (!ADMIN_ROLES.has(role as any)) {
      if (!thread.hotel?.userId || thread.hotel.userId !== session.user.id) {
        return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
      }
    }

    // Mark as read
    if (ADMIN_ROLES.has(role as any)) {
      await prisma.hotelMessage.updateMany({
        where: {
          conversationId: thread.id,
          senderType: "HOTEL",
          readByAdminAt: null,
        },
        data: { readByAdminAt: new Date() },
      });
    } else {
      await prisma.hotelMessage.updateMany({
        where: {
          conversationId: thread.id,
          senderType: { in: ["ADMIN", "MANAGER"] },
          readByHotelAt: null,
        },
        data: { readByHotelAt: new Date() },
      });
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Thread fetch error:", error);
    return NextResponse.json({ error: "ჩატის ჩატვირთვისას მოხდა შეცდომა" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const { id } = await params;
    const role = await getUserRole(session.user.id);
    if (!role) {
      return NextResponse.json({ error: "მომხმარებელი არ მოიძებნა" }, { status: 404 });
    }

    const body = await request.json();
    const messageBody = (body?.body as string | undefined)?.trim();
    if (!messageBody) {
      return NextResponse.json({ error: "შეტყობინება ცარიელია" }, { status: 400 });
    }

    const thread = await prisma.hotelConversation.findUnique({
      where: { id },
      include: { hotel: { select: { userId: true, hotelName: true, email: true } } },
    });
    if (!thread) {
      return NextResponse.json({ error: "ჩატი არ მოიძებნა" }, { status: 404 });
    }

    // Authorization
    const isAdmin = ADMIN_ROLES.has(role as any);
    if (!isAdmin) {
      if (!thread.hotel?.userId || thread.hotel.userId !== session.user.id) {
        return NextResponse.json({ error: "დაუშვებელია" }, { status: 403 });
      }
    }

    const msg = await prisma.hotelMessage.create({
      data: {
        conversationId: thread.id,
        senderType: isAdmin ? senderTypeFromRole(role) : "HOTEL",
        senderUserId: session.user.id,
        body: messageBody,
        readByAdminAt: isAdmin ? new Date() : null,
        readByHotelAt: isAdmin ? null : new Date(),
      },
    });

    await prisma.hotelConversation.update({
      where: { id: thread.id },
      data: { lastMessageAt: msg.createdAt },
    });

    // Email notifications
    try {
      if (isAdmin) {
        if (thread.hotel?.email) {
          const author = role === "ADMIN" ? "ადმინისტრაცია" : "მენეჯერი";
          await sendMessageEmail({
            to: thread.hotel.email,
            subject: `ახალი შეტყობინება - ${thread.hotel.hotelName}`,
            text: `${author}:\n\n${messageBody}\n`,
            html: `<div style="font-family: Arial, sans-serif; padding: 16px;">
<h3 style="margin: 0 0 8px 0;">ახალი შეტყობინება (${author})</h3>
<p style="margin: 0 0 8px 0;"><strong>სასტუმრო:</strong> ${thread.hotel.hotelName}</p>
<pre style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border-radius: 8px; border: 1px solid #eee;">${messageBody}</pre>
</div>`,
          });
        }
      } else {
        const to = getAdminNotifyTo();
        await sendMessageEmail({
          to,
          subject: `ახალი პასუხი ჩატში - ${thread.hotel?.hotelName ?? "სასტუმრო"}`,
          text: `სასტუმრო: ${thread.hotel?.hotelName ?? "-"}\n\n${messageBody}\n`,
          html: `<div style="font-family: Arial, sans-serif; padding: 16px;">
<h3 style="margin: 0 0 8px 0;">ახალი პასუხი სასტუმროდან</h3>
<p style="margin: 0 0 8px 0;"><strong>სასტუმრო:</strong> ${thread.hotel?.hotelName ?? "-"}</p>
<pre style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border-radius: 8px; border: 1px solid #eee;">${messageBody}</pre>
</div>`,
        });
      }
    } catch (e) {
      console.error("Message email notify (thread) failed:", e);
    }

    return NextResponse.json(msg, { status: 201 });
  } catch (error) {
    console.error("Thread message send error:", error);
    return NextResponse.json({ error: "შეტყობინების გაგზავნისას მოხდა შეცდომა" }, { status: 500 });
  }
}

