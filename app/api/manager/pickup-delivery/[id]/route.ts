import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Delete pickup/delivery request (manager - only hides from manager view, doesn't delete from database)
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
    });

    if (!user) {
      return NextResponse.json(
        { error: "მომხმარებელი არ მოიძებნა" },
        { status: 404 }
      );
    }

    const userRole = (user as any).role;
    if (userRole !== "MANAGER" && userRole !== "MANAGER_ASSISTANT") {
      return NextResponse.json(
        { error: "არ გაქვთ ნებართვა" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if request exists
    const existingRequest = await (prisma as any).pickupDeliveryRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "მოთხოვნა არ მოიძებნა" },
        { status: 404 }
      );
    }

    // Mark as hidden from manager (soft delete - hotel can still see it)
    await (prisma as any).pickupDeliveryRequest.update({
      where: { id },
      data: { hiddenFromManager: true },
    });

    return NextResponse.json(
      { message: "მოთხოვნა წარმატებით წაიშალა (მხოლოდ მენეჯერის ხედვიდან)" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Pickup/delivery request deletion error:", error);
    return NextResponse.json(
      { error: "მოთხოვნის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}
