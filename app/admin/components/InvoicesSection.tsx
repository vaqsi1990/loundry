"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  heavyWeightAmount?: number;
  totalAmount: number;
  sentAt: string | null;
  invoicePdfSentAt?: string | null;
  invoicePdfSentTo?: string | null;
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

/** Service-date month keys (YYYY-MM) and row counts — keeps the filter list when the API returns one month only. */
function buildMonthOptionsFromSummaries(summaries: InvoiceDaySummary[]) {
  const counts = new Map<string, number>();
  for (const summary of summaries) {
    for (const detail of summary.dateDetails || []) {
      const d = detail.date;
      if (typeof d !== "string" || d.length < 7) continue;
      const monthKey = d.slice(0, 7);
      counts.set(monthKey, (counts.get(monthKey) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, count]) => ({ month, count }));
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
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // Empty = all months
  const [monthDropdownSnapshot, setMonthDropdownSnapshot] = useState<
    Array<{ month: string; count: number }>
  >([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set());
  const [forceResend, setForceResend] = useState(true);

  const [editModal, setEditModal] = useState<{
    open: boolean;
    emailSendId: string | null;
    values: {
      pricePerKg: string;
      totalWeight: string;
      totalPrice: string;
      heavyWeight: string;
      heavyPricePerKg: string;
      totalAmount: string;
    };
  }>({
    open: false,
    emailSendId: null,
    values: {
      pricePerKg: "",
      totalWeight: "",
      totalPrice: "",
      heavyWeight: "",
      heavyPricePerKg: "",
      totalAmount: "",
    },
  });

  const [savingEdit, setSavingEdit] = useState(false);

  const derivedMonthChoices = useMemo(
    () => buildMonthOptionsFromSummaries(summaries),
    [summaries]
  );

  useEffect(() => {
    if (selectedMonth !== "") return;
    setMonthDropdownSnapshot(derivedMonthChoices);
  }, [selectedMonth, derivedMonthChoices]);

  const monthOptionsForSelect = useMemo(() => {
    if (selectedMonth === "" || monthDropdownSnapshot.length === 0) {
      return derivedMonthChoices;
    }
    const liveByMonth = new Map(derivedMonthChoices.map((m) => [m.month, m.count]));
    return monthDropdownSnapshot.map((m) => {
      const live = liveByMonth.get(m.month);
      return live !== undefined ? { ...m, count: live } : m;
    });
  }, [selectedMonth, monthDropdownSnapshot, derivedMonthChoices]);

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
      const cacheBust = `_t=${Date.now()}`;
      const url = selectedMonth
        ? `${apiPath}?emailSendsMonth=${selectedMonth}&${cacheBust}`
        : `${apiPath}?${cacheBust}`;
      const response = await fetch(url, { cache: "no-store" });
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

      const fetchPage = async (page: number, limit: number) => {
        const url = new URL(apiPath, window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", String(limit));
      const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) {
          throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
        }
        return res.json() as Promise<unknown>;
      };

      // our-hotels GET returns { items, totalPages, ... } (not a bare array).
      const first = await fetchPage(1, 50);
      const firstItems = Array.isArray(first)
        ? first
        : typeof first === "object" &&
            first !== null &&
            Array.isArray((first as { items?: unknown }).items)
          ? (first as { items: unknown[] }).items
          : [];

      const totalPages =
        typeof first === "object" &&
        first !== null &&
        typeof (first as { totalPages?: unknown }).totalPages === "number"
          ? Math.max(1, (first as { totalPages: number }).totalPages)
          : 1;

      const rest: unknown[] = [];
      for (let page = 2; page <= totalPages; page += 1) {
        const next = await fetchPage(page, 50);
        const nextItems = Array.isArray(next)
          ? next
          : typeof next === "object" &&
              next !== null &&
              Array.isArray((next as { items?: unknown }).items)
            ? (next as { items: unknown[] }).items
            : [];
        rest.push(...nextItems);
      }

      const raw = [...firstItems, ...rest];
      setHotels(
        raw.map((h: unknown) => {
          const row = h as {
            id?: unknown;
            hotelName?: unknown;
            email?: unknown;
            hotelEmail?: unknown;
          };
          const fromRow =
            typeof row.email === "string" && row.email.trim() !== ""
              ? row.email.trim()
              : typeof row.hotelEmail === "string" && row.hotelEmail.trim() !== ""
                ? row.hotelEmail.trim()
                : "";
          return {
            id: String(row.id ?? ""),
            hotelName: String(row.hotelName ?? "").trim(),
            email: fromRow || undefined,
          };
        })
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
    const anyAlreadySent = (dateDetails || []).some((d) => !!d.invoicePdfSentAt);
    setForceResend(anyAlreadySent);
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
    setForceResend(true);
  };

  const openEditModal = async (emailSendId: string) => {
    setError("");
    setSuccessMessage("");
    setEditModal((m) => ({ ...m, open: true, emailSendId }));
    try {
      const apiPath = getApiPath("invoices", `email-send/${emailSendId}`);
      const res = await fetch(apiPath, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ინვოისის მონაცემები ვერ მოიძებნა");
      const ds = (data?.dailySheet || {}) as Record<string, unknown>;
      const ov = (data?.overrides || {}) as Record<string, unknown>;
      setEditModal((m) => ({
        ...m,
        open: true,
        emailSendId,
        values: {
          pricePerKg: ds.pricePerKg == null ? "" : String(ds.pricePerKg),
          totalWeight: ds.totalWeight == null ? "" : String(ds.totalWeight),
          totalPrice: ds.totalPrice == null ? "" : String(ds.totalPrice),
          heavyWeight: ds.heavyWeight == null ? "" : String(ds.heavyWeight),
          heavyPricePerKg: ds.heavyPricePerKg == null ? "" : String(ds.heavyPricePerKg),
          totalAmount: ov.totalAmount == null ? "" : String(ov.totalAmount),
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const closeEditModal = () => {
    setEditModal((m) => ({ ...m, open: false, emailSendId: null }));
  };

  const saveInvoiceEdit = async () => {
    if (!editModal.emailSendId) return;
    if (savingEdit) return;
    setSavingEdit(true);
    setError("");
    setSuccessMessage("");
    try {
      const apiPath = getApiPath("invoices", `email-send/${editModal.emailSendId}`);
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricePerKg: editModal.values.pricePerKg,
          totalWeight: editModal.values.totalWeight,
          totalPrice: editModal.values.totalPrice,
          heavyWeight: editModal.values.heavyWeight,
          heavyPricePerKg: editModal.values.heavyPricePerKg,
          totalAmount: editModal.values.totalAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "შენახვა ვერ მოხერხდა");
      setSuccessMessage("ინვოისი დარედაქტირდა");
      setTimeout(() => setSuccessMessage(""), 5000);
      closeEditModal();
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSavingEdit(false);
    }
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
        forceResend?: boolean;
        // Explicitly pass service dates (daily sheet dates) for debugging / clarity
        serviceDates?: string[];
      } = {
        hotelName: pdfModal.hotelName,
        dateDetails: pdfModal.dateDetails, // Send specific invoices to include
        email: modalEmail, // Include email if available
        forceResend,
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
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSendingPdf(false);
    }
  };

  const previewPdfInvoice = async () => {
    if (!pdfModal.hotelName) {
      setError("სასტუმროს სახელი არ არის მითითებული");
      return;
    }
    const ids =
      pdfModal.dateDetails
        ?.flatMap((d) => d.emailSendIds || [])
        .filter((id): id is string => typeof id === "string" && id.trim() !== "") || [];

    if (ids.length === 0) {
      setError("ინვოისის ID-ები არ მოიძებნა");
      return;
    }

    if (previewingPdf) return;
    setPreviewingPdf(true);
    setError("");

    try {
      const apiPath = getApiPath("invoices", "send-pdf");
      const url = new URL(apiPath, window.location.origin);
      url.searchParams.set("hotelName", pdfModal.hotelName);
      url.searchParams.set("ids", ids.join(","));
      url.searchParams.set("_t", String(Date.now()));
      // Open directly so browser shows inline PDF with auth cookies
      window.open(url.toString(), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setPreviewingPdf(false);
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

  // When a month is selected, derive totals from the same detail rows as the table (monthKey = service date).
  // This keeps ფურცლები / წონა / თანხა / გაგზავნები aligned with expanded rows even if API aggregates ever diverge.
  const monthFilteredRows =
    selectedMonth !== ""
      ? invoicesByMonth[selectedMonth] ??
        flatInvoices.filter((inv) => inv.monthKey === selectedMonth)
      : null;

  const totalWeight =
    monthFilteredRows !== null
      ? monthFilteredRows.reduce((sum, r) => sum + (r.detail.weightKg || 0), 0)
      : summaries.reduce((sum, d) => sum + (d.totalWeightKg || 0), 0);
  const totalProtectors =
    monthFilteredRows !== null
      ? monthFilteredRows.reduce((sum, r) => sum + (r.detail.protectorsAmount || 0), 0)
      : summaries.reduce((sum, d) => sum + (d.protectorsAmount || 0), 0);
  const totalAmount =
    monthFilteredRows !== null
      ? monthFilteredRows.reduce((sum, r) => sum + (r.detail.totalAmount || 0), 0)
      : summaries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalDispatched = summaries.reduce((sum, d) => sum + (d.totalDispatched || 0), 0);
  const totalSheets =
    monthFilteredRows !== null
      ? monthFilteredRows.length
      : summaries.reduce((sum, d) => sum + (d.sheetCount || 0), 0);
  const totalEmailSendCount =
    monthFilteredRows !== null
      ? monthFilteredRows.reduce((sum, r) => sum + (r.detail.emailSendCount || 0), 0)
      : summaries.reduce((sum, d) => sum + (d.totalEmailSendCount || 0), 0);

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
            {monthOptionsForSelect.map((month) => (
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
                      const totalHotelHeavyWeight = hotelInvoices.reduce(
                        (sum, inv) => sum + (inv.detail.heavyWeightAmount || 0),
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
                            <div className="grid items-center gap-x-3 gap-y-1 min-w-0 tabular-nums grid-cols-[minmax(120px,1fr)_90px_110px_120px_140px_170px] md:grid-cols-[260px_90px_110px_120px_150px_180px]">
                              <span className="text-[14px] md:text-[18px] font-semibold text-black truncate min-w-0">
                                {displayName}
                              </span>
                              <span className="text-[16px] md:text-[18px] text-black whitespace-nowrap">
                                {hotelInvoices.length} ინვოისი
                              </span>
                              <span className="text-[16px] md:text-[18px] text-black whitespace-nowrap text-right">
                                {totalHotelWeight.toFixed(2)} კგ
                              </span>
                              <span className="text-[16px] md:text-[18px] text-black whitespace-nowrap text-right">
                                მძიმე {totalHotelHeavyWeight.toFixed(2)} ₾
                              </span>
                              <span className="text-[16px] md:text-[18px] text-black whitespace-nowrap text-right">
                                {totalHotelAmount.toFixed(2)} ₾
                              </span>
                              <span className="text-[16px] md:text-[18px] text-black whitespace-nowrap text-right">
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
                                  გაგზავნა / Resend
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
                                          მძიმე (₾)
                                        </th>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          სულ (₾)
                                        </th>
                                        <th className="px-4 py-3 text-left text-[14px] md:text-[16px] font-medium text-black uppercase tracking-wider">
                                          რედაქტირება
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {hotelInvoices.map((inv, idx) => {
                                        const detail = inv.detail;
                                        const rowKey =
                                          (detail.emailSendIds && detail.emailSendIds[0]) ||
                                          `${displayName}-${detail.date}-${idx}`;
                                        const emailSendId = detail.emailSendIds?.[0];

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
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                              {(detail.heavyWeightAmount || 0).toFixed(2)} ₾
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black font-semibold">
                                              {(detail.totalAmount || 0).toFixed(2)} ₾
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!emailSendId) return;
                                                    openEditModal(emailSendId);
                                                  }}
                                                  disabled={!emailSendId}
                                                  className="bg-gray-100 text-gray-900 px-3 py-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                  Edit
                                                </button>
                                              </div>
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
            {(pdfModal.dateDetails || []).some((d) => !!d.invoicePdfSentAt) && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                ეს ინვოისი ადრე უკვე გაგზავნილია.
                <label className="flex items-center gap-2 mt-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={forceResend}
                    onChange={(e) => setForceResend(e.target.checked)}
                  />
                  forceResend (ხელახალი გაგზავნა)
                </label>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={previewPdfInvoice}
                disabled={sendingPdf || previewingPdf}
                className="flex-1 bg-white border border-gray-300 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {previewingPdf ? "იღება..." : "PDF წინასწარი ნახვა"}
              </button>
              <button
                onClick={sendPdfInvoice}
                disabled={sendingPdf}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingPdf ? "იგზავნება..." : "გაგზავნა"}
              </button>
              <button
                onClick={closePdfModal}
                disabled={sendingPdf || previewingPdf}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-4">ინვოისის დარედაქტირება</h3>
            <p className="text-gray-700 mb-4 text-sm">
              ცვლილება ინახება ფურცელზე და აისახება PDF-ზე. შემდეგ გამოიყენეთ “Resend”.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">სულ (₾) — ხელით</label>
                <input
                  value={editModal.values.totalAmount}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      values: { ...m.values, totalAmount: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="თუ შეავსებ, ამ თანხას გამოიყენებს ჯამებში"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">კგ-ის ფასი (₾)</label>
                <input
                  value={editModal.values.pricePerKg}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      values: { ...m.values, pricePerKg: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="მაგ: 1.8"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">სულ წონა (კგ)</label>
                <input
                  value={editModal.values.totalWeight}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      values: { ...m.values, totalWeight: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="ცარიელი = ავტომატური"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">დამცავები (₾)</label>
                <input
                  value={editModal.values.totalPrice}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      values: { ...m.values, totalPrice: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="STANDARD ფურცელზე"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">მძიმე წონა (კგ)</label>
                <input
                  value={editModal.values.heavyWeight}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      values: { ...m.values, heavyWeight: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="0 ან ცარიელი"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">მძიმე წონა - კგ-ის ფასი (₾)</label>
                <input
                  value={editModal.values.heavyPricePerKg}
                  onChange={(e) =>
                    setEditModal((m) => ({
                      ...m,
                      values: { ...m.values, heavyPricePerKg: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                  placeholder="მაგ: 3"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveInvoiceEdit}
                disabled={savingEdit}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEdit ? "ინახება..." : "შენახვა"}
              </button>
              <button
                onClick={closeEditModal}
                disabled={savingEdit}
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

