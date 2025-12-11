"use client";

import React, { useEffect, useState } from "react";

interface ArchivedInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string | null;
  amount: number;
  totalWeightKg?: number | null;
  protectorsAmount?: number | null;
  totalAmount?: number | null;
  status: string;
  dueDate: string;
  createdAt: string;
}

interface MonthData {
  month: string; // YYYY-MM format
  count: number;
}

export default function InvoicesArchiveSection() {
  const [availableMonths, setAvailableMonths] = useState<MonthData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [archivedInvoices, setArchivedInvoices] = useState<ArchivedInvoice[]>([]);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Georgian month names
  const monthNames = [
    "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
    "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
  ];

  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  const fetchAvailableMonths = async () => {
    try {
      const res = await fetch(`/api/admin/invoices?months=true`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "თვეების ჩატვირთვა ვერ მოხერხდა");
      setAvailableMonths(data.months || []);
    } catch (err) {
      setArchivedError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const formatMoney = (n: number | undefined) => (n || 0).toFixed(2);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Use UTC methods to avoid timezone issues
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  };

  const getMonthName = (monthKey: string): string => {
    const [year, month] = monthKey.split("-");
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  const handleMonthClick = async (month: string) => {
    setSelectedMonth(month);
    setSearchQuery(""); // Clear search when month changes
    await fetchArchivedInvoices(month);
  };

  const fetchArchivedInvoices = async (month: string) => {
    setArchivedLoading(true);
    setArchivedError("");
    try {
      const res = await fetch(`/api/admin/invoices?month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "არქივის ჩატვირთვა ვერ მოხერხდა");
      setArchivedInvoices(data.invoices || []);
      setArchivedTotal(data.totalAmount || 0);
    } catch (err) {
      setArchivedError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
      setArchivedInvoices([]);
      setArchivedTotal(0);
    } finally {
      setArchivedLoading(false);
    }
  };

  const fetchInvoicesBySearch = async (query: string) => {
    if (!query.trim()) {
      // If search is cleared and month is selected, fetch that month's invoices
      if (selectedMonth) {
        await fetchArchivedInvoices(selectedMonth);
      } else {
        setArchivedInvoices([]);
        setArchivedTotal(0);
      }
      return;
    }

    setArchivedLoading(true);
    setArchivedError("");
    try {
      const res = await fetch(`/api/admin/invoices?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ძებნა ვერ მოხერხდა");
      setArchivedInvoices(data.invoices || []);
      setArchivedTotal(data.totalAmount || 0);
    } catch (err) {
      setArchivedError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
      setArchivedInvoices([]);
      setArchivedTotal(0);
    } finally {
      setArchivedLoading(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("წაიშალოს ეს ინვოისი?")) return;
    setDeletingId(id);
    setArchivedError("");
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
      if (selectedMonth) {
        await fetchArchivedInvoices(selectedMonth);
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setArchivedError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setDeletingId(null);
    }
  };

  // Group months by year
  const groupedMonths = availableMonths.reduce((acc, monthData) => {
    const [year] = monthData.month.split("-");
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(monthData);
    return acc;
  }, {} as Record<string, MonthData[]>);

  // Sort years descending
  const sortedYears = Object.keys(groupedMonths).sort((a, b) => parseInt(b) - parseInt(a));

  // Handle search query changes with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchInvoicesBySearch(searchQuery);
      } else if (selectedMonth && !archivedInvoices.length) {
        // Only fetch month invoices if we don't have any loaded yet
        fetchArchivedInvoices(selectedMonth);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Use invoices directly (already filtered by API if searching)
  const displayedInvoices = archivedInvoices;
  const displayedTotal = archivedTotal;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-black mb-2">არქივი (თვეების მიხედვით)</h3>
        <p className="text-gray-600 text-sm">აირჩიეთ თვე და იხილეთ ინვოისები.</p>
      </div>

      {/* Search input - always visible at the top, before months */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ძებნა სასტუმროს სახელით..."
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              გასუფთავება
            </button>
          )}
        </div>
      </div>

      {/* Months grouped by year */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-black mb-3">თვეები:</h4>
        <div className="space-y-4">
          {sortedYears.map((year) => (
            <div key={year} className="border-b border-gray-200 pb-3 last:border-b-0">
              <div className="text-sm font-semibold text-gray-700 mb-2">{year} წელი</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {groupedMonths[year]
                  .sort((a, b) => b.month.localeCompare(a.month))
                  .map((monthData) => (
                    <button
                      key={monthData.month}
                      onClick={() => handleMonthClick(monthData.month)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedMonth === monthData.month
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-black hover:bg-gray-200"
                      }`}
                    >
                      {getMonthName(monthData.month)}
                      <span className="ml-2 text-xs opacity-75">({monthData.count})</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
        {availableMonths.length === 0 && (
          <p className="text-gray-500 text-sm">ინვოისები არ მოიძებნა</p>
        )}
      </div>

      {archivedError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {archivedError}
        </div>
      )}

      {(selectedMonth || searchQuery) && (
        <>
          {selectedMonth && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">არჩეული თვე:</span> {getMonthName(selectedMonth)}
              </p>
            </div>
          )}

          {searchQuery && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">ძებნა:</span> "{searchQuery}"
              </p>
            </div>
          )}

          {archivedLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">იტვირთება...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-gray-600 text-sm">ინვოისების რაოდენობა</div>
                  <div className="text-xl font-bold text-black">{displayedInvoices.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-gray-600 text-sm">სულ თანხა (₾)</div>
                  <div className="text-xl font-bold text-black">{formatMoney(displayedTotal)} ₾</div>
                </div>
              </div>

              <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-medium text-black w-10"></th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">ინვოისი №</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">კლიენტი</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">ელფოსტა</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">გაგზავნის თარიღი</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">წონა (კგ)</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">დამცავები (₾)</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">სულ (₾)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedInvoices.length === 0 && !archivedLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-black text-sm">
                  {searchQuery
                    ? `ძებნის შედეგები არ მოიძებნა "${searchQuery}"-ისთვის`
                    : selectedMonth
                    ? "არჩეულ თვეში ინვოისები არ არის"
                    : "ინვოისები არ მოიძებნა"}
                </td>
              </tr>
            )}
            {displayedInvoices.map((inv) => (
              <React.Fragment key={inv.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-black">
                    <button
                      onClick={() => {
                        const next = new Set(expandedIds);
                        next.has(inv.id) ? next.delete(inv.id) : next.add(inv.id);
                        setExpandedIds(next);
                      }}
                      className="text-gray-700 hover:text-black"
                    >
                      {expandedIds.has(inv.id) ? "▾" : "▸"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-sm text-black whitespace-nowrap">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2 text-sm text-black whitespace-nowrap">{inv.customerName}</td>
                  <td className="px-4 py-2 text-sm text-black whitespace-nowrap">{inv.customerEmail || "-"}</td>
                  <td className="px-4 py-2 text-sm text-black whitespace-nowrap">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-sm text-black whitespace-nowrap">
                    {formatMoney(inv.totalWeightKg ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-sm text-black whitespace-nowrap">
                    {formatMoney(inv.protectorsAmount ?? 0)} ₾
                  </td>
                  <td className="px-4 py-2 text-sm text-black whitespace-nowrap">
                    {formatMoney(inv.totalAmount ?? inv.amount)} ₾
                  </td>
                </tr>
                {expandedIds.has(inv.id) && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="px-4 py-3 text-sm text-black">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div><span className="font-semibold">ინვოისი №:</span> {inv.invoiceNumber}</div>
                        <div><span className="font-semibold">კლიენტი:</span> {inv.customerName}</div>
                        <div><span className="font-semibold">ელფოსტა:</span> {inv.customerEmail || "-"}</div>
                       
                        <div><span className="font-semibold">შექმნის თარიღი:</span> {formatDate(inv.createdAt)}</div>
                        <div><span className="font-semibold">წონა (კგ):</span> {formatMoney(inv.totalWeightKg ?? 0)}</div>
                        <div><span className="font-semibold">დამცავები (₾):</span> {formatMoney(inv.protectorsAmount ?? 0)} ₾</div>
                        <div><span className="font-semibold">სულ (₾):</span> {formatMoney(inv.totalAmount ?? inv.amount)} ₾</div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          disabled={deletingId === inv.id}
                          className="bg-red-100 text-red-700 px-3 py-2 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {deletingId === inv.id ? "იშლება..." : "ინვოისის წაშლა"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
            </>
          )}
        </>
      )}

      {!selectedMonth && !searchQuery && (
        <div className="text-center py-8 text-gray-500">
          <p>აირჩიეთ თვე ან შეიყვანეთ სასტუმროს სახელი ძებნისთვის</p>
        </div>
      )}
    </div>
  );
}

