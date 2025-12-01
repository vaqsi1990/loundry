"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UsersSection from "./components/UsersSection";
import EmployeesSection from "./components/EmployeesSection";
import InvoicesSection from "./components/InvoicesSection";
import DailySheetsSection from "./components/DailySheetsSection";
import InventorySection from "./components/InventorySection";
import ExpensesSection from "./components/ExpensesSection";

type TabType = "users" | "employees" | "invoices" | "dailySheets" | "inventory" | "expenses";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
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

  const tabs = [
    { id: "users" as TabType, label: "მომხმარებლები" },
    { id: "employees" as TabType, label: "თანამშრომლები" },
    { id: "invoices" as TabType, label: "ინვოისები" },
    { id: "dailySheets" as TabType, label: "დღის ფურცელი" },
    { id: "inventory" as TabType, label: "საწყობი" },
    { id: "expenses" as TabType, label: "ხარჯები" },
  ];

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <h1 className="text-[18px] md:text-[24px] font-bold text-black p-6 border-b">
            ადმინისტრატორის პანელი
          </h1>

          {/* Tabs Navigation */}
          <div className="border-b">
            <nav className="flex space-x-1 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-3 text-[16px] md:text-[18px] font-medium rounded-t-lg transition-colors
                    ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                        : "text-black hover:text-blue-600 hover:bg-gray-50"
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "users" && <UsersSection />}
            {activeTab === "employees" && <EmployeesSection />}
            {activeTab === "invoices" && <InvoicesSection />}
            {activeTab === "dailySheets" && <DailySheetsSection />}
            {activeTab === "inventory" && <InventorySection />}
            {activeTab === "expenses" && <ExpensesSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
