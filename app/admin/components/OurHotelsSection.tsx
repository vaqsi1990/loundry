"use client";

import { useEffect, useState } from "react";

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
  createdAt: string;
}

export default function OurHotelsSection() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [hotelType, setHotelType] = useState<"PHYSICAL" | "LEGAL" | "">("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelRegistrationNumber, setHotelRegistrationNumber] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [legalEntityName, setLegalEntityName] = useState("");
  const [identificationCode, setIdentificationCode] = useState("");
  const [responsiblePersonName, setResponsiblePersonName] = useState("");

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const response = await fetch("/api/admin/our-hotels");
      if (!response.ok) {
        throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setHotels(data);
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
    setMobileNumber("");
    setHotelName("");
    setHotelRegistrationNumber("");
    setNumberOfRooms("");
    setHotelEmail("");
    setPersonalId("");
    setLegalEntityName("");
    setIdentificationCode("");
    setResponsiblePersonName("");
    setFormError("");
    setFormSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    try {
      const requestBody: any = {
        hotelType,
        name,
        lastName,
        email,
        password,
        mobileNumber,
        hotelName,
        hotelRegistrationNumber,
        numberOfRooms: numberOfRooms ? parseInt(numberOfRooms) : undefined,
        hotelEmail,
      };

      if (hotelType === "PHYSICAL") {
        requestBody.personalId = personalId;
      } else if (hotelType === "LEGAL") {
        requestBody.legalEntityName = legalEntityName;
        requestBody.identificationCode = identificationCode;
        requestBody.responsiblePersonName = responsiblePersonName;
      }

      const response = await fetch("/api/admin/our-hotels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || "სასტუმროს დამატებისას მოხდა შეცდომა");
        return;
      }

      setFormSuccess("სასტუმრო წარმატებით დაემატა");
      resetForm();
      setShowForm(false);
      fetchHotels();
    } catch (err) {
      setFormError("დაფიქსირდა შეცდომა. გთხოვთ სცადოთ თავიდან");
    } finally {
      setFormLoading(false);
    }
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
                  ახალი სასტუმროს დამატება
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
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      სახელი
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="სახელი"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      გვარი
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="გვარი"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      ელფოსტა (ანგარიშისთვის)
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="ელფოსტა"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      პაროლი
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="პაროლი (მინიმუმ 6 სიმბოლო)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="mobileNumber"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      მობილურის ნომერი
                    </label>
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
                    <label
                      htmlFor="hotelName"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      სასტუმროს დასახელება
                    </label>
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
                    <label
                      htmlFor="hotelRegistrationNumber"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      სასტუმროს საკ. ნომერი
                    </label>
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
                    <label
                      htmlFor="numberOfRooms"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      ნომრების რაოდენობა
                    </label>
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
                    <label
                      htmlFor="hotelEmail"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      სასტუმროს ელ. ფოსტა
                    </label>
                    <input
                      id="hotelEmail"
                      type="email"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="სასტუმროს ელ. ფოსტა"
                      value={hotelEmail}
                      onChange={(e) => setHotelEmail(e.target.value)}
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
                  <label
                    htmlFor="personalId"
                    className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                  >
                    პირადი ნომერი
                  </label>
                  <input
                    id="personalId"
                    type="text"
                    required
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
                    <label
                      htmlFor="legalEntityName"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      იურიდიული/შპს დასახელება
                    </label>
                    <input
                      id="legalEntityName"
                      type="text"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="იურიდიული/შპს დასახელება"
                      value={legalEntityName}
                      onChange={(e) => setLegalEntityName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="identificationCode"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      საიდენტიფიკაციო კოდი
                    </label>
                    <input
                      id="identificationCode"
                      type="text"
                      required
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="საიდენტიფიკაციო კოდი"
                      value={identificationCode}
                      onChange={(e) => setIdentificationCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="responsiblePersonName"
                      className="block text-[16px] md:text-[18px] font-medium text-black mb-1"
                    >
                      პასუხისმგებელი პირი (სახელი გვარი)
                    </label>
                    <input
                      id="responsiblePersonName"
                      type="text"
                      required
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
                      {formLoading ? "მიმდინარეობს..." : "დამატება"}
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
                სასტუმროს სახელი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ტიპი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                რეგისტრაციის ნომერი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ოთახების რაოდენობა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                კონტაქტი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                რეგისტრაციის თარიღი
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
                  {hotel.type === "PHYSICAL" ? "ფიზიკური პირი" : "იურიდიული პირი"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {hotel.hotelRegistrationNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {hotel.numberOfRooms}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  <div>
                    <div>{hotel.email}</div>
                    <div className="text-sm text-gray-600">{hotel.mobileNumber}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {new Date(hotel.createdAt).toLocaleDateString("ka-GE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hotels.length === 0 && (
        <div className="text-center py-8 text-black">
          სასტუმროები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

