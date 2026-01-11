"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import React from "react";

interface PickupDeliveryRequest {
  id: string;
  requestType: string;
  notes: string | null;
  status: string;
  requestedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  hotel: {
    id: string;
    hotelName: string;
    type: string;
    email: string;
    mobileNumber: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
    mobileNumber: string | null;
  };
}

export default function AdminPickupDeliveryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PickupDeliveryRequest[]>([]);
  const [filter, setFilter] = useState<string>("all"); // all, pending, confirmed, completed
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set());

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
      fetchRequests();
    }
  }, [status, session, router]);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/admin/pickup-delivery");
      if (!response.ok) throw new Error("მოთხოვნების ჩატვირთვა ვერ მოხერხდა");
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching pickup/delivery requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (requestId: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ ამ მოთხოვნის დადასტურება?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/pickup-delivery/${requestId}/confirm`, {
        method: "PUT",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "დადასტურება ვერ მოხერხდა");
      }
      await fetchRequests();
      alert("მოთხოვნა წარმატებით დაადასტურა");
    } catch (err: any) {
      alert(err.message || "დადასტურებისას მოხდა შეცდომა");
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ ამ მოთხოვნის წაშლა?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/pickup-delivery/${requestId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "წაშლა ვერ მოხერხდა");
      }
      await fetchRequests();
      alert("მოთხოვნა წარმატებით წაიშალა");
    } catch (err: any) {
      alert(err.message || "წაშლისას მოხდა შეცდომა");
    }
  };

  const filteredRequests = filter === "all" 
    ? requests 
    : requests.filter(req => req.status === filter.toUpperCase());

  // Group requests by hotel
  const groupedByHotel = filteredRequests.reduce((acc, request) => {
    const hotelId = request.hotel.id;
    if (!acc[hotelId]) {
      acc[hotelId] = {
        hotel: request.hotel,
        requests: [],
      };
    }
    acc[hotelId].requests.push(request);
    return acc;
  }, {} as Record<string, { hotel: PickupDeliveryRequest["hotel"]; requests: PickupDeliveryRequest[] }>);

  const toggleHotel = (hotelId: string) => {
    setExpandedHotels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hotelId)) {
        newSet.delete(hotelId);
      } else {
        newSet.add(hotelId);
      }
      return newSet;
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-[18px] md:text-[20px] text-black">იტვირთება...</div>
        </div>
      </div>
    );
  }

  const userRole = session ? (session.user as any)?.role : null;
  if (!session || userRole !== "ADMIN") {
    return null;
  }

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="text-blue-600 hover:underline text-[18px] mb-2 font-bold inline-block"
            >
              ← უკან
            </Link>
            <h1 className="text-[18px] md:text-[24px] font-bold text-black">
              წასაღები/მოსატანი მოთხოვნები
            </h1>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* Filter */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg text-[14px] md:text-[16px] ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                ყველა
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`px-4 py-2 rounded-lg text-[14px] md:text-[16px] ${
                  filter === "pending"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                მოლოდინში
              </button>
              <button
                onClick={() => setFilter("confirmed")}
                className={`px-4 py-2 rounded-lg text-[14px] md:text-[16px] ${
                  filter === "confirmed"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                დადასტურებული
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-4 py-2 rounded-lg text-[14px] md:text-[16px] ${
                  filter === "completed"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                დასრულებული
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 md:text-[18px] text-[16px]">
              <thead>
                <tr className="bg-orange-100">
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-left font-semibold">სასტუმრო</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">ტიპი</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">კონტაქტი</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">მოთხოვნების რაოდენობა</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">მოქმედება</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedByHotel).map(([hotelId, group]) => {
                  const isExpanded = expandedHotels.has(hotelId);
                  const pendingCount = group.requests.filter(r => r.status === "PENDING").length;
                  return (
                    <React.Fragment key={hotelId}>
                      <tr 
                        className="bg-white cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleHotel(hotelId)}
                      >
                        <td className="border border-gray-300 px-2 py-1 text-black font-semibold">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-gray-500 hover:text-gray-700 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHotel(hotelId);
                              }}
                            >
                              {isExpanded ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                            {group.hotel.hotelName}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                          {group.hotel.type === "PHYSICAL" ? "ფიზიკური პირი" : "იურიდიული პირი"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                          {group.hotel.mobileNumber}
                          <br />
                          <span className="text-[14px] text-gray-600">{group.hotel.email}</span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                          {group.requests.length}
                          {pendingCount > 0 && (
                            <span className="ml-2 px-2 py-1 bg-yellow-600 text-white rounded text-[12px]">
                              {pendingCount} მოლოდინში
                            </span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHotel(hotelId);
                            }}
                            className="text-blue-600 hover:underline text-[14px] md:text-[16px]"
                          >
                            {isExpanded ? "დახურვა" : "გახსნა"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="border border-gray-300 px-4 py-3 bg-gray-50">
                            <div className="space-y-3">
                              {group.requests.map((request) => (
                                <div key={request.id} className="border rounded-lg p-3 bg-white">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-[16px] md:text-[18px] font-semibold text-black">
                                          {request.requestType === "PICKUP" && "წასაღები"}
                                          {request.requestType === "DELIVERY" && "მოსატანი"}
                                          {request.requestType === "BOTH" && "წასაღები / მოსატანი"}
                                        </h4>
                                        <span
                                          className={`px-3 py-1 rounded text-[12px] md:text-[14px] font-medium ${
                                            request.status === "COMPLETED"
                                              ? "bg-green-600 text-white"
                                              : request.status === "CONFIRMED"
                                              ? "bg-blue-600 text-white"
                                              : "bg-yellow-600 text-white"
                                          }`}
                                        >
                                          {request.status === "PENDING" && "მოლოდინში"}
                                          {request.status === "CONFIRMED" && "დადასტურებული"}
                                          {request.status === "COMPLETED" && "დასრულებული"}
                                        </span>
                                      </div>
                                      <div className="text-[14px] text-gray-600 space-y-1">
                                        <p>
                                          <span className="font-semibold">მომხმარებელი:</span> {request.user.name || request.user.email}
                                        </p>
                                        <p>
                                          <span className="font-semibold">თარიღი:</span> {new Date(request.requestedAt).toLocaleDateString("ka-GE")} {new Date(request.requestedAt).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                        {request.confirmedAt && (
                                          <p>
                                            <span className="font-semibold">დადასტურებული:</span> {new Date(request.confirmedAt).toLocaleDateString("ka-GE")} {new Date(request.confirmedAt).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {request.notes && (
                                    <p className="text-[14px] text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                                      <span className="font-semibold">ტექსტი:</span> {request.notes}
                                    </p>
                                  )}
                                  <div className="flex gap-2 mt-3">
                                    {request.status === "PENDING" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConfirm(request.id);
                                        }}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-[14px] md:text-[16px] hover:bg-green-700"
                                      >
                                        დადასტურება
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(request.id);
                                      }}
                                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-[14px] md:text-[16px] hover:bg-red-700"
                                    >
                                      წაშლა
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {Object.keys(groupedByHotel).length === 0 && (
              <p className="text-center text-gray-600 py-8">
                მოთხოვნები არ მოიძებნა
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
