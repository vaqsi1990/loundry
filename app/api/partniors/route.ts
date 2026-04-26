import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const items = await prisma.partniors.findMany({
    select: {
      id: true,
      title: true,
      image: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

