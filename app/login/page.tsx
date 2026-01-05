"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginType, setLoginType] = useState<"HOTEL" | "ADMIN" | null>(null);
  const [adminRole, setAdminRole] = useState<"ADMIN" | "MANAGER" | "">("");
  const [personalId, setPersonalId] = useState("");
  const [physicalPassword, setPhysicalPassword] = useState("");
  const [identificationCode, setIdentificationCode] = useState("");
  const [legalPassword, setLegalPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [managerPersonalId, setManagerPersonalId] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [showPhysicalPassword, setShowPhysicalPassword] = useState(false);
  const [showLegalPassword, setShowLegalPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showManagerPassword, setShowManagerPassword] = useState(false);
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

    if (loginType === "HOTEL") {
      // Hotel login - determine physical or legal
      const hasPhysicalData = personalId.trim() && physicalPassword.trim();
      const hasLegalData = identificationCode.trim() && legalPassword.trim();

      if (!hasPhysicalData && !hasLegalData) {
        setError("გთხოვთ შეიყვანოთ მონაცემები ფიზიკური ან იურიდიული პირისთვის");
        return;
      }

      if (hasPhysicalData && hasLegalData) {
        setError("გთხოვთ შეიყვანოთ მონაცემები მხოლოდ ერთი ტიპისთვის");
        return;
      }

      setLoading(true);

      try {
        let result;
        
        if (hasPhysicalData) {
          // Physical person login
          result = await signIn("credentials", {
            personalId: personalId.trim(),
            password: physicalPassword,
            userType: "PHYSICAL",
            redirect: false,
          });
        } else {
          // Legal person login
          result = await signIn("credentials", {
            identificationCode: identificationCode.trim(),
            password: legalPassword,
            userType: "LEGAL",
            redirect: false,
          });
        }

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
    } else if (loginType === "ADMIN") {
      // Admin/Manager login
      if (!adminRole) {
        setError("გთხოვთ აირჩიოთ როლი");
        return;
      }

      if (adminRole === "ADMIN") {
        // Admin login with email
        if (!adminEmail.trim()) {
          setError("გთხოვთ შეიყვანოთ ელფოსტა");
          return;
        }

        if (!adminPassword) {
          setError("გთხოვთ შეიყვანოთ პაროლი");
          return;
        }

        setLoading(true);

        try {
          const result = await signIn("credentials", {
            email: adminEmail.trim(),
            password: adminPassword,
            userType: "ADMIN",
            adminRole: adminRole,
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
      } else if (adminRole === "MANAGER") {
        // Manager login with personalId
        if (!managerPersonalId.trim()) {
          setError("გთხოვთ შეიყვანოთ პირადი ნომერი");
          return;
        }

        if (!managerPassword) {
          setError("გთხოვთ შეიყვანოთ პაროლი");
          return;
        }

        setLoading(true);

        try {
          const result = await signIn("credentials", {
            personalId: managerPersonalId.trim(),
            password: managerPassword,
            userType: "ADMIN",
            adminRole: adminRole,
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
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl  w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-[24px] md:text-[28px] font-extrabold text-black">
            შესვლა
          </h2>
        </div>

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

        {/* Initial Login Type Selection */}
        {loginType === null && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-black mb-4 text-center">
              შესვლის ტიპი
            </h3>
            <div className="grid grid-cols-1 text-center md:grid-cols-2 gap-4">
              <label className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                loginType === "HOTEL" 
                  ? "border-blue-600 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="loginType"
                  value="HOTEL"
                  checked={loginType === "HOTEL"}
                  onChange={(e) => setLoginType(e.target.value as "HOTEL" | "ADMIN")}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-full border-2 mb-3 flex items-center justify-center ${
                  loginType === "HOTEL" 
                    ? "border-blue-600 bg-blue-600" 
                    : "border-gray-400"
                }`}>
                  {loginType === "HOTEL" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <span className={`text-[16px] md:text-[18px] font-medium ${
                  loginType === "HOTEL" ? "text-blue-600" : "text-black"
                }`}>
                  სასტუმრო
                </span>
              </label>
              <label className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                loginType === "ADMIN" 
                  ? "border-blue-600 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="loginType"
                  value="ADMIN"
                  checked={loginType === "ADMIN"}
                  onChange={(e) => setLoginType(e.target.value as "HOTEL" | "ADMIN")}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-full border-2 mb-3 flex items-center justify-center ${
                  loginType === "ADMIN" 
                    ? "border-blue-600 bg-blue-600" 
                    : "border-gray-400"
                }`}>
                  {loginType === "ADMIN" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <span className={`text-[16px] md:text-[18px] font-medium ${
                  loginType === "ADMIN" ? "text-blue-600" : "text-black"
                }`}>
                  ადმინისტრაცია
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Hotel Login Form */}
        {loginType === "HOTEL" && (
          <form className="mt-14 space-y-6" onSubmit={handleSubmit}>
            <div className="bg-white shadow rounded-lg p-6 space-y-6">
              {/* Physical Person Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-black mb-4 text-center">
                  ფიზიკური პირი
                </h3>
                <div>
                  <input
                    id="personalId"
                    name="personalId"
                    type="text"
                    className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                    placeholder="პირადი ნომერი"
                    value={personalId}
                    onChange={(e) => setPersonalId(e.target.value)}
                  />
                </div>
                <div>
                  <div className="relative">
                    <input
                      id="physicalPassword"
                      name="physicalPassword"
                      type={showPhysicalPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="პაროლი"
                      value={physicalPassword}
                      onChange={(e) => setPhysicalPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPhysicalPassword(!showPhysicalPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-black hover:text-gray-800"
                    >
                      {showPhysicalPassword ? (
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

              {/* Divider */}
              <div className="border-t border-gray-300"></div>

              {/* Legal Person Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-black mb-4 text-center">
                  იურიდიული პირი
                </h3>
                <div>
                  <input
                    id="identificationCode"
                    name="identificationCode"
                    type="text"
                    className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                    placeholder="საიდენტიფიკაციო კოდი"
                    value={identificationCode}
                    onChange={(e) => setIdentificationCode(e.target.value)}
                  />
                </div>
                <div>
                  <div className="relative">
                    <input
                      id="legalPassword"
                      name="legalPassword"
                      type={showLegalPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="პაროლი"
                      value={legalPassword}
                      onChange={(e) => setLegalPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLegalPassword(!showLegalPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-black hover:text-gray-800"
                    >
                      {showLegalPassword ? (
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

              {/* Submit Button */}
              <div className="mx-auto items-center text-center justify-center pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full mx-auto items-center font-bold justify-center md:w-auto bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {loading ? "მიმდინარეობს..." : "შესვლა"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Admin/Manager Login Form */}
        {loginType === "ADMIN" && (
          <form className="mt-14 space-y-6" onSubmit={handleSubmit}>
            <div className="bg-white shadow rounded-lg p-6 space-y-6">
              {/* Role Selection */}
              <div>
                <h3 className="text-lg font-medium text-black mb-4 text-center">
                  როლი
                </h3>
                <div className="grid grid-cols-1 text-center md:grid-cols-2 gap-4">
                  <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    adminRole === "ADMIN" 
                      ? "border-blue-600 bg-blue-50" 
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}>
                    <input
                      type="radio"
                      name="adminRole"
                      value="ADMIN"
                      checked={adminRole === "ADMIN"}
                      onChange={(e) => setAdminRole(e.target.value as "ADMIN")}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center ${
                      adminRole === "ADMIN" 
                        ? "border-blue-600 bg-blue-600" 
                        : "border-gray-400"
                    }`}>
                      {adminRole === "ADMIN" && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className={`text-[14px] md:text-[16px] font-medium ${
                      adminRole === "ADMIN" ? "text-blue-600" : "text-black"
                    }`}>
                      ადმინი
                    </span>
                  </label>
                  <label className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    adminRole === "MANAGER" 
                      ? "border-blue-600 bg-blue-50" 
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}>
                    <input
                      type="radio"
                      name="adminRole"
                      value="MANAGER"
                      checked={adminRole === "MANAGER"}
                      onChange={(e) => setAdminRole(e.target.value as "MANAGER")}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mb-2 flex items-center justify-center ${
                      adminRole === "MANAGER" 
                        ? "border-blue-600 bg-blue-600" 
                        : "border-gray-400"
                    }`}>
                      {adminRole === "MANAGER" && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className={`text-[14px] md:text-[16px] font-medium ${
                      adminRole === "MANAGER" ? "text-blue-600" : "text-black"
                    }`}>
                      მენეჯერი/მენეჯერის თანაშემწე
                    </span>
                  </label>
                </div>
              </div>

              {/* Admin Login - Email and Password */}
              {adminRole === "ADMIN" && (
                <>
                  <div>
                    <input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      autoComplete="email"
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="ელფოსტა"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        id="adminPassword"
                        name="adminPassword"
                        type={showAdminPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                        placeholder="პაროლი"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-black hover:text-gray-800"
                      >
                        {showAdminPassword ? (
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

                  {/* Submit Button */}
                  <div className="mx-auto items-center text-center justify-center pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full mx-auto items-center font-bold justify-center md:w-auto bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-center"
                    >
                      {loading ? "მიმდინარეობს..." : "შესვლა"}
                    </button>
                  </div>
                </>
              )}

              {/* Manager Login - Personal ID and Password */}
              {adminRole === "MANAGER" && (
                <>
                  <div>
                    <input
                      id="managerPersonalId"
                      name="managerPersonalId"
                      type="text"
                      className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 border text-black rounded-md text-[16px] md:text-[18px]"
                      placeholder="პირადი ნომერი"
                      value={managerPersonalId}
                      onChange={(e) => setManagerPersonalId(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        id="managerPassword"
                        name="managerPassword"
                        type={showManagerPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className="appearance-none placeholder:text-black placeholder:text-[18px] relative block w-full px-3 py-2 pr-10 border text-black rounded-md text-[16px] md:text-[18px]"
                        placeholder="პაროლი"
                        value={managerPassword}
                        onChange={(e) => setManagerPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowManagerPassword(!showManagerPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-black hover:text-gray-800"
                      >
                        {showManagerPassword ? (
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

                  {/* Submit Button */}
                  <div className="mx-auto items-center text-center justify-center pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full mx-auto items-center font-bold justify-center md:w-auto bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-center"
                    >
                      {loading ? "მიმდინარეობს..." : "შესვლა"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        )}

        {/* Back Button */}
        {loginType !== null && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setLoginType(null);
                setAdminRole("");
                setError("");
                setPersonalId("");
                setPhysicalPassword("");
                setIdentificationCode("");
                setLegalPassword("");
                setAdminEmail("");
                setAdminPassword("");
                setManagerPersonalId("");
                setManagerPassword("");
              }}
              className="text-blue-600 hover:text-blue-800 text-[16px] md:text-[18px]"
            >
              ← უკან
            </button>
          </div>
        )}
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

