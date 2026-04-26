"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Hotel {
  id: string;
  hotelName: string;
  hotelRegistrationNumber: string;
  numberOfRooms: number;
  email: string;
  mobileNumber: string;
  type: string;
  firstName: string | null;
  lastName: string | null;
  personalId: string | null;
  legalEntityName: string | null;
  identificationCode: string | null;
  responsiblePersonName: string | null;
  pricePerKg: number | null;
  createdAt: string;
  companyName: string | null;
  address: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    mobileNumber: string | null;
  } | null;
}

type OurHotelsApiResponse = {
  items: Hotel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function OurHotelsSection() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeQuery = (searchParams.get("q") ?? "").trim();

  // Form state
  const [hotelType, setHotelType] = useState<"PHYSICAL" | "LEGAL" | "">("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelRegistrationNumber, setHotelRegistrationNumber] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [legalEntityName, setLegalEntityName] = useState("");
  const [identificationCode, setIdentificationCode] = useState("");
  const [responsiblePersonName, setResponsiblePersonName] = useState("");

  useEffect(() => {
    const p = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    setPage(p);
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    fetchHotels(page, activeQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeQuery]);

  const setPageInUrl = (nextPage: number) => {
    const next = Math.max(1, nextPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  };

  const setQueryInUrl = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextQuery.trim();
    if (trimmed.length === 0) params.delete("q");
    else params.set("q", trimmed);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHotels = async (targetPage: number, q: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/our-hotels?page=${targetPage}&limit=10&q=${encodeURIComponent(q)}`
      );
      if (!response.ok) {
        throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
      }
      const data: OurHotelsApiResponse = await response.json();
      setHotels(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      if (targetPage > data.totalPages) setPageInUrl(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setHotelType("");
    setName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMobileNumber("");
    setHotelName("");
    setHotelRegistrationNumber("");
    setNumberOfRooms("");
    setHotelEmail("");
    setPricePerKg("");
    setCompanyName("");
    setAddress("");
    setPersonalId("");
    setLegalEntityName("");
    setIdentificationCode("");
    setResponsiblePersonName("");
    setFormError("");
    setFormSuccess("");
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedHotelEmail = hotelEmail.trim();
      const trimmedName = name.trim();
      const trimmedLastName = lastName.trim();

      const requestBody: any = {
        hotelType,
        mobileNumber,
        hotelName: hotelName.trim(),
        hotelRegistrationNumber: hotelRegistrationNumber.trim(),
        numberOfRooms: numberOfRooms ? parseInt(numberOfRooms) : undefined,
        hotelEmail: trimmedHotelEmail || undefined,
        pricePerKg: pricePerKg ? parseFloat(pricePerKg) : undefined,
        companyName: companyName.trim() || undefined,
        address: address.trim(),
      };

      requestBody.name = trimmedName || undefined;
      requestBody.lastName = trimmedLastName || undefined;
      requestBody.email = trimmedEmail || undefined;
      
      // Only include password fields if they're provided (for editing) or required (for creating)
      if (isEditing) {
        if (password) {
          requestBody.password = password;
          requestBody.confirmPassword = confirmPassword;
        }
      } else {
        requestBody.password = password;
        requestBody.confirmPassword = confirmPassword;
      }

      if (hotelType === "PHYSICAL") {
        requestBody.personalId = personalId.trim();
      } else if (hotelType === "LEGAL") {
        requestBody.legalEntityName = legalEntityName.trim();
        requestBody.identificationCode = identificationCode.trim();
        requestBody.responsiblePersonName = responsiblePersonName.trim();
      }

      const response = await fetch(
        isEditing
          ? `/api/admin/our-hotels?id=${editingId}`
          : "/api/admin/our-hotels",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setFormError(
          data.error ||
            (isEditing
              ? "სასტუმროს განახლებისას მოხდა შეცდომა"
              : "სასტუმროს დამატებისას მოხდა შეცდომა")
        );
        return;
      }

      setFormSuccess(
        isEditing ? "სასტუმრო წარმატებით განახლდა" : "სასტუმრო წარმატებით დაემატა"
      );
      resetForm();
      setShowForm(false);
      fetchHotels(page, activeQuery);
    } catch (err) {
      setFormError("დაფიქსირდა შეცდომა. გთხოვთ სცადოთ თავიდან");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/our-hotels?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
      await fetchHotels(page, activeQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (hotel: Hotel) => {
    setIsEditing(true);
    setEditingId(hotel.id);
    setShowForm(true);
    setHotelType(hotel.type as "PHYSICAL" | "LEGAL");
    setHotelName(hotel.hotelName || "");
    setHotelRegistrationNumber(hotel.hotelRegistrationNumber || "");
    setNumberOfRooms(String(hotel.numberOfRooms ?? ""));
    setHotelEmail(hotel.email || "");
    setPricePerKg(hotel.pricePerKg?.toString() || "");
    setCompanyName(hotel.companyName || "");
    setAddress(hotel.address || "");
    setMobileNumber(hotel.user?.mobileNumber || hotel.mobileNumber || "");
    const userNameParts = (hotel.user?.name || "").split(" ");
    setName(userNameParts[0] || "");
    setLastName(userNameParts.slice(1).join(" ") || "");
    setEmail(hotel.user?.email || "");
    setPassword("");
    setConfirmPassword("");
    // Populate physical/legal person specific fields
    setPersonalId(hotel.personalId || "");
    setLegalEntityName(hotel.legalEntityName || "");
    setIdentificationCode(hotel.identificationCode || "");
    setResponsiblePersonName(hotel.responsiblePersonName || "");
    setFormError("");
    setFormSuccess("");
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">ჩვენი სასტუმროები</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-[#efa758] cursor-pointer text-black px-4 py-2 rounded-lg font-medium text-[16px] md:text-[18px] hover:bg-[#d89647] transition"
        >
          + სასტუმროს დამატება
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQueryInUrl(query);
          }}
          placeholder="ძებნა სახელით ან მეილით…"
          className="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-md text-black"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQueryInUrl(query)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black"
          >
            ძებნა
          </button>
          {activeQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setQueryInUrl("")}
              className="bg-gray-200 text-black px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              გასუფთავება
            </button>
          )}
        </div>
      </div>

      {/* Modal Popup */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
          ></div>

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <h3 className="text-[18px] md:text-[20px] font-bold text-black">
                  {isEditing ? "სასტუმროს რედაქტირება" : "ახალი სასტუმროს დამატება"}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hotel Type Selection */}
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-4">
                სასტუმროს ტიპი
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                    hotelType === "PHYSICAL"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="hotelType"
                    value="PHYSICAL"
                    checked={hotelType === "PHYSICAL"}
                    onChange={(e) => setHotelType(e.target.value as "PHYSICAL")}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-full border-2 mb-3 flex items-center justify-center ${
                      hotelType === "PHYSICAL"
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-400"
                    }`}
                  >
                    {hotelType === "PHYSICAL" && (
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span
                    className={`text-[16px] md:text-[18px] font-medium ${
                      hotelType === "PHYSICAL" ? "text-blue-600" : "text-black"
                    }`}
                  >
                    ფიზიკური პირი
                  </span>
                </label>
                <label
                  className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                    hotelType === "LEGAL"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="hotelType"
                    value="LEGAL"
                    checked={hotelType === "LEGAL"}
                    onChange={(e) => setHotelType(e.target.value as "LEGAL")}
                    className="sr-only"
                  />
                  <div
                    className={`w-6 h-6 rounded-full border-2 mb-3 flex items-center justify-center ${
                      hotelType === "LEGAL"
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-400"
                    }`}
                  >
                    {hotelType === "LEGAL" && (
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span
                    className={`text-[16px] md:text-[18px] font-medium ${
                      hotelType === "LEGAL" ? "text-blue-600" : "text-black"
                    }`}
                  >
                    იურიდიული პირი
                  </span>
                </label>
              </div>
            </div>

            {/* User Account Fields */}
            {hotelType && (
              <div className="space-y-4">
                <h4 className="text-[16px] md:text-[18px] font-medium text-black">
                  ანგარიშის ინფორმაცია
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotelType !== "LEGAL" && (
                    <>
                      <div>
                      
                        <input
                          id="name"
                          type="text"
                          required={hotelType === "PHYSICAL" && !isEditing}
                          className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                          placeholder="სახელი"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          id="lastName"
                          type="text"
                          required={hotelType === "PHYSICAL" && !isEditing}
                          className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                          placeholder="გვარი"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </>
                  )}
               
                 
                <div>
                  <input
                    id="email"
                    type="email"
                    required={false}
                    className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                    placeholder="მომხმარებლის ელფოსტა (არასავალდებულო)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required={!isEditing}
                      minLength={password ? 6 : undefined}
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="პაროლი (მინიმუმ 6 სიმბოლო)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required={!isEditing && !!password}
                      minLength={password ? 6 : undefined}
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="გაიმეორეთ პაროლი"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div>
                   
                    <input
                      id="mobileNumber"
                      type="tel"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="მობილურის ნომერი"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Common Hotel Fields */}
            {hotelType && (
              <div className="space-y-4">
                <h4 className="text-[16px] md:text-[18px] font-medium text-black">
                  სასტუმროს ინფორმაცია
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      id="hotelName"
                      type="text"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="სასტუმროს დასახელება"
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                    />
                  </div>
                  <div>
                   
                    <input
                      id="hotelRegistrationNumber"
                      type="text"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="სასტუმროს საკ. ნომერი"
                      value={hotelRegistrationNumber}
                      onChange={(e) => setHotelRegistrationNumber(e.target.value)}
                    />
                  </div>
                  <div>
                   
                    <input
                      id="numberOfRooms"
                      type="number"
                      min="1"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="ნომრების რაოდენობა"
                      value={numberOfRooms}
                      onChange={(e) => setNumberOfRooms(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      id="hotelEmail"
                      type="email"
                      required={hotelType === "LEGAL"}
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="სასტუმროს ელ. ფოსტა "
                      value={hotelEmail}
                      onChange={(e) => setHotelEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      id="address"
                      type="text"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="მისამართი"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      id="pricePerKg"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="კილოგრამის ფასი (₾)"
                      value={pricePerKg}
                      onChange={(e) => setPricePerKg(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Physical Person Fields */}
            {hotelType === "PHYSICAL" && (
              <div className="space-y-4">
                <h4 className="text-[16px] md:text-[18px] font-medium text-black">
                  ფიზიკური პირის ინფორმაცია
                </h4>
                <div>
              
                  <input
                    id="personalId"
                    type="text"
                    required={hotelType === "PHYSICAL"}
                    className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                    placeholder="პირადი ნომერი"
                    value={personalId}
                    onChange={(e) => setPersonalId(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Legal Entity Fields */}
            {hotelType === "LEGAL" && (
              <div className="space-y-4">
                <h4 className="text-[16px] md:text-[18px] font-medium text-black">
                  იურიდიული პირის ინფორმაცია
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                 
                    <input
                      id="legalEntityName"
                      type="text"
                      required={hotelType === "LEGAL"}
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="იურიდიული/შპს დასახელება"
                      value={legalEntityName}
                      onChange={(e) => setLegalEntityName(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      id="identificationCode"
                      type="text"
                      required={hotelType === "LEGAL"}
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="საიდენტიფიკაციო კოდი"
                      value={identificationCode}
                      onChange={(e) => setIdentificationCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      id="responsiblePersonName"
                      type="text"
                      required={hotelType === "LEGAL"}
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="პასუხისმგებელი პირი"
                      value={responsiblePersonName}
                      onChange={(e) => setResponsiblePersonName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

                {/* Submit Button */}
                {hotelType && (
                  <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="px-6 py-2 border border-gray-300 text-black rounded-lg font-medium text-[16px] md:text-[18px] hover:bg-gray-50 transition"
                    >
                      გაუქმება
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-6 py-2 bg-[#efa758] text-black rounded-lg font-medium text-[16px] md:text-[18px] hover:bg-[#d89647] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    {formLoading
                      ? "მიმდინარეობს..."
                      : isEditing
                      ? "შენახვა"
                      : "დამატება"}
                    </button>
                  </div>
                )}
              </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სასტუმროს დასახელება
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
              ნომრების რ.
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ფასი (კგ)
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                კონტაქტი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მისამართი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედება
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hotels.map((hotel) => (
              <tr key={hotel.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {hotel.hotelName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {hotel.numberOfRooms}
                </td>
              <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                {hotel.pricePerKg ?? 0}
              </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  <div>
                    <div>{hotel.email}</div>
                    <div className="text-sm text-gray-600">{hotel.mobileNumber}</div>
                  </div>
                </td>
              
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {hotel.address || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => startEdit(hotel)}
                      disabled={busy}
                      className="text-blue-600 hover:underline disabled:opacity-50"
                    >
                      რედაქტირება
                    </button>
                    <button
                      onClick={() => handleDelete(hotel.id)}
                      disabled={busy}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      წაშლა
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-[14px] md:text-[16px] text-black">
          სულ: <span className="font-semibold">{total}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setPageInUrl(page - 1)}
            disabled={page <= 1}
            className="px-3 py-2 rounded-md border border-gray-300 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            ← წინა
          </button>
          <div className="text-[14px] md:text-[16px] text-black">
            გვერდი <span className="font-semibold">{page}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageInUrl(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-2 rounded-md border border-gray-300 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            შემდეგ →
          </button>
        </div>
      </div>

      {hotels.length === 0 && !loading && (
        <div className="text-center py-8 text-black">
          სასტუმროები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

