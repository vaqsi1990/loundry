"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function ManagerPage() {
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
  const isManager = userRole === "MANAGER" || userRole === "MANAGER_ASSISTANT";

  if (!session || !isManager) {
    return null;
  }

  const sections = [
    { 
      id: "employees",
      label: "თანამშრომლები",
      description: "მართეთ თანამშრომლების სია და ხელშეკრულებები",
      path: "/manager/employees"
    },
    { 
      id: "invoices",
      label: "ინვოისები",
      description: "მართეთ ყველა ინვოისი, სტატუსები და გადახდები",
      path: "/manager/invoices"
    },
    { 
      id: "invoicesArchive",
      label: "ინვოისების არქივი",
      description: "ინვოისების თვიური არქივი და მოძიება",
      path: "/manager/invoices/archive"
    },
    { 
      id: "dailySheets",
      label: "დღის ფურცელი",
      description: "შექმენით და მართეთ დღის ფურცლები",
      path: "/manager/daily-sheets"
    },
    { 
      id: "inventory",
      label: "საწყობი",
      description: "მართეთ საწყობის პროდუქტები",
      path: "/manager/inventory"
    },
    { 
      id: "expenses",
      label: "ხარჯები",
      description: "მართეთ ყველა ხარჯი და კალკულატორი",
      path: "/manager/expenses"
    },
    { 
      id: "salaries",
      label: "ხელფასები",
      description: "მართეთ თანამშრომლების ხელფასები",
      path: "/manager/salaries"
    },
    { 
      id: "hotels",
      label: "სასტუმროების ბაზა",
      description: "მართეთ სასტუმროების ბაზა და კონტაქტები",
      path: "/manager/hotels"
    },
    { 
      id: "table",
      label: "ტაბელი",
      description: "გამოიყენეთ ტაბელი მონაცემების შესანახად",
      path: "/manager/table"
    },
    { 
      id: "ourHotels",
      label: "ჩვენი სასტუმროები",
      description: "ნახეთ და მართეთ რეგისტრირებული სასტუმროები",
      path: "/manager/our-hotels"
    },
  ];

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[18px] md:text-[24px] font-bold text-black mb-6">
          მენეჯერის პანელი
        </h1>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-gray-500 text-center rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow  block"
            >
              <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-2">
                {section.label}
              </h2>
              <p className="text-[14px] md:text-[18px] text-white mb-4">
                {section.description}
              </p>
              <Link className="w-full bg-white text-black px-4 cursor-pointer py-2 rounded-lg hover:bg-gray-100 font-medium text-[16px] md:text-[18px] transition-colors text-center" href={section.path}>
                {section.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

