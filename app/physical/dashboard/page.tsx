"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PhysicalDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/physical");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-[18px] md:text-[20px] text-gray-600">გადამისამართება...</div>
      </div>
    </div>
  );
}
