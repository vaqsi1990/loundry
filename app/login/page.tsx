"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
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
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-[24px] md:text-[28px] font-extrabold text-gray-900">
            შესვლა
          </h2>
          <p className="mt-2 text-center text-[16px] md:text-[18px] text-gray-600">
            ან{" "}
            <Link
              href="/register"
              className="font-medium text-[16px] md:text-[18px] text-blue-600 hover:text-blue-500"
            >
              შექმენით ახალი ანგარიში
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
          <div className="rounded-md shadow-sm gap-4 -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                ელფოსტა
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border  text-black rounded-t-md  text-[16px] md:text-[18px]"
                placeholder="ელფოსტა"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                პაროლი
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border  text-black rounded-b-md  text-[16px] md:text-[18px]"
                placeholder="პაროლი"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="mx-auto items-center text-center justify-center">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full   mx-auto items-center justify-center md:w-auto bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              {loading ? "მიმდინარეობს..." : "შესვლა"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

