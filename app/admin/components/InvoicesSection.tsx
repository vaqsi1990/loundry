"use client";

import React, { useEffect, useState } from "react";
import { getApiPath } from "@/lib/api-helper";

interface Hotel {
  id: string;
  hotelName: string;
  email?: string;
}

interface DateDetail {
  date: string;
  emailSendCount: number;
  weightKg: number;
  protectorsAmount: number;
  totalAmount: number;
  sentAt: string | null;
  confirmedAt: string | null;
  emailSendIds?: string[]; // IDs of emailSends that belong to this invoice detail
}

interface InvoiceDaySummary {
  hotelName: string | null;
  displayHotelName: string | null;
  sheetCount: number;
  totalDispatched: number;
  totalWeightKg: number;
  protectorsAmount: number;
  totalAmount: number;
  totalEmailSendCount?: number;
  dateDetails?: DateDetail[];
}

export default function InvoicesSection() {
  const [summaries, setSummaries] = useState<InvoiceDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfModal, setPdfModal] = useState<{ 
    open: boolean; 
    hotelName: string | null;
    dateDetails?: DateDetail[];
  }>({
    open: false,
    hotelName: null,
  });
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [modalEmail, setModalEmail] = useState<string | null>(null);
  const [sendingPdf, setSendingPdf] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // Empty = all months
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [selectedMonth]);

  // Debug: log dispatched counts to verify totals
  useEffect(() => {
    if (summaries.length > 0) {
      const perHotel = summaries.map((s) => ({
        hotel: formatHotel(s.hotelName),
        dispatched: s.totalDispatched,
      }));
      const total = summaries.reduce((sum, s) => sum + (s.totalDispatched || 0), 0);
      console.log("გაგზავნილი (ც.) per hotel:", perHotel, "სულ:", total);
    }
  }, [summaries]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const apiPath = getApiPath("invoices");
      const url = selectedMonth 
        ? `${apiPath}?emailSendsMonth=${selectedMonth}`
        : apiPath;
      const response = await fetch(url);
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

  const fetchHotels = async () => {
    try {
      const apiPath = getApiPath("our-hotels");
      const response = await fetch(apiPath);
      if (!response.ok) {
        throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setHotels(
        Array.isArray(data)
          ? data.map((h: any) => ({
              id: h.id,
              hotelName: h.hotelName,
              email: h.email,
            }))
          : []
      );
    } catch (err) {
      console.error("Hotels fetch error:", err);
      // Silence error to not block invoices table
    }
  };

  const deleteDay = async (date: string, emailSendIds?: string[]) => {
    if (!emailSendIds || emailSendIds.length === 0) {
      if (!confirm(`წაიშალოს ${formatDate(date)}-ის გაგზავნილი ინვოისები?`)) return;
      setBusy(true);
      setError("");
      setSuccessMessage("");
      try {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = date.includes("T") ? date.split("T")[0] : date;
        const apiPath = getApiPath("invoices");
        const res = await fetch(`${apiPath}?date=${dateStr}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
        setSuccessMessage(`წაიშალა ${formatDate(date)}-ის ინვოისები`);
        setTimeout(() => setSuccessMessage(""), 5000);
        await fetchInvoices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
        console.error("Delete day error:", err);
      } finally {
        setBusy(false);
      }
    } else {
      // Delete specific invoice by emailSendIds
      if (!confirm(`წაიშალოს ეს ინვოისი?`)) return;
      setBusy(true);
      setError("");
      setSuccessMessage("");
      try {
        const apiPath = getApiPath("invoices");
        const res = await fetch(apiPath, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailSendIds: emailSendIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
        setSuccessMessage(`ინვოისი წაიშალა`);
        setTimeout(() => setSuccessMessage(""), 5000);
        await fetchInvoices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
        console.error("Delete invoice error:", err);
      } finally {
        setBusy(false);
      }
    }
  };

  const deleteHotel = async (hotelName: string | null, dateDetails?: DateDetail[]) => {
    if (!hotelName) return;
    
    // If dateDetails are provided, delete only those specific invoices
    // Otherwise, delete all invoices for the hotel (legacy behavior)
    if (dateDetails && dateDetails.length > 0) {
      // Collect all emailSendIds from all dateDetails in this invoice group
      const allEmailSendIds = dateDetails
        .flatMap(detail => detail.emailSendIds || [])
        .filter((id): id is string => id !== undefined);
      
      if (allEmailSendIds.length === 0) {
        setError("ინვოისის ID-ები არ მოიძებნა");
        return;
      }
      
      if (!confirm(`წაიშალოს ეს ინვოისები (${allEmailSendIds.length})?`)) return;
      setBusy(true);
      setError("");
      setSuccessMessage("");
      try {
        const apiPath = getApiPath("invoices");
        const res = await fetch(apiPath, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailSendIds: allEmailSendIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
        setSuccessMessage(`ინვოისები წაიშალა`);
        setTimeout(() => setSuccessMessage(""), 5000);
        await fetchInvoices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
        console.error("Delete invoice error:", err);
      } finally {
        setBusy(false);
      }
    } else {
      // Legacy: delete all invoices for the hotel
      if (!confirm(`წაიშალოს ${formatHotel(hotelName)}-ის ყველა გაგზავნილი ინვოისი?`)) return;
      setBusy(true);
      setError("");
      setSuccessMessage("");
      try {
        const apiPath = getApiPath("invoices");
        const res = await fetch(`${apiPath}?hotelName=${encodeURIComponent(hotelName)}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "წაშლა ვერ მოხერხდა");
        setSuccessMessage(`${formatHotel(hotelName)}-ის ინვოისები წაიშალა`);
        setTimeout(() => setSuccessMessage(""), 5000);
        await fetchInvoices();
      } catch (err) {
        setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
        console.error("Delete hotel error:", err);
      } finally {
        setBusy(false);
      }
    }
  };

  const deleteAll = async () => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ ყველა გაგზავნილი ინვოისის წაშლა?")) return;
    setBusy(true);
    setError("");
    try {
      const apiPath = getApiPath("invoices");
      const res = await fetch(`${apiPath}?all=true`, { method: "DELETE" });
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
  const totalSheets = summaries.reduce((sum, d) => sum + (d.sheetCount || 0), 0);
  const totalEmailSendCount = summaries.reduce(
    (sum, d) => sum + (d.totalEmailSendCount || 0),
    0
  );

  const formatHotel = (name: string | null) => name || "-";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
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
    
    return `${day} ${months[month]}, ${year}`;
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
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
    return `${months[month - 1]} ${year}`;
  };

  const normalizeHotelName = (name: string | null) => {
    if (!name) return "";
    return name.trim().replace(/\s+/g, " ").toLowerCase();
  };

  const openPdfModal = (hotelName: string | null, dateDetails?: DateDetail[]) => {
    setSuccessMessage("");
    setPdfModal({ open: true, hotelName, dateDetails });
    if (hotelName) {
      // Use case-insensitive matching to find the hotel email
      const normalizedSearch = normalizeHotelName(hotelName);
      const h = hotels.find(h => normalizeHotelName(h.hotelName) === normalizedSearch);
      setModalEmail(h?.email || null);
    } else {
      setModalEmail(null);
    }
  };

  const closePdfModal = () => {
    setPdfModal({ open: false, hotelName: null, dateDetails: undefined });
    setModalEmail(null);
  };

  useEffect(() => {
    if (!pdfModal.open || !pdfModal.hotelName) return;
    const normalizedSearch = normalizeHotelName(pdfModal.hotelName);
    const h = hotels.find(h => normalizeHotelName(h.hotelName) === normalizedSearch);
    if (h?.email !== modalEmail) {
      setModalEmail(h?.email || null);
    }
  }, [pdfModal.open, pdfModal.hotelName, hotels, modalEmail]);

  const sendPdfInvoice = async () => {
    if (!pdfModal.hotelName) {
      setError("სასტუმროს სახელი არ არის მითითებული");
      return;
    }

    // Prevent double submission
    if (sendingPdf) {
      return;
    }

    setSendingPdf(true);
    setError("");

    try {
      const apiPath = getApiPath("invoices", "send-pdf");
      const requestBody: {
        hotelName: string | null;
        dateDetails?: DateDetail[];
        email?: string | null;
        // Explicitly pass service dates (daily sheet dates) for debugging / clarity
        serviceDates?: string[];
      } = {
        hotelName: pdfModal.hotelName,
        dateDetails: pdfModal.dateDetails, // Send specific invoices to include
        email: modalEmail, // Include email if available
        serviceDates: pdfModal.dateDetails?.map((d) => d.date) || [],
      };
      
      console.log("Sending invoice request:", {
        apiPath,
        hotelName: requestBody.hotelName,
        dateDetailsCount: requestBody.dateDetails?.length || 0,
        emailSendIdsCount:
          requestBody.dateDetails?.flatMap((d: DateDetail) => d.emailSendIds || [])
            .length || 0,
        email: requestBody.email,
        // Show the service dates (day sheet dates) that are being sent
        serviceDates: requestBody.serviceDates,
      });
      
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PDF-ის გაგზავნა ვერ მოხერხდა");
      }

      setSuccessMessage(
        `PDF ინვოისი წარმატებით გაიგზავნა ${pdfModal.hotelName || ""}`
      );
      closePdfModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSendingPdf(false);
    }
  };

  // Flatten summaries into individual invoice rows (one per emailSend/dateDetail)
  const flatInvoices = summaries.flatMap((summary) => {
    const dateDetails = summary.dateDetails || [];
    return dateDetails.map((detail) => {
      const monthKey = detail.date.slice(0, 7); // YYYY-MM from date
      return {
        hotelName: summary.hotelName,
        displayHotelName: summary.displayHotelName,
        detail,
        monthKey,
      };
    });
  });

  // Group flat invoices by month
  const invoicesByMonth = flatInvoices.reduce<Record<string, typeof flatInvoices>>((acc, inv) => {
    if (!acc[inv.monthKey]) acc[inv.monthKey] = [];
    acc[inv.monthKey].push(inv);
    return acc;
  }, {});

  // Month options for filter dropdown – same months as headers
  const monthOptions = Object.keys(invoicesByMonth)
    .sort((a, b) => b.localeCompare(a)) // newest month first
    .map((monthKey) => ({
      month: monthKey,
      count: invoicesByMonth[monthKey].length,
    }));

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const toggleHotel = (monthKey: string, hotelKey: string) => {
    const key = `${monthKey}|${hotelKey}`;
    setExpandedHotels(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-black">ინვოისები (ცალკეული ინვოისები)</h2>
          <p className="text-gray-600 text-sm md:text-base">
            ყველა გაგზავნილი დღის ფურცელი ცალკეული ინვოისების მიხედვით, დაყოფილი თვეებად.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ყველა თვე</option>
            {monthOptions.map((month) => (
              <option key={month.month} value={month.month}>
                {formatMonth(month.month)} ({month.count})
              </option>
            ))}
          </select>
          <button
            onClick={deleteAll}
            disabled={busy || summaries.length === 0}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ყველა წაშლა
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {selectedMonth && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-bold text-black mb-2">
            {formatMonth(selectedMonth)} - ჯამური მონაცემები
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-gray-600 text-sm">სასტუმროები</div>
              <div className="text-xl font-bold text-black">{summaries.length}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">ფურცლები</div>
              <div className="text-xl font-bold text-black">{totalSheets}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">გაგზავნა (ჯამი)</div>
              <div className="text-xl font-bold text-black">{totalEmailSendCount}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">წონა (კგ)</div>
              <div className="text-xl font-bold text-black">{totalWeight.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">სულ თანხა</div>
              <div className="text-xl font-bold text-black">{totalAmount.toFixed(2)} ₾</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-gray-600">სასტუმროები</div>
          <div className="text-2xl font-bold text-black">{summaries.length}</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="text-gray-600">ფურცლები</div>
          <div className="text-2xl font-bold text-black">{totalSheets}</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg">
          <div className="text-gray-600">გაგზავნა (ჯამი)</div>
          <div className="text-2xl font-bold text-black">{totalEmailSendCount}</div>
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

      {/* Individual invoices grouped by month */}
      <div className="space-y-6">
        {Object.keys(invoicesByMonth)
          .sort((a, b) => b.localeCompare(a)) // newest month first
          .map((monthKey) => {
            const monthInvoices = invoicesByMonth[monthKey];
              // Group this month's invoices by hotel
              const hotelsInMonth = monthInvoices.reduce<Record<string, { hotelName: string | null; displayHotelName: string | null; invoices: typeof monthInvoices }>>((acc, inv) => {
                const rawName = inv.displayHotelName || inv.hotelName || "-";
                const key = normalizeHotelName(rawName) || "-";
                if (!acc[key]) {
                  acc[key] = {
                    hotelName: inv.hotelName,
                    displayHotelName: inv.displayHotelName,
                    invoices: [],
                  };
                }
                acc[key].invoices.push(inv);
                return acc;
              }, {});

            return (
              <div key={monthKey} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div
                  className="px-6 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="text-gray-600 hover:text-gray-900 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMonth(monthKey);
                      }}
                    >
                      {expandedMonths.has(monthKey) ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                    <div>
                      <h3 className="text-lg font-bold text-black">
                        {formatMonth(monthKey)} 
                      </h3>
                    </div>
                  </div>
                </div>
                {expandedMonths.has(monthKey) && (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(hotelsInMonth).map(([hotelKey, group]) => {
                      const displayName = formatHotel(group.displayHotelName || group.hotelName);
                      const hotelInvoices = group.invoices.sort((a, b) =>
                        b.detail.date.localeCompare(a.detail.date)
                      );
                      const totalHotelAmount = hotelInvoices.reduce(
                        (sum, inv) => sum + (inv.detail.totalAmount || 0),
                        0
                      );
                      const totalHotelWeight = hotelInvoices.reduce(
                        (sum, inv) => sum + (inv.detail.weightKg || 0),
                        0
                      );
                      const totalHotelProtectors = hotelInvoices.reduce(
                        (sum, inv) => sum + (inv.detail.protectorsAmount || 0),
                        0
                      );
                      const dateDetailsForHotel = hotelInvoices.map((inv) => inv.detail);
                      const allConfirmed =
                        dateDetailsForHotel.length > 0 &&
                        dateDetailsForHotel.every((d) => !!d.confirmedAt);
                      const someConfirmed = dateDetailsForHotel.some((d) => !!d.confirmedAt);
                      const hotelToggleKey = `${monthKey}|${hotelKey}`;

                      return (
                        <div key={hotelKey} className="bg-white">
                          <div
                            className="w-full px-6 py-3 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleHotel(monthKey, hotelKey)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[14px] md:text-[16px] font-semibold text-black">
                                {displayName}
                              </span>
                              <span className="text-[16px] md:text-[18px] text-black">
                                {hotelInvoices.length} ინვოისი · {totalHotelWeight.toFixed(2)} კგ · {totalHotelAmount.toFixed(2)} ₾ ·{" "}
                                   დამცავები {totalHotelProtectors.toFixed(2)} ₾
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="hidden md:block">
                                {allConfirmed ? (
                                  <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-3 py-1 text-xs font-semibold">
                                    ყველა ინვოისი დადასტურებულია
                                  </span>
                                ) : someConfirmed ? (
                                  <span className="inline-flex items-center rounded-full bg-yellow-50 text-yellow-700 px-3 py-1 text-xs font-semibold">
                                    ნაწილობრივ დადასტურებულია
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-yellow-50 text-yellow-700 px-3 py-1 text-xs font-semibold">
                                    დადასტურება საჭიროა
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Always send PDF for all selected day sheets (even if invoice was sent before)
                                    openPdfModal(
                                      group.displayHotelName || group.hotelName,
                                      dateDetailsForHotel
                                    );
                                  }}
                                  className="text-[12px] md:text-[14px] bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none"
                                >
                                  PDF-ის გაგზავნა
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteHotel(group.displayHotelName || group.hotelName, dateDetailsForHotel);
                                  }}
                                  disabled={busy}
                                  className="text-[12px] md:text-[14px] bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  წაშლა
                                </button>
                                <span className="text-gray-500 text-sm md:text-base">
                                  {expandedHotels.has(hotelToggleKey) ? "▲" : "▼"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {expandedHotels.has(hotelToggleKey) && (
                            <div className="overflow-x-auto border-t border-gray-100">
                              <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          თარიღი
                                        </th>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          გაგზავნის თარიღი
                                        </th>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          გაგზავნილი რაოდენობა
                                        </th>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          წონა (კგ)
                                        </th>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          დამცავები (₾)
                                        </th>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          სულ (₾)
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {hotelInvoices.map((inv, idx) => {
                                        const detail = inv.detail;
                                        const rowKey =
                                          (detail.emailSendIds && detail.emailSendIds[0]) ||
                                          `${displayName}-${detail.date}-${idx}`;

                                        return (
                                          <tr key={rowKey} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                              {formatDate(detail.date)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                              {detail.sentAt ? formatDate(detail.sentAt) : "-"}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                              {detail.emailSendCount}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                              {(detail.weightKg || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                              {(detail.protectorsAmount || 0).toFixed(2)} ₾
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black font-semibold">
                                              {(detail.totalAmount || 0).toFixed(2)} ₾
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {flatInvoices.length === 0 && (
        <div className="text-center py-8 text-black">
          მონაცემები არ მოიძებნა
        </div>
      )}

      {/* PDF Send Modal */}
      {pdfModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">PDF ინვოისის გაგზავნა</h3>
            <p className="text-gray-700 mb-4">
              სასტუმრო: <strong>{formatHotel(pdfModal.hotelName)}</strong>
            </p>
            <p className="text-[16px] text-gray-700 mb-4">
              ელფოსტა ავტომატურად გაიგზავნება სასტუმროს ელ.ფოსტაზე
              {modalEmail ? `: ${modalEmail}` : " (ელფოსტა არ მოიძებნა)"}
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={sendPdfInvoice}
                disabled={sendingPdf}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingPdf ? "იგზავნება..." : "გაგზავნა"}
              </button>
              <button
                onClick={closePdfModal}
                disabled={sendingPdf}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

