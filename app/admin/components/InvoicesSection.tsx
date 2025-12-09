"use client";

import { useEffect, useState } from "react";

interface InvoiceDaySummary {
  date: string;
  sheetCount: number;
  totalDispatched: number;
  totalWeightKg: number;
  protectorsAmount: number;
  totalAmount: number;
}

export default function InvoicesSection() {
  const [summaries, setSummaries] = useState<InvoiceDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/admin/invoices");
      if (!response.ok) {
        throw new Error("ინვოისების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setSummaries(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const deleteDay = async (date: string) => {
    if (!confirm(`წაიშალოს ${date}-ის გაგზავნილი ინვოისები?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/invoices?date=${date}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ ყველა გაგზავნილი ინვოისის წაშლა?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/invoices?all=true`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setBusy(false);
    }
  };

  const totalWeight = summaries.reduce((sum, d) => sum + (d.totalWeightKg || 0), 0);
  const totalProtectors = summaries.reduce((sum, d) => sum + (d.protectorsAmount || 0), 0);
  const totalAmount = summaries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalDispatched = summaries.reduce((sum, d) => sum + (d.totalDispatched || 0), 0);

  const formatDate = (date: string) => {
    const [year, month, day] = date.split("-");
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const weekdays = ["კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"];
    const months = [
      "იანვარი",
      "თებერვალი",
      "მარტი",
      "აპრილი",
      "მაისი",
      "ივნისი",
      "ივლისი",
      "აგვისტო",
      "სექტემბერი",
      "ოქტომბერი",
      "ნოემბერი",
      "დეკემბერი",
    ];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-black">ინვოისები (დღეების მიხედვით ჯამური)</h2>
          <p className="text-gray-600 text-sm md:text-base">
            ყველა გაგზავნილი დღის ფურცლის ჯამური მონაცემები თარიღის მიხედვით.
          </p>
        </div>
        <button
          onClick={deleteAll}
          disabled={busy || summaries.length === 0}
          className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ყველა წაშლა
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-gray-600">დღეების რაოდენობა</div>
          <div className="text-2xl font-bold text-black">{summaries.length}</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="text-gray-600">გაგზავნილი (ც.)</div>
          <div className="text-2xl font-bold text-black">{totalDispatched}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-gray-600">წონა (კგ)</div>
          <div className="text-2xl font-bold text-black">{totalWeight.toFixed(2)}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-gray-600">დამცავები / სულ</div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-black">{totalProtectors.toFixed(2)} ₾</span>{" "}
            · <span className="font-semibold text-black">{totalAmount.toFixed(2)} ₾</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                თარიღი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ფურცლები
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                გაგზავნილი (ც.)
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                წონა (კგ)
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                დამცავები (₾)
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სულ (₾)
              </th>
            <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
              ქმედება
            </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {summaries.map((day) => (
              <tr key={day.date} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {formatDate(day.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {day.sheetCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {day.totalDispatched}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {day.totalWeightKg.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {day.protectorsAmount.toFixed(2)} ₾
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {day.totalAmount.toFixed(2)} ₾
                </td>
              <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                <button
                  onClick={() => deleteDay(day.date)}
                  disabled={busy}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  წაშლა
                </button>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summaries.length === 0 && (
        <div className="text-center py-8 text-black">
          მონაცემები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

