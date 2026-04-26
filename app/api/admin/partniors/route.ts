import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ALLOWED_ROLES = new Set(["ADMIN", "MANAGER", "MANAGER_ASSISTANT"]);

async function requireAdminOrManager() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ error: "არ არის ავტორიზებული" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !ALLOWED_ROLES.has(user.role)) {
    return { ok: false as const, res: NextResponse.json({ error: "დაუშვებელია" }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET() {
  const guard = await requireAdminOrManager();
  if (!guard.ok) return guard.res;

  const items = await prisma.partniors.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminOrManager();
  if (!guard.ok) return guard.res;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "არასწორი მონაცემები" }, { status: 400 });
  }

  const title = String(body?.title ?? "").trim();
  const image = Array.isArray(body?.image) ? body.image.map((x: any) => String(x)).filter(Boolean) : [];

  if (!title) {
    return NextResponse.json({ error: "სათაური სავალდებულოა" }, { status: 400 });
  }
  if (image.length === 0) {
    return NextResponse.json({ error: "ლოგო სავალდებულოა" }, { status: 400 });
  }

  const created = await prisma.partniors.create({
    data: { title, image },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const guard = await requireAdminOrManager();
  if (!guard.ok) return guard.res;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "არასწორი მონაცემები" }, { status: 400 });
  }

  const id = String(body?.id ?? "").trim();
  const title = body?.title != null ? String(body.title).trim() : undefined;
  const image = body?.image != null && Array.isArray(body.image)
    ? body.image.map((x: any) => String(x)).filter(Boolean)
    : undefined;

  if (!id) {
    return NextResponse.json({ error: "ID სავალდებულოა" }, { status: 400 });
  }

  const updated = await prisma.partniors.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(image !== undefined ? { image } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdminOrManager();
  if (!guard.ok) return guard.res;

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "ID სავალდებულოა" }, { status: 400 });
  }

  await prisma.partniors.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

