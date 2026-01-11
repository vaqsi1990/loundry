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
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      if (data.hotels && data.hotels.length > 0) {
        const hotel = data.hotels[0];
        const nameParts = (data.name || "").split(" ");
        setEditData({
          hotelName: hotel.hotelName || "",
          hotelRegistrationNumber: hotel.hotelRegistrationNumber || "",
          numberOfRooms: hotel.numberOfRooms || 0,
          email: hotel.email || data.email || "",
          mobileNumber: hotel.mobileNumber || data.mobileNumber || "",
          pricePerKg: hotel.pricePerKg || 0,
          companyName: hotel.companyName || "",
          address: hotel.address || "",
          firstName: hotel.firstName || nameParts[0] || "",
          lastName: hotel.lastName || nameParts.slice(1).join(" ") || "",
          personalId: hotel.personalId || "",
          password: "",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/profile/physical", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "განახლება ვერ მოხერხდა");
      }
      alert("პროფილი წარმატებით განახლდა");
      setIsEditing(false);
      await fetchProfile();
    } catch (err) {
      alert(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSaving(false);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-[18px] md:text-[24px] font-bold text-black">
            ფიზიკური პირის პანელი
          </h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-[14px] md:text-[16px]"
            >
              ინფორმაციის რედაქტირება
            </button>
          )}
        </div>

        {/* Edit Form */}
        {isEditing && profile && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-[18px] md:text-[20px] font-bold mb-4">პროფილის რედაქტირება</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">სასტუმროს დასახელება</label>
                <input
                  type="text"
                  value={editData.hotelName || ""}
                  onChange={(e) => setEditData({ ...editData, hotelName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">რეგისტრაციის ნომერი</label>
                <input
                  type="text"
                  value={editData.hotelRegistrationNumber || ""}
                  onChange={(e) => setEditData({ ...editData, hotelRegistrationNumber: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">სახელი</label>
                <input
                  type="text"
                  value={editData.firstName || ""}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">გვარი</label>
                <input
                  type="text"
                  value={editData.lastName || ""}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">პირადი ნომერი</label>
                <input
                  type="text"
                  value={editData.personalId || ""}
                  onChange={(e) => setEditData({ ...editData, personalId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ელფოსტა</label>
                <input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">მობილურის ნომერი</label>
                <input
                  type="text"
                  value={editData.mobileNumber || ""}
                  onChange={(e) => setEditData({ ...editData, mobileNumber: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ნომრების რაოდენობა</label>
                <input
                  type="number"
                  value={editData.numberOfRooms || 0}
                  onChange={(e) => setEditData({ ...editData, numberOfRooms: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">კგ-ის ფასი</label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.pricePerKg || 0}
                  onChange={(e) => setEditData({ ...editData, pricePerKg: parseFloat(e.target.value) || 0 })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">კომპანიის სახელი</label>
                <input
                  type="text"
                  value={editData.companyName || ""}
                  onChange={(e) => setEditData({ ...editData, companyName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">მისამართი</label>
                <input
                  type="text"
                  value={editData.address || ""}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ახალი პაროლი (არასავალდებულო)</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editData.password || ""}
                    onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                    className="w-full border rounded px-3 py-2 pr-10"
                    placeholder="დატოვეთ ცარიელი თუ არ გსურთ შეცვლა"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? "ინახება..." : "შენახვა"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500"
              >
                გაუქმება
              </button>
            </div>
          </div>
        )}

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
