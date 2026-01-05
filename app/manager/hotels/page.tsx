"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import HotelsSection from "../../admin/components/HotelsSection";

export default function ManagerHotelsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session) {
      const userRole = (session.user as any)?.role;
      if (userRole !== "MANAGER" && userRole !== "MANAGER_ASSISTANT") {
        router.push("/");
        return;
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-[18px] md:text-[20px] text-black">იტვირთება...</div>
        </div>
      </div>
    );
  }

  const userRole = session ? (session.user as any)?.role : null;
  if (!session || (userRole !== "MANAGER" && userRole !== "MANAGER_ASSISTANT")) {
    return null;
  }

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/manager"
              className="text-blue-600 hover:underline text-[18px] mb-2 font-bold inline-block"
            >
              ← უკან
            </Link>
            <h1 className="text-[18px] md:text-[24px] font-bold text-black">
              სასტუმროების ბაზა
            </h1>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <HotelsSection />
        </div>
      </div>
    </div>
  );
}

