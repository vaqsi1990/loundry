"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<"PHYSICAL" | "LEGAL" | "ADMIN" | "">("");
  const [email, setEmail] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [identificationCode, setIdentificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("რეგისტრაცია წარმატებით დასრულდა! გთხოვთ შეხვიდეთ თქვენს ანგარიშში.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate user type is selected
    if (!userType) {
      setError("გთხოვთ აირჩიოთ შესვლის ტიპი");
      return;
    }

    setLoading(true);

    try {
      let credentials: any = {
        password,
        userType,
      };

      if (userType === "ADMIN") {
        if (!email) {
          setError("გთხოვთ შეიყვანოთ ელფოსტა");
          setLoading(false);
          return;
        }
        credentials.email = email;
      } else if (userType === "PHYSICAL") {
        if (!personalId) {
          setError("გთხოვთ შეიყვანოთ პირადი ნომერი");
          setLoading(false);
          return;
        }
        credentials.personalId = personalId;
      } else if (userType === "LEGAL") {
        if (!identificationCode) {
          setError("გთხოვთ შეიყვანოთ საიდენტიფიკაციო კოდი");
          setLoading(false);
          return;
        }
        credentials.identificationCode = identificationCode;
      }

      const result = await signIn("credentials", {
        ...credentials,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("დაფიქსირდა შეცდომა. გთხოვთ სცადოთ თავიდან");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl  w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-[24px] md:text-[28px] font-extrabold text-black">
            შესვლა
          </h2>
          <p className="mt-2 text-center text-[16px] md:text-[18px] text-black">
            ან{" "}
            <Link
              href="/register"
              className="font-medium text-[16px] md:text-[18px] text-blue-600 hover:text-blue-500"
            >
              შექმენით ახალი ანგარიში
            </Link>
          </p>
        </div>
        <form className="mt-14 space-y-6" onSubmit={handleSubmit}>
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* User Type Selection - First Step */}
          <div className="bg-white mt-14 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-black mb-4 text-center">
              შესვლის ტიპი
            </h3>
            <div className="grid grid-cols-1 text-center md:grid-cols-3 gap-4">
              <label className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                userType === "PHYSICAL" 
                  ? "border-blue-600 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="userType"
                  value="PHYSICAL"
                  checked={userType === "PHYSICAL"}
                  onChange={(e) => setUserType(e.target.value as "PHYSICAL")}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-full border-2 mb-3 flex items-center justify-center ${
                  userType === "PHYSICAL" 
                    ? "border-blue-600 bg-blue-600" 
                    : "border-gray-400"
                }`}>
                  {userType === "PHYSICAL" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <span className={`text-[16px] md:text-[18px] font-medium ${
                  userType === "PHYSICAL" ? "text-blue-600" : "text-black"
                }`}>
                  ფიზიკური პირი
                </span>
              </label>
              <label className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                userType === "LEGAL" 
                  ? "border-blue-600 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="userType"
                  value="LEGAL"
                  checked={userType === "LEGAL"}
                  onChange={(e) => setUserType(e.target.value as "LEGAL")}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-full border-2 mb-3 flex items-center justify-center ${
                  userType === "LEGAL" 
                    ? "border-blue-600 bg-blue-600" 
                    : "border-gray-400"
                }`}>
                  {userType === "LEGAL" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <span className={`text-[16px] md:text-[18px] font-medium ${
                  userType === "LEGAL" ? "text-blue-600" : "text-black"
                }`}>
                  იურიდიული პირი
                </span>
              </label>
              <label className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                userType === "ADMIN" 
                  ? "border-blue-600 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="userType"
                  value="ADMIN"
                  checked={userType === "ADMIN"}
                  onChange={(e) => setUserType(e.target.value as "ADMIN")}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-full border-2 mb-3 flex items-center justify-center ${
                  userType === "ADMIN" 
                    ? "border-blue-600 bg-blue-600" 
                    : "border-gray-400"
                }`}>
                  {userType === "ADMIN" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <span className={`text-[16px] md:text-[18px] font-medium ${
                  userType === "ADMIN" ? "text-blue-600" : "text-black"
                }`}>
                  ადმინისტრატორი
                </span>
              </label>
            </div>
          </div>

          {/* Login Fields - Show only when userType is selected */}
          {userType && (
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            {/* Admin Login - Email and Password */}
            {userType === "ADMIN" && (
              <>
                <div>
                  <label htmlFor="email" className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                    ელფოსტა
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                    placeholder="ელფოსტა"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Physical Person Login - Personal ID and Password */}
            {userType === "PHYSICAL" && (
              <div>
                <label htmlFor="personalId" className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  პირადი ნომერი
                </label>
                <input
                  id="personalId"
                  name="personalId"
                  type="text"
                  required
                  className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                  placeholder="პირადი ნომერი"
                  value={personalId}
                  onChange={(e) => setPersonalId(e.target.value)}
                />
              </div>
            )}

            {/* Legal Entity Login - Identification Code and Password */}
            {userType === "LEGAL" && (
              <div>
                <label htmlFor="identificationCode" className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  საიდენტიფიკაციო კოდი
                </label>
                <input
                  id="identificationCode"
                  name="identificationCode"
                  type="text"
                  required
                  className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                  placeholder="საიდენტიფიკაციო კოდი"
                  value={identificationCode}
                  onChange={(e) => setIdentificationCode(e.target.value)}
                />
              </div>
            )}

            {/* Password - Common for all types */}
            <div>
              <label htmlFor="password" className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                პაროლი
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                  placeholder="პაროლი"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-black hover:text-gray-800"
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
          </div>
          )}

          {/* Submit Button - Show only when userType is selected */}
          {userType && (
          <div className="mx-auto items-center text-center justify-center">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full mx-auto items-center font-bold justify-center md:w-auto bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {loading ? "მიმდინარეობს..." : "შესვლა"}
            </button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-[18px] md:text-[20px] text-gray-600">იტვირთება...</div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

