"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session) {
      const userRole = (session.user as any)?.role;
      if (userRole !== "ADMIN") {
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

  if (!session || (session.user as any)?.role !== "ADMIN") {
    return null;
  }

  const sections = [
    { 
      id: "users",
      label: "მომხმარებლები",
      description: "მართეთ სისტემაში არსებული მომხმარებლები და მათი ნებართვები",
      path: "/admin/users"
    },
    { 
      id: "employees",
      label: "თანამშრომლები",
      description: "მართეთ თანამშრომლების სია და ხელშეკრულებები",
      path: "/admin/employees"
    },
    { 
      id: "invoices",
      label: "ინვოისები",
      description: "მართეთ ყველა ინვოისი, სტატუსები და გადახდები",
      path: "/admin/invoices"
    },
    { 
      id: "dailySheets",
      label: "დღის ფურცელი",
      description: "შექმენით და მართეთ დღის ფურცლები",
      path: "/admin/daily-sheets"
    },
    { 
      id: "inventory",
      label: "საწყობი",
      description: "მართეთ საწყობის პროდუქტები",
      path: "/admin/inventory"
    },
    { 
      id: "expenses",
      label: "ხარჯები",
      description: "მართეთ ყველა ხარჯი და კალკულატორი",
      path: "/admin/expenses"
    },
    { 
      id: "salaries",
      label: "ხელფასები",
      description: "მართეთ თანამშრომლების ხელფასები",
      path: "/admin/salaries"
    },
    { 
      id: "revenues",
      label: "შემოსავლები",
      description: "ნახეთ შემოსავლები დღის და თვის მიხედვით",
      path: "/admin/revenues"
    },
    { 
      id: "statistics",
      label: "სტატისტიკა",
      description: "შედარება თვეების და წლის მიხედვით",
      path: "/admin/statistics"
    },
    { 
      id: "hotels",
      label: "სასტუმროების ბაზა",
      description: "მართეთ სასტუმროების ბაზა და კონტაქტები",
      path: "/admin/hotels"
    },
    { 
      id: "table",
      label: "ტაბელი",
      description: "გამოიყენეთ ტაბელი მონაცემების შესანახად",
      path: "/admin/table"
    },
    { 
      id: "calculator",
      label: "კალკულატორი",
      description: "გამოიყენეთ კალკულატორი გამოთვლებისთვის",
      path: "/admin/calculator"
    },
    { 
      id: "ourHotels",
      label: "ჩვენი სასტუმროები",
      description: "ნახეთ და მართეთ რეგისტრირებული სასტუმროები",
      path: "/admin/our-hotels"
    },
    { 
      id: "blacklist",
      label: "შავი სია",
      description: "მართეთ შავი სია - ბლოკირებული სასტუმროები",
      path: "/admin/blacklist"
    },
  ];

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[18px] md:text-[24px] font-bold text-black mb-6">
          ადმინისტრატორის პანელი
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
