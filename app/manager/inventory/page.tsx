"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import InventorySection from "../../admin/components/InventorySection";

export default function ManagerInventoryPage() {
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
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto">
        <div className="mb-8">
          <Link
            href="/manager"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-base md:text-lg font-medium mb-4 transition-colors duration-200 group"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform duration-200">←</span>
            უკან
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                საწყობის მართვა
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                პროდუქტების მართვა და კონტროლი
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
          <div className="p-6 md:p-8">
            <InventorySection />
          </div>
        </div>
      </div>
    </div>
  );
}

