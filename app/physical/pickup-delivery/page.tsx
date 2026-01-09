"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface PickupDeliveryRequest {
  id: string;
  requestType: string;
  notes: string | null;
  status: string;
  requestedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
}

export default function PhysicalPickupDeliveryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pickupDeliveryRequests, setPickupDeliveryRequests] = useState<PickupDeliveryRequest[]>([]);
  const [requestType, setRequestType] = useState<"PICKUP" | "DELIVERY" | "BOTH" | "">("");
  const [requestNotes, setRequestNotes] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.id) {
      fetchPickupDeliveryRequests();
    }
  }, [status, session, router]);

  const fetchPickupDeliveryRequests = async () => {
    try {
      const response = await fetch("/api/physical/pickup-delivery");
      if (!response.ok) throw new Error("მოთხოვნების ჩატვირთვა ვერ მოხერხდა");
      const data = await response.json();
      setPickupDeliveryRequests(data);
    } catch (err) {
      console.error("Error fetching pickup/delivery requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitPickupDeliveryRequest = async () => {
    if (!requestType) {
      alert("გთხოვთ აირჩიოთ მოთხოვნის ტიპი");
      return;
    }

    try {
      const response = await fetch("/api/physical/pickup-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          notes: requestNotes || null,
        }),
      });
      if (!response.ok) throw new Error("მოთხოვნის გაგზავნა ვერ მოხერხდა");
      await fetchPickupDeliveryRequests();
      setRequestType("");
      setRequestNotes("");
      setShowRequestForm(false);
      alert("მოთხოვნა წარმატებით გაიგზავნა");
    } catch (err) {
      alert("მოთხოვნის გაგზავნისას მოხდა შეცდომა");
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

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/physical"
            className="text-blue-600 hover:underline text-[18px] mb-2 font-bold inline-block"
          >
            ← უკან
          </Link>
          <h1 className="text-center text-[18px] md:text-[24px] font-bold text-black">
            წასაღები/მოსატანი
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {!showRequestForm ? (
            <button
              onClick={() => setShowRequestForm(true)}
              className="mb-4 bg-[#efa758] text-black px-6 py-2 rounded-lg text-[16px] md:text-[18px] hover:bg-[#d89647]"
            >
              + ახალი მოთხოვნა
            </button>
          ) : (
            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
              <h3 className="text-[16px] md:text-[18px] font-semibold text-black mb-4">
                ახალი მოთხოვნა
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-2">
                    მოთხოვნის ტიპი
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={requestType === "PICKUP" || requestType === "BOTH"}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRequestType(requestType === "DELIVERY" ? "BOTH" : "PICKUP");
                          } else {
                            setRequestType(requestType === "BOTH" ? "DELIVERY" : "");
                          }
                        }}
                        className="mr-2 w-5 h-5"
                      />
                      <span className="text-[20px]">წასაღები</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={requestType === "DELIVERY" || requestType === "BOTH"}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRequestType(requestType === "PICKUP" ? "BOTH" : "DELIVERY");
                          } else {
                            setRequestType(requestType === "BOTH" ? "PICKUP" : "");
                          }
                        }}
                        className="mr-2 w-5 h-5"
                      />
                      <span className="text-[20px]">მოსატანი</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[14px] md:text-[16px] font-medium text-gray-700 mb-1">
                    შენიშვნა (არასავალდებულო)
                  </label>
                  <textarea
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-[16px] md:text-[18px]"
                    rows={3}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={submitPickupDeliveryRequest}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg text-[16px] md:text-[18px] hover:bg-green-700"
                  >
                    გაგზავნა
                  </button>
                  <button
                    onClick={() => {
                      setShowRequestForm(false);
                      setRequestType("");
                      setRequestNotes("");
                    }}
                    className="bg-gray-200 text-black px-6 py-2 rounded-lg text-[16px] md:text-[18px] hover:bg-gray-300"
                  >
                    გაუქმება
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Requests List */}
          <div className="space-y-4">
            {pickupDeliveryRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-[16px] md:text-[18px] font-semibold text-black">
                      {request.requestType === "PICKUP" && "წასაღები"}
                      {request.requestType === "DELIVERY" && "მოსატანი"}
                      {request.requestType === "BOTH" && "წასაღები / მოსატანი"}
                    </h3>
                    <p className="text-[14px] text-gray-600 mt-1">
                      {new Date(request.requestedAt).toLocaleDateString("ka-GE")}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-[14px] font-medium ${
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
                {request.notes && (
                  <p className="text-[14px] text-gray-700 mt-2">{request.notes}</p>
                )}
              </div>
            ))}
            {pickupDeliveryRequests.length === 0 && (
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
