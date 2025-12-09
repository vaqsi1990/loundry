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

  const totalWeight = summaries.reduce((sum, d) => sum + (d.totalWeightKg || 0), 0);
  const totalProtectors = summaries.reduce((sum, d) => sum + (d.protectorsAmount || 0), 0);
  const totalAmount = summaries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalDispatched = summaries.reduce((sum, d) => sum + (d.totalDispatched || 0), 0);

  const formatDate = (date: string) => {
    const [year, month, day] = date.split("-");
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return parsed.toLocaleDateString("ka-GE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {summaries.map((day) => (
              <tr key={day.date} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  <div>{formatDate(day.date)}</div>
                  <div className="text-xs text-gray-500">{day.date}</div>
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

