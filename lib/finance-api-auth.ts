import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canAccessFinanceStaffPages } from "@/lib/roles";

function normalizeRole(role: unknown): string {
  if (role == null) return "";
  return String(role);
}

/** DB role, with session JWT role as fallback (kept in sync on each request). */
export function resolveStaffRole(
  dbRole: unknown,
  sessionRole: unknown
): string {
  const db = normalizeRole(dbRole);
  if (db && canAccessFinanceStaffPages(db)) return db;
  const session = normalizeRole(sessionRole);
  if (session && canAccessFinanceStaffPages(session)) return session;
  return db || session;
}

export async function requireFinanceStaffApiAccess() {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "არ არის ავტორიზებული" },
        { status: 401 }
      ),
    } as const;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  const sessionRole = (session!.user as { role?: string }).role;
  const effectiveRole = resolveStaffRole(dbUser?.role, sessionRole);

  if (!effectiveRole || !canAccessFinanceStaffPages(effectiveRole)) {
    return {
      response: NextResponse.json(
        { error: "დაუშვებელია" },
        { status: 403 }
      ),
    } as const;
  }

  return {
    session,
    userId: dbUser?.id ?? userId,
    role: effectiveRole,
  } as const;
}
