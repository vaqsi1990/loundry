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

    if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "MANAGER_ASSISTANT")) {
      return NextResponse.json(
        { error: "დაუშვებელია. მხოლოდ ადმინს, მენეჯერს ან მენეჯერის ასისტენტს შეუძლია შემოსავლების წაშლა" },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    console.log("Attempting to delete revenue with ID:", id);

    // Check if revenue exists
    const revenue = await prisma.revenue.findUnique({
      where: { id },
    });

    if (!revenue) {
      console.log("Revenue not found with ID:", id);
      return NextResponse.json(
        { error: "შემოსავალი ვერ მოიძებნა" },
        { status: 404 }
      );
    }

    console.log("Found revenue to delete:", {
      id: revenue.id,
      description: revenue.description,
      amount: revenue.amount,
      date: revenue.date,
    });

    await prisma.revenue.delete({
      where: { id },
    });

    console.log("Revenue deleted successfully:", id);
    return NextResponse.json({ message: "შემოსავალი წაიშალა" });
  } catch (error) {
    console.error("Revenue delete error:", error);
    
    // Check if it's a Prisma error
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      
      // P2025: Record to delete does not exist
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: "შემოსავალი ვერ მოიძებნა" },
          { status: 404 }
        );
      }
      
      // P2003: Foreign key constraint failed
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: "შემოსავლის წაშლა ვერ მოხერხდა, რადგან ის დაკავშირებულია სხვა ჩანაწერებთან" },
          { status: 400 }
        );
      }
    }
    
    // Check if it's an Error instance
    if (error instanceof Error) {
      // If it's a known Prisma error, return a more specific message
      if (error.message.includes("Record to delete does not exist") || error.message.includes("P2025")) {
        return NextResponse.json(
          { error: "შემოსავალი ვერ მოიძებნა" },
          { status: 404 }
        );
      }
      
      if (error.message.includes("Foreign key constraint") || error.message.includes("P2003")) {
        return NextResponse.json(
          { error: "შემოსავლის წაშლა ვერ მოხერხდა, რადგან ის დაკავშირებულია სხვა ჩანაწერებთან" },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "შემოსავლის წაშლისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

