"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  mobileNumber?: string;
  createdAt: string;
  hotels?: Array<{
    id: string;
    hotelName: string;
    type: string;
    email: string;
    mobileNumber: string;
  }>;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
      const response = await fetch("/api/profile");
      if (!response.ok) {
        throw new Error("პროფილის ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
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

  if (!session || !profile) {
    return null;
  }

  const nameParts = profile.name?.split(" ") || [];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-center text-[18px] md:text-[24px] font-bold text-black">
            ჩემი პროფილი
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-[18px] md:text-[20px] font-medium text-gray-900 mb-4">
              საერთო ინფორმაცია
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  სახელი
                </label>
                <div className="px-3 py-2 border rounded-md text-[16px] md:text-[18px] text-gray-900">
                  {firstName || "არ არის მითითებული"}
                </div>
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  გვარი
                </label>
                <div className="px-3 py-2 border rounded-md text-[16px] md:text-[18px] text-gray-900">
                  {lastName || "არ არის მითითებული"}
                </div>
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  ელფოსტა
                </label>
                <div className="px-3 py-2 border rounded-md text-[16px] md:text-[18px] text-gray-900">
                  {profile.email}
                </div>
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  როლი
                </label>
                <div className="px-3 py-2 border rounded-md text-[16px] md:text-[18px] text-gray-900">
                  {profile.role === "USER" && "მომხმარებელი"}
                  {profile.role === "ADMIN" && "ადმინისტრატორი"}
                  {profile.role === "MANAGER" && "მენეჯერი"}
                  {profile.role === "MANAGER_ASSISTANT" && "მენეჯერის ასისტენტი"}
                </div>
              </div>
              {profile.mobileNumber && (
                <div>
                  <label className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                    მობილურის ნომერი
                  </label>
                  <div className="px-3 py-2 border rounded-md text-[16px] md:text-[18px] text-gray-900">
                    {profile.mobileNumber}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  რეგისტრაციის თარიღი
                </label>
                <div className="px-3 py-2 border rounded-md text-[16px] md:text-[18px] text-gray-900">
                  {new Date(profile.createdAt).toLocaleDateString("ka-GE")}
                </div>
              </div>
            </div>
          </div>

          {profile.hotels && profile.hotels.length > 0 && (
            <div>
              <h2 className="text-[18px] md:text-[20px] font-medium text-gray-900 mb-4">
                სასტუმროები
              </h2>
              <div className="space-y-4">
                {profile.hotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-1">
                          სასტუმროს დასახელება
                        </label>
                        <div className="text-[16px] md:text-[18px] text-gray-900">
                          {hotel.hotelName}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-1">
                          ტიპი
                        </label>
                        <div className="text-[16px] md:text-[18px] text-gray-900">
                          {hotel.type === "PHYSICAL" ? "ფიზიკური პირი" : "იურიდიული პირი"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-1">
                          ელფოსტა
                        </label>
                        <div className="text-[16px] md:text-[18px] text-gray-900">
                          {hotel.email}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-1">
                          მობილურის ნომერი
                        </label>
                        <div className="text-[16px] md:text-[18px] text-gray-900">
                          {hotel.mobileNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
            <Link
              href="/profile/edit"
              className="flex-1 text-center bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition hover:opacity-90"
            >
              პროფილის რედაქტირება
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 bg-gray-200 text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition hover:bg-gray-300"
            >
              გასვლა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

