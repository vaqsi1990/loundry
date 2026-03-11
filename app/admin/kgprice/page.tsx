"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiPath } from "@/lib/api-helper";

export default function KgPricePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session) {
      const userRole = (session.user as any)?.role;
      if (userRole !== "ADMIN") {
        router.push("/admin");
        return;
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        setError("");

        const apiPath = getApiPath("kgprice");
        const res = await fetch(apiPath);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "kg ფასის ჩატვირთვა ვერ მოხერხდა");
        }
        const data = await res.json();
        if (data?.value != null) {
          setValue(String(data.value));
        }
        if (data?.updatedAt) {
          setLastUpdated(new Date(data.updatedAt).toLocaleString("ka-GE"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchPrice();
    }
  }, [status]);

  if (status === "loading") {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (!value) {
        setError("გთხოვთ შეიყვანოთ kg ფასი");
        return;
      }

      const apiPath = getApiPath("kgprice");
      setSaving(true);
      const res = await fetch(apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "kg ფასის შენახვა ვერ მოხერხდა");
      }

      if (data?.value != null) {
        setValue(String(data.value));
      }
      if (data?.updatedAt) {
        setLastUpdated(new Date(data.updatedAt).toLocaleString("ka-GE"));
      }

      setSuccess("kg ფასი წარმატებით შეინახა");
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="text-blue-600 hover:underline text-[18px] mb-2 font-bold inline-block"
            >
              ← უკან
            </Link>
            <h1 className="text-[18px] md:text-[24px] font-bold text-black">
              kg ფასი (ტაბელისთვის)
            </h1>
            <p className="text-[14px] md:text-[16px] text-gray-700 mt-1">
              აქ შეგიძლიათ შეინახოთ 1 kg-ის მიმდინარე ფასი, რომლის გამოყენებაც შემდეგ შეძლებთ ტაბელში.
            </p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                1 kg-ის ფასი (₾)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="მაგ: 3.50"
              />
            </div>
            {lastUpdated && (
              <p className="text-sm text-gray-600">
                ბოლოს განახლდა: {lastUpdated}
              </p>
            )}
            <div className="flex space-x-2 mt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? "შენახვა..." : "შენახვა"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

