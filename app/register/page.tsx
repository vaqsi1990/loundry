"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hotelType, setHotelType] = useState<"PHYSICAL" | "LEGAL" | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // User account fields
  const [mobileNumber, setMobileNumber] = useState("");

  // Common fields
  const [hotelName, setHotelName] = useState("");
  const [hotelRegistrationNumber, setHotelRegistrationNumber] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");

  // Physical person fields
  const [personalId, setPersonalId] = useState("");

  // Legal entity fields
  const [legalEntityName, setLegalEntityName] = useState("");
  const [identificationCode, setIdentificationCode] = useState("");
  const [responsiblePersonName, setResponsiblePersonName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("პაროლები არ ემთხვევა");
      return;
    }

    setLoading(true);

    try {
      const requestBody: any = {
        name,
        lastName,
        email,
        password,
        confirmPassword,
        mobileNumber,
      };

      // Only include hotel data if hotelType is selected
      if (hotelType) {
        requestBody.hotelType = hotelType;
        requestBody.hotelName = hotelName;
        requestBody.hotelRegistrationNumber = hotelRegistrationNumber;
        requestBody.numberOfRooms = numberOfRooms ? parseInt(numberOfRooms) : undefined;
        requestBody.hotelEmail = hotelEmail;

        if (hotelType === "PHYSICAL") {
          requestBody.personalId = personalId;
        } else if (hotelType === "LEGAL") {
          requestBody.legalEntityName = legalEntityName;
          requestBody.identificationCode = identificationCode;
          requestBody.responsiblePersonName = responsiblePersonName;
        }
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "რეგისტრაციისას მოხდა შეცდომა");
        return;
      }

      // Redirect to login page after successful registration
      router.push("/login?registered=true");
    } catch (err) {
      setError("დაფიქსირდა შეცდომა. გთხოვთ სცადოთ თავიდან");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" bg-gray-50 py-12 px-14 mt-10 md:px-14">
      <div className="max-w-2xl mx-auto">
        <div>
          <h2 className="mt-6 text-center md:text-[24px] text-[18px] font-extrabold text-gray-900">
            რეგისტრაცია
          </h2>
          <p className="mt-2 text-center text-[16px] md:text-[18px] text-gray-600">
            ან{" "}
            <Link
              href="/login"
              className="font-medium text-[16px] md:text-[18px] text-blue-600 hover:text-blue-500"
            >
              შედით თქვენს ანგარიშში
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* User Account Fields */}
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              საერთო ინფორმაცია
            </h3>
            <div>
              <label htmlFor="name" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                სახელი
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="given-name"
                required
                className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                placeholder="სახელი"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                გვარი
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                placeholder="გვარი"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                ელფოსტა (ანგარიშისთვის)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                placeholder="ელფოსტა"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                პაროლი
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                  placeholder="პაროლი (მინიმუმ 6 სიმბოლო)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                პაროლის დამოწმება
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                  placeholder="გაიმეორეთ პაროლი"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="mobileNumber" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                მობილურის ნომერი
              </label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                required
                className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                placeholder="მობილურის ნომერი"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Hotel Type Selection */}
          <div className="bg-white shadow rounded-lg p-6">
            <div>
              <label htmlFor="hotelType" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-2">
                სასტუმროს ტიპი
              </label>
              <select
                id="hotelType"
                name="hotelType"
                className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px] bg-white"
                value={hotelType}
                onChange={(e) => setHotelType(e.target.value as "PHYSICAL" | "LEGAL" | "")}
              >
                <option value="">აირჩიეთ ტიპი (არასავალდებულო)</option>
                <option value="PHYSICAL">ფიზიკური პირი</option>
                <option value="LEGAL">იურიდიული პირი</option>
              </select>
            </div>
          </div>

          {/* Common Hotel Fields */}
          {hotelType && (
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <h3 className="text-[16px] md:text-[18px] font-medium text-gray-900 mb-4">
                სასტუმროს ინფორმაცია
              </h3>
              <div>
                <label htmlFor="hotelName" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  სასტუმროს დასახელება
                </label>
                <input
                  id="hotelName"
                  name="hotelName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="სასტუმროს დასახელება"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="hotelRegistrationNumber" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  სასტუმროს საკ. ნომერი
                </label>
                <input
                  id="hotelRegistrationNumber"
                  name="hotelRegistrationNumber"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="სასტუმროს საკ. ნომერი"
                  value={hotelRegistrationNumber}
                  onChange={(e) => setHotelRegistrationNumber(e.target.value)}
                />
              </div>
              <div>
                  <label htmlFor="numberOfRooms" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  ნომრების რაოდენობა
                </label>
                <input
                  id="numberOfRooms"
                  name="numberOfRooms"
                  type="number"
                  min="1"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="ნომრების რაოდენობა"
                  value={numberOfRooms}
                  onChange={(e) => setNumberOfRooms(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="hotelEmail" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  სასტუმროს ელ. ფოსტა
                </label>
                <input
                  id="hotelEmail"
                  name="hotelEmail"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="სასტუმროს ელ. ფოსტა"
                  value={hotelEmail}
                  onChange={(e) => setHotelEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Physical Person Fields */}
          {hotelType === "PHYSICAL" && (
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <h3 className="text-[16px] md:text-[18px] font-medium text-gray-900 mb-4">
                ფიზიკური პირის ინფორმაცია
              </h3>
              <div>
                <label htmlFor="personalId" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  პირადი ნომერი
                </label>
                <input
                  id="personalId"
                  name="personalId"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="პირადი ნომერი"
                  value={personalId}
                  onChange={(e) => setPersonalId(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Legal Entity Fields */}
          {hotelType === "LEGAL" && (
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
              <h3 className="text-[16px] md:text-[18px] font-medium text-gray-900 mb-4">
                იურიდიული პირის ინფორმაცია
              </h3>
              <div>
                <label htmlFor="legalEntityName" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  იურიდიული/შპს დასახელება
                </label>
                <input
                  id="legalEntityName"
                  name="legalEntityName"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="იურიდიული/შპს დასახელება"
                  value={legalEntityName}
                  onChange={(e) => setLegalEntityName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="identificationCode" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  საიდენტიფიკაციო კოდი
                </label>
                <input
                  id="identificationCode"
                  name="identificationCode"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="საიდენტიფიკაციო კოდი"
                  value={identificationCode}
                  onChange={(e) => setIdentificationCode(e.target.value)}
                />
              </div>
              <div>
                  <label htmlFor="responsiblePersonName" className="block text-[16px] md:text-[18px] font-medium text-gray-700 mb-1">
                  პასუხისმგებელი პირი (სახელი გვარი)
                </label>
                <input
                  id="responsiblePersonName"
                  name="responsiblePersonName"
                  type="text"
                  required
                  
                  className="appearance-none relative block w-full px-3 py-2 border  text-black rounded-md  text-[16px] md:text-[18px]"
                  placeholder="პასუხისმგებელი პირი"
                  value={responsiblePersonName}
                  onChange={(e) => setResponsiblePersonName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full mx-auto items-center justify-center md:w-auto bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {loading ? "მიმდინარეობს..." : "რეგისტრაცია"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
