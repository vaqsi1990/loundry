import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SINGLETON_ID = "default_kg_price";

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { errorResponse: NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return { errorResponse: NextResponse.json({ error: "დაუშვებელია" }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("errorResponse" in auth) return auth.errorResponse;

    const record = await prisma.kgPrice.findUnique({
      where: { id: SINGLETON_ID },
    });

    return NextResponse.json(
      {
        value: record?.value ?? null,
        updatedAt: record?.updatedAt ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("KgPrice GET error:", error);
    return NextResponse.json(
      { error: "kg ფასის მიღებისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("errorResponse" in auth) return auth.errorResponse;

    const body = await request.json();
    const rawValue = body?.value;

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return NextResponse.json(
        { error: "გთხოვთ შეიყვანოთ kg ფასი" },
        { status: 400 }
      );
    }

    const parsed = typeof rawValue === "string" ? parseFloat(rawValue.replace(",", ".")) : Number(rawValue);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return NextResponse.json(
        { error: "გთხოვთ შეიყვანოთ სწორი დადებითი რიცხვი" },
        { status: 400 }
      );
    }

    const record = await prisma.kgPrice.upsert({
      where: { id: SINGLETON_ID },
      update: { value: parsed },
      create: {
        id: SINGLETON_ID,
        value: parsed,
      },
    });

    return NextResponse.json(
      {
        value: record.value,
        updatedAt: record.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("KgPrice POST error:", error);
    return NextResponse.json(
      { error: "kg ფასის შენახვისას მოხდა შეცდომა" },
      { status: 500 }
    );
  }
}

