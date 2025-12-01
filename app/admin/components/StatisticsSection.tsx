"use client";

import { useEffect, useState } from "react";

interface StatisticsData {
  period: string;
  revenues: number;
  expenses: number;
  salaries: number;
  netIncome: number;
}

export default function StatisticsSection() {
  const [statistics, setStatistics] = useState<StatisticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [compareMode, setCompareMode] = useState(false);
  const [comparePeriod1, setComparePeriod1] = useState("");
  const [comparePeriod2, setComparePeriod2] = useState("");

  useEffect(() => {
    fetchStatistics();
  }, [viewMode, selectedYear]);

  const fetchStatistics = async () => {
    try {
      const params = viewMode === "monthly"
        ? `?view=monthly&year=${selectedYear}`
        : `?view=yearly`;
      
      const response = await fetch(`/api/admin/statistics${params}`);
      if (!response.ok) {
        throw new Error("სტატისტიკის ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!comparePeriod1 || !comparePeriod2) {
      setError("გთხოვთ აირჩიოთ ორივე პერიოდი");
      return;
    }

    setError("");
    try {
      const response = await fetch(
        `/api/admin/statistics/compare?period1=${comparePeriod1}&period2=${comparePeriod2}&view=${viewMode}`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "შედარება ვერ მოხერხდა");
      }
      const data = await response.json();
      setStatistics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
    ];
    return months[month - 1];
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">სტატისტიკა</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="mb-4 flex space-x-4">
        <button
          onClick={() => setViewMode("monthly")}
          className={`px-4 py-2 rounded-lg ${
            viewMode === "monthly" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
          }`}
        >
          თვეების მიხედვით
        </button>
        <button
          onClick={() => setViewMode("yearly")}
          className={`px-4 py-2 rounded-lg ${
            viewMode === "yearly" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
          }`}
        >
          წლების მიხედვით
        </button>
      </div>

      {/* Year Selector for Monthly */}
      {viewMode === "monthly" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-black mb-1">წელი</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
            min="2020"
            max="2100"
          />
        </div>
      )}

      {/* Compare Mode */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-black mb-4">შედარება</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                პერიოდი 1 {viewMode === "monthly" ? "(თვე/წელი)" : "(წელი)"}
              </label>
              {viewMode === "monthly" ? (
                <input
                  type="month"
                  value={comparePeriod1}
                  onChange={(e) => setComparePeriod1(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              ) : (
                <input
                  type="number"
                  value={comparePeriod1}
                  onChange={(e) => setComparePeriod1(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="წელი"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                პერიოდი 2 {viewMode === "monthly" ? "(თვე/წელი)" : "(წელი)"}
              </label>
              {viewMode === "monthly" ? (
                <input
                  type="month"
                  value={comparePeriod2}
                  onChange={(e) => setComparePeriod2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              ) : (
                <input
                  type="number"
                  value={comparePeriod2}
                  onChange={(e) => setComparePeriod2(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="წელი"
                />
              )}
            </div>
          </div>
          <button
            onClick={handleCompare}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            შედარება
          </button>
          <button
            onClick={fetchStatistics}
            className="ml-2 bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            განახლება
          </button>
        </div>
      </div>

      {/* Statistics Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                პერიოდი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                შემოსავლები
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ხარჯები
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ხელფასები
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                წმინდა შემოსავალი
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statistics.map((stat, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {stat.period}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-green-600 font-semibold">
                  +{stat.revenues.toFixed(2)} ₾
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-red-600 font-semibold">
                  -{stat.expenses.toFixed(2)} ₾
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-orange-600 font-semibold">
                  -{stat.salaries.toFixed(2)} ₾
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] font-bold ${
                  stat.netIncome >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {stat.netIncome >= 0 ? "+" : ""}{stat.netIncome.toFixed(2)} ₾
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {statistics.length === 0 && (
        <div className="text-center py-8 text-black">
          სტატისტიკა არ მოიძებნა
        </div>
      )}
    </div>
  );
}

