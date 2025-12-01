import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
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

    await prisma.dailySheet.delete({
      where: { id },
    });

    return NextResponse.json({ message: "დღის ფურცელი წაიშალა" });
  } catch (error) {
    console.error("Daily sheet delete error:", error);
    return NextResponse.json(
      { error: "დღის ფურცლის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

