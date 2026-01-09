"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface PhysicalProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  mobileNumber: string | null;
  createdAt: string;
  hotels: Array<{
    id: string;
    hotelName: string;
    hotelRegistrationNumber: string;
    numberOfRooms: number;
    email: string;
    mobileNumber: string;
    pricePerKg: number;
    companyName: string | null;
    address: string | null;
    firstName: string | null;
    lastName: string | null;
    personalId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function PhysicalProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PhysicalProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.id) {
      fetchProfile();
    }
  }, [status, session, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile/physical");
      if (!response.ok) {
        throw new Error("პროფილის ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-[18px] md:text-[20px] text-gray-600">იტვირთება...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-[18px] md:text-[20px] text-red-600">{error}</div>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 text-blue-600 hover:underline text-[16px] md:text-[18px]"
          >
            შესვლის გვერდზე დაბრუნება
          </button>
        </div>
      </div>
    );
  }

  // Sections for physical person
  const sections = [
    { 
      id: "dailySheets",
      label: "დღის ფურცლები",
      description: "ნახეთ და დაადასტურეთ დღის ფურცლები",
      path: "/physical/daily-sheets"
    },
    { 
      id: "invoices",
      label: "ინვოისები",
      description: "ნახეთ თქვენი ინვოისები და გადახდების სტატუსი",
      path: "/physical/invoices"
    },
    { 
      id: "pickupDelivery",
      label: "წასაღები/მოსატანი",
      description: "მოითხოვეთ წასაღები ან მოსატანი სერვისი",
      path: "/physical/pickup-delivery"
    },
  ];

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[18px] md:text-[24px] font-bold text-black mb-6">
          ფიზიკური პირის პანელი
        </h1>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={section.path}
              className="bg-gray-500 text-center rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow block"
            >
              <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-2">
                {section.label}
              </h2>
              <p className="text-[14px] md:text-[18px] text-white mb-4">
                {section.description}
              </p>
              <div className="w-full bg-white text-black px-4 cursor-pointer py-2 rounded-lg hover:bg-gray-100 font-medium text-[16px] md:text-[18px] transition-colors text-center">
                {section.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
