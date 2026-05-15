"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { canAccessAccountantPanel } from "@/lib/roles";

const sections = [
  {
    id: "revenues",
    label: "შემოსავლები",
    description: "ინვოისები, გადახდები და შემოსავლები",
    path: "/admin/revenues",
  },
  {
    id: "invoices",
    label: "ინვოისები",
    description: "გაგზავნილი ინვოისები და დღის ფურცლები",
    path: "/admin/invoices",
  },
  {
    id: "invoicesArchive",
    label: "ინვოისების არქივი",
    description: "თვიური არქივი და მოძიება",
    path: "/admin/invoices/archive",
  },
  {
    id: "expenses",
    label: "ხარჯები",
    description: "ხარჯების ჩანაწერები",
    path: "/admin/expenses",
  },
];

export default function AccountantPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && session) {
      const role = (session.user as { role?: string })?.role;
      if (!canAccessAccountantPanel(role)) {
        if (role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-[18px] text-black">იტვირთება...</div>
      </div>
    );
  }

  const role = session ? (session.user as { role?: string })?.role : null;
  if (!session || !canAccessAccountantPanel(role)) {
    return null;
  }

  const homeHref = role === "ADMIN" ? "/admin" : "/accountant";

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[24px] md:text-[28px] font-bold text-black mb-2">
          {role === "ADMIN" ? "ბუღალტერია (ადმინი)" : "ბუღალტრის პანელი"}
        </h1>
        <p className="text-gray-600 mb-8 text-[16px]">
          ფინანსური განყოფილება — შემოსავლები, ინვოისები და ხარჯები
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={s.path}
              className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition border border-gray-100"
            >
              <h2 className="text-[18px] font-semibold text-black mb-1">{s.label}</h2>
              <p className="text-[14px] text-gray-600">{s.description}</p>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <Link href={homeHref} className="text-blue-600 hover:underline text-[16px]">
            ← უკან
          </Link>
        </div>
      </div>
    </div>
  );
}
