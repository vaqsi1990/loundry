import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  newPassword: z.string().min(6, "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { newPassword } = schema.parse(body);

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: {
        password: hashed,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });

    // Redirect destination: hotel users to their panel if possible
    const hotel = await prisma.hotel.findFirst({
      where: { userId: (session.user as any).id },
      select: { type: true },
    });

    const redirectTo =
      hotel?.type === "PHYSICAL"
        ? "/physical"
        : hotel?.type === "LEGAL"
          ? "/legal"
          : "/";

    return NextResponse.json({ message: "ok", redirectTo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "პაროლის შეცვლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

