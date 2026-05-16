"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getApiPath } from "@/lib/api-helper";
import { FormattedDateInput } from "./ui/DatePickerSection";

interface Revenue {
  id: string;
  source: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
}

interface SentInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  /** სასტუმროს დასახელება (hotelName), თუ customerName შპს/სხვა ვარიანტია */
  displayHotelName?: string;
  totalAmount: number | null;
  amount: number;
  paidAmount: number | null;
  status: string;
  createdAt: string;
  // დღის ფურცლის თარიღი / სერვისის თარიღი (თუ არსებობს)
  dueDate?: string;
}

function invoiceHotelLabel(inv: SentInvoice): string {
  return inv.displayHotelName?.trim() || inv.customerName;
}

interface DedupeInvoiceBrief {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number | null;
  amount: number;
  paidAmount: number | null;
  status: string;
  createdAt: string;
  dueDate?: string;
}

interface DedupeGroupRow {
  table: string;
  fingerprint: string;
  kept: DedupeInvoiceBrief;
  removed: DedupeInvoiceBrief[];
}

interface DedupePreviewPayload {
  totalRemoved: number;
  groupCount: number;
  groups: DedupeGroupRow[];
}

/** წაშლის შემდეგ პრევიუდან ამოაგდებს id-ს; ცარიელი ჯგუფები იშლება. null = ყველა დუბლიკატი მორჩა. */
function applyRemoveIdFromDedupePreview(
  prev: DedupePreviewPayload,
  removedId: string
): DedupePreviewPayload | null {
  const nextGroups = prev.groups
    .map((g) => ({
      ...g,
      removed: g.removed.filter((r) => r.id !== removedId),
    }))
    .filter((g) => g.removed.length > 0);

  if (nextGroups.length === 0) return null;

  const totalRemoved = nextGroups.reduce((sum, g) => sum + g.removed.length, 0);
  return {
    groupCount: nextGroups.length,
    totalRemoved,
    groups: nextGroups,
  };
}

function formatDedupeDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ka-GE", { year: "numeric", month: "short", day: "numeric" });
}

function invoiceTableLabelGe(table: string): string {
  if (table === "legal") return "იურიდიული ინვოისი";
  if (table === "physical") return "ფიზიკური ინვოისი";
  if (table === "admin") return "ადმინის ინვოისი";
  return table;
}

const GEORGIAN_MONTH_NAMES = [
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
] as const;

function formatMonthYearGe(date: Date) {
  return GEORGIAN_MONTH_NAMES[date.getMonth()] ?? "";
}

function buildRevenueMonthOptions(selectedMonth: string) {
  const options: { value: string; label: string }[] = [];
  const seen = new Set<string>();

  const add = (year: number, monthIndex: number) => {
    const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    if (seen.has(value)) return;
    seen.add(value);
    const date = new Date(year, monthIndex, 1);
    options.push({
      value,
      label: `${formatMonthYearGe(date)} ${year}`,
    });
  };

  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    add(d.getFullYear(), d.getMonth());
  }

  if (/^\d{4}-\d{2}$/.test(selectedMonth) && !seen.has(selectedMonth)) {
    const [year, month] = selectedMonth.split("-").map(Number);
    if (year && month >= 1 && month <= 12) {
      add(year, month - 1);
    }
  }

  return options.sort((a, b) => b.value.localeCompare(a.value));
}



export default function RevenuesSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedMonth = searchParams.get("month") ?? "";

  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [sentInvoices, setSentInvoices] = useState<SentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Record<string, boolean>>({});
  const [hotelSearch, setHotelSearch] = useState<string>("");
  const [dedupeScanning, setDedupeScanning] = useState(false);
  const [dedupeDeleting, setDedupeDeleting] = useState(false);
  const [deletingDuplicateId, setDeletingDuplicateId] = useState<string | null>(null);
  const [dedupePreview, setDedupePreview] = useState<DedupePreviewPayload | null>(null);

  const monthFilterOptions = useMemo(
    () => buildRevenueMonthOptions(selectedMonth),
    [selectedMonth]
  );

  const setSelectedMonth = (month: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (month) {
      params.set("month", month);
    } else {
      params.delete("month");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [formData, setFormData] = useState({
    source: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchRevenues(selectedMonth || undefined);
  }, [selectedMonth]);

  useEffect(() => {
    if (!dedupePreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDedupePreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dedupePreview]);

  const fetchRevenues = async (month?: string) => {
    try {
      setLoading(true);
      setError("");
      const params = month
        ? `?view=monthly&month=${month}`
        : `?view=all`;
      const response = await fetch(`/api/admin/revenues${params}`);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "უცნობი შეცდომა" }));
        throw new Error(errorData.error || `HTTP ${response.status}: შემოსავლების ჩატვირთვა ვერ მოხერხდა`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error("არასწორი პასუხი სერვერიდან");
      }

      console.log("Revenues fetched:", {
        revenues: data.revenues?.length || 0,
        sentInvoices: data.sentInvoices?.length || 0,
        hasRevenues: Array.isArray(data.revenues),
        hasSentInvoices: Array.isArray(data.sentInvoices),
      });

      // Debug: Log revenue amounts
      if (data.revenues && data.revenues.length > 0) {
        console.log("Revenue details:", data.revenues.map((r: any) => ({
          id: r.id,
          amount: r.amount,
          description: r.description,
          date: r.date,
        })));
      } else {
        console.log("No revenues found. Check if:", {
          viewMode: month ? "monthly" : "all",
          month,
        });
      }

      // Debug: Log detailed invoice / "day sheet" level info
      if (data.sentInvoices && data.sentInvoices.length > 0) {
        console.log(
          "Invoice (day sheets) raw data:",
          data.sentInvoices
        );

        console.log(
          "Invoice (day sheets) details:",
          data.sentInvoices.map((inv: any, index: number) => ({
            // Local sequence number in this view (1, 2, 3, ...)
            sequence: index + 1,
            id: inv.id,
            // Actual DB invoice number (may start from >1 if ბაზაში უკვე არსებობდა ინვოისები)
            dbInvoiceNumber: inv.invoiceNumber,
            hotelName: inv.customerName,
            // Daily sheet / service date we use for revenues view
            // Equivalent to detail.date from /admin/invoices გვერდი
            serviceDate: inv.dueDate,
            createdAt: inv.createdAt,
            status: inv.status,
            amount: inv.amount,
            totalAmount: inv.totalAmount,
            paidAmount: inv.paidAmount,
          }))
        );

        // Additional debug: log only the service dates (detail.date equivalent)
        console.log(
          "detail.date (service dates) list:",
          data.sentInvoices.map((inv: any) => inv.dueDate)
        );
      } else {
        console.log(
          "No invoices (day sheets) found in date range. Total invoices in DB:",
          data.sentInvoices?.length || 0
        );
      }

      // Ensure we always set arrays, even if empty
      setRevenues(Array.isArray(data.revenues) ? data.revenues : []);
      setSentInvoices(Array.isArray(data.sentInvoices) ? data.sentInvoices : []);
      setSelectedInvoiceIds({});
    } catch (err) {
      console.error("Error fetching revenues:", err);
      const errorMessage = err instanceof Error ? err.message : "დაფიქსირდა შეცდომა";
      setError(errorMessage);
      // Reset to empty arrays on error
      setRevenues([]);
      setSentInvoices([]);
      setSelectedInvoiceIds({});
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/revenues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchRevenues();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) {
      return;
    }

    try {
      setError(""); // Clear previous errors
      const response = await fetch(`/api/admin/revenues/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "წაშლა ვერ მოხერხდა");
      }

      await fetchRevenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      source: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    });
    setShowAddForm(false);
    setIsSubmitting(false);
  };

  const handlePaymentUpdate = async (invoiceId: string) => {
    const paymentAmount = paymentAmounts[invoiceId];
    // Allow empty string (which means 0)
    const amount = paymentAmount === "" || !paymentAmount || paymentAmount.trim() === ""
      ? 0
      : parseFloat(paymentAmount);

    if (isNaN(amount) || amount < 0) {
      setError("არასწორი თანხა");
      return;
    }

    try {
      const apiPath = getApiPath("invoices");
      const response = await fetch(`${apiPath}/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paidAmount: amount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ჩარიცხვის განახლება ვერ მოხერხდა");
      }

      setEditingPayment(null);
      setPaymentAmounts({});
      await fetchRevenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const startEditingPayment = (invoiceId: string, currentPaidAmount: number | null) => {
    setEditingPayment(invoiceId);
    setPaymentAmounts({
      ...paymentAmounts,
      [invoiceId]: currentPaidAmount?.toString() || "0",
    });
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ ინვოისის წაშლა?")) {
      return;
    }

    try {
      const apiPath = getApiPath("invoices");
      const response = await fetch(`${apiPath}/${invoiceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "წაშლა ვერ მოხერხდა");
      }

      await fetchRevenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleDeleteAllInvoices = async () => {
    if (!confirm(`დარწმუნებული ხართ რომ გსურთ ყველა ინვოისის წაშლა? (სულ: ${sentInvoices.length})`)) {
      return;
    }

    try {
      setError(""); // Clear previous errors

      // Delete all invoices in parallel
      const apiPath = getApiPath("invoices");
      const deletePromises = sentInvoices.map(async (invoice) => {
        try {
          const response = await fetch(`${apiPath}/${invoice.id}`, {
            method: "DELETE",
          });
          const data = await response.json();
          if (!response.ok) {
            console.error(`Failed to delete invoice ${invoice.id}:`, data.error);
            return { success: false, id: invoice.id, error: data.error };
          }
          return { success: true, id: invoice.id };
        } catch (err) {
          console.error(`Error deleting invoice ${invoice.id}:`, err);
          return { success: false, id: invoice.id, error: err instanceof Error ? err.message : "უცნობი შეცდომა" };
        }
      });

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed > 0) {
        setError(`${successful} ინვოისი წაიშალა, ${failed} ინვოისის წაშლა ვერ მოხერხდა`);
      }

      await fetchRevenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const normalizedSearch = hotelSearch.trim().toLowerCase();
  const filteredSentInvoices = normalizedSearch
    ? sentInvoices.filter((inv) => {
        const label = invoiceHotelLabel(inv).toLowerCase();
        const raw = (inv.customerName || "").toLowerCase();
        return label.includes(normalizedSearch) || raw.includes(normalizedSearch);
      })
    : sentInvoices;

  const selectedInvoicesCount = Object.values(selectedInvoiceIds).filter(Boolean).length;
  const selectedInvoicesCountFiltered = filteredSentInvoices.filter(
    (inv) => !!selectedInvoiceIds[inv.id]
  ).length;

  const toggleSelectAllInvoices = () => {
    if (!filteredSentInvoices.length) return;
    const allSelected = filteredSentInvoices.every((inv) => selectedInvoiceIds[inv.id]);
    if (allSelected) {
      // Unselect only the currently visible (filtered) invoices
      setSelectedInvoiceIds((prev) => {
        const next = { ...prev };
        filteredSentInvoices.forEach((inv) => {
          delete next[inv.id];
        });
        return next;
      });
      return;
    }
    setSelectedInvoiceIds((prev) => {
      const next: Record<string, boolean> = { ...prev };
      filteredSentInvoices.forEach((inv) => {
        next[inv.id] = true;
      });
      return next;
    });
  };

  const toggleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) => ({
      ...prev,
      [invoiceId]: !prev[invoiceId],
    }));
  };

  const handleDeleteSelectedInvoices = async () => {
    const ids = sentInvoices.filter((inv) => selectedInvoiceIds[inv.id]).map((inv) => inv.id);
    if (ids.length === 0) return;

    if (!confirm(`დარწმუნებული ხართ რომ გსურთ მონიშნული ინვოისების წაშლა? (სულ: ${ids.length})`)) {
      return;
    }

    try {
      setError("");
      const apiPath = getApiPath("invoices");
      const deletePromises = ids.map(async (id) => {
        try {
          const response = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            return { success: false, id, error: (data as any)?.error || `HTTP ${response.status}` };
          }
          return { success: true, id };
        } catch (err) {
          return {
            success: false,
            id,
            error: err instanceof Error ? err.message : "უცნობი შეცდომა",
          };
        }
      });

      const results = await Promise.all(deletePromises);
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (failed > 0) {
        setError(`${successful} ინვოისი წაიშალა, ${failed} ინვოისის წაშლა ვერ მოხერხდა`);
      }

      await fetchRevenues(selectedMonth || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleConfirmInvoice = async (invoiceId: string) => {
    // Find the specific invoice by ID to ensure we're working with the correct one
    const invoice = sentInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      setError("ინვოისი ვერ მოიძებნა");
      return;
    }

    // Ensure we have numbers, not strings or null
    const totalAmount = Number(invoice.amount ?? 0);
    const paidAmount = Number(invoice.paidAmount ?? 0);
    const remaining = totalAmount - paidAmount;
    // Use the same logic as in render: allow small epsilon for floating point comparison
    // Also check if remaining is <= 0 as an additional check
    const isFullyPaid = totalAmount > 0 && (paidAmount >= totalAmount || Math.abs(paidAmount - totalAmount) < 0.01 || remaining <= 0);

    // Only allow confirmation if invoice is fully paid
    if (!isFullyPaid) {
      setError(`ინვოისის დადასტურება შეუძლებელია. გადახდილი: ${paidAmount.toFixed(2)} ₾, სულ: ${totalAmount.toFixed(2)} ₾, დარჩენილი: ${remaining.toFixed(2)} ₾`);
      return;
    }

    // Show detailed confirmation message with invoice details
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("ka-GE");
    const invoiceNumber = invoice.invoiceNumber || "N/A";
    const confirmMessage = `დარწმუნებული ხართ რომ ინვოისი სრულად ჩაირიცხა?\n\nინვოისის ნომერი: ${invoiceNumber}\nსასტუმრო: ${invoiceHotelLabel(invoice)}\nთარიღი: ${invoiceDate}\nთანხა: ${totalAmount.toFixed(2)} ₾\nგადახდილი: ${paidAmount.toFixed(2)} ₾\n\nამის შემდეგ ფასის შეცვლა ვეღარ შეიძლება.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Use the specific invoice ID to update only this invoice
      // This ensures that even if multiple invoices have the same customerName,
      // only the specific invoice with this ID will be updated
      const apiPath = getApiPath("invoices");
      const response = await fetch(`${apiPath}/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "PAID",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "დასტური ვერ მოხერხდა");
      }

      // Refresh the list to show updated status for all invoices
      await fetchRevenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const loadDedupePreview = async () => {
    setError("");
    setDedupeScanning(true);
    try {
      const res = await fetch("/api/admin/revenues/deduplicate-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "ვერ მოხერხდა შემოწმება");
      }
      const total = (data as { totalRemoved?: number }).totalRemoved ?? 0;
      if (total === 0) {
        alert("მსგავსი (დუბლიკატი) ინვოისები ბაზაში არ მოიძებნა.");
        return;
      }
      const groups: DedupeGroupRow[] = [
        ...((data as { admin?: { groups: DedupeGroupRow[] } }).admin?.groups ?? []),
        ...((data as { legal?: { groups: DedupeGroupRow[] } }).legal?.groups ?? []),
        ...((data as { physical?: { groups: DedupeGroupRow[] } }).physical?.groups ?? []),
      ];
      setDedupePreview({
        totalRemoved: total,
        groupCount: (data as { groupCount?: number }).groupCount ?? groups.length,
        groups,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setDedupeScanning(false);
    }
  };

  const closeDedupePreview = () => {
    setDedupePreview(null);
  };

  const confirmDedupeDeleteFromDb = async () => {
    if (!dedupePreview || dedupePreview.totalRemoved === 0) return;
    setError("");
    setDedupeDeleting(true);
    try {
      const res2 = await fetch("/api/admin/revenues/deduplicate-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok) {
        throw new Error((data2 as { error?: string }).error || "წაშლა ვერ მოხერხდა");
      }
      setDedupePreview(null);
      await fetchRevenues(selectedMonth || undefined);
      alert(`წაიშალა ${(data2 as { totalRemoved?: number }).totalRemoved ?? 0} დუბლიკატი ჩანაწერი ბაზიდან.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setDedupeDeleting(false);
    }
  };

  const deleteSingleDuplicateFromModal = async (invoiceId: string) => {
    if (!dedupePreview) return;
    if (!confirm("წავშალო ეს დუბლიკატი ჩანაწერი ბაზიდან?")) return;
    setDeletingDuplicateId(invoiceId);
    setError("");
    try {
      const apiPath = getApiPath("invoices");
      const res = await fetch(`${apiPath}/${invoiceId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "წაშლა ვერ მოხერხდა");
      }
      setDedupePreview((prev) => {
        if (!prev) return null;
        return applyRemoveIdFromDedupePreview(prev, invoiceId);
      });
      await fetchRevenues(selectedMonth || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setDeletingDuplicateId(null);
    }
  };

  const dedupeModalBusy = dedupeDeleting || deletingDuplicateId !== null;

  const totalRevenueAmount = revenues.reduce((sum, r) => sum + r.amount, 0);
  // Sum by invoice amounts (ბილინგის მიხედვით), არა დღის ფურცლების გაგზავნის მიხედვით
  const totalInvoiceAmount = sentInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount ?? inv.amount ?? 0),
    0
  );
  const totalAmount = totalRevenueAmount;

  // Debug: Log calculation breakdown
  console.log("Total calculation:", {
    revenueCount: revenues.length,
    totalRevenueAmount,
    invoiceCount: sentInvoices.length,
    totalInvoiceAmount,
    totalAmount,
  });

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center justify-between md:justify-start gap-4">
          <h2 className="text-xl font-bold text-black">შემოსავლები</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + დამატება
          </button>
        </div>

        {/* Month filter */}
        <div className="flex items-center gap-2">
          <label className="text-[16px] md:text-[18px] font-medium text-black whitespace-nowrap">
            თვე:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-black bg-white min-w-[180px]"
          >
            <option value="">ყველა თვე</option>
            {monthFilterOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-lg font-bold text-black">
          {/* ჯამი მხოლოდ ინვოისების მიხედვით (ხელით შემოსავალი არ ემატებაში) */}
          სულ ინვოისები: {totalInvoiceAmount.toFixed(2)} ₾ ({sentInvoices.length} ინვოისი)
        </div>
        <button
          type="button"
          onClick={loadDedupePreview}
          disabled={dedupeScanning}
          title="ჯერ აჩვენებს დუბლიკატების სიას; წაშლა ცალკე დაადასტურებთ ფანჯარაში"
          className={`whitespace-nowrap px-4 py-2 rounded-lg text-[15px] font-medium ${
            dedupeScanning
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-amber-600 text-white hover:bg-amber-700"
          }`}
        >
          {dedupeScanning ? "იტვირთება..." : "დუბლიკატების ნახვა / წაშლა"}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">ახალი შემოსავალი</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                წყარო *
              </label>
              <select
                required
                disabled={isSubmitting}
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-black ${isSubmitting ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
              >
                <option value="">აირჩიეთ</option>
                <option value="SERVICE">სერვისი</option>
                <option value="INVOICE">ინვოისი</option>
                <option value="OTHER">სხვა</option>
              </select>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                აღწერა *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-black ${isSubmitting ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                თანხა *
              </label>
              <input
                type="number"
                step="0.01"
                required
                disabled={isSubmitting}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-black ${isSubmitting ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                თარიღი *
              </label>
              <FormattedDateInput
                value={formData.date}
                required
                disabled={isSubmitting}
                onChange={(date) => setFormData({ ...formData, date })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md text-black ${
                  isSubmitting ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg ${isSubmitting
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
              >
                {isSubmitting ? "იტვირთება..." : "დამატება"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg ${isSubmitting
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-300 text-black hover:bg-gray-400"
                  }`}
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}




      {/* Sent Invoices Section */}
      {sentInvoices.length > 0 ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-black">გაგზავნილი ინვოისები</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelectedInvoices}
                disabled={selectedInvoicesCount === 0}
                className={`px-4 py-2 rounded-lg text-[16px] ${
                  selectedInvoicesCount === 0
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
                title={selectedInvoicesCount === 0 ? "მონიშნეთ მინიმუმ 1 ინვოისი" : undefined}
              >
                წაშლა მონიშნულები {selectedInvoicesCount > 0 ? `(${selectedInvoicesCount})` : ""}
              </button>
              <button
                onClick={handleDeleteAllInvoices}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-[16px]"
              >
                წაშლა ყველას
              </button>
            </div>
          </div>
          <div className="mb-3 flex flex-col md:flex-row md:items-center gap-2">
            <label className="text-[16px] md:text-[18px] font-medium text-black whitespace-nowrap">
              ძებნა სასტუმროთი:
            </label>
            <input
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              placeholder="მაგ: შარდენ ვილა"
              className="w-full md:w-[360px] px-3 py-2 border border-gray-300 rounded-md text-black bg-white"
            />
            {normalizedSearch && (
              <div className="text-[14px] text-gray-600">
                ნაპოვნია: {filteredSentInvoices.length}
                {selectedInvoicesCountFiltered > 0 ? `, მონიშნულია (ფილტრში): ${selectedInvoicesCountFiltered}` : ""}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider w-[60px]">
                    <input
                      type="checkbox"
                      checked={
                        filteredSentInvoices.length > 0 &&
                        filteredSentInvoices.every((inv) => !!selectedInvoiceIds[inv.id])
                      }
                      onChange={toggleSelectAllInvoices}
                      aria-label="ყველას მონიშვნა"
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    თარიღი
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider max-w-[14rem] md:max-w-[18rem]">
                    სასტუმროს სახელი
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    ჯამი
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    ჩაირიცხა
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    მოქმედებები
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSentInvoices.map((invoice) => {
                  // Ensure we have numbers, not strings or null
                  const totalAmount = Number(invoice.totalAmount ?? invoice.amount ?? 0);
                  const paidAmount = Number(invoice.paidAmount ?? 0);
                  const remaining = totalAmount - paidAmount;
                  const isEditing = editingPayment === invoice.id;
                  const isPaid = invoice.status === "PAID";
                  // Use a small epsilon for floating point comparison to avoid precision issues
                  // Also check if remaining is <= 0 as an additional check
                  const isFullyPaid = totalAmount > 0 && (paidAmount >= totalAmount || Math.abs(paidAmount - totalAmount) < 0.01 || remaining <= 0);
                  // Only allow confirmation if invoice is fully paid and not already confirmed
                  const canConfirm = !isPaid && isFullyPaid;

                  const serviceDate = new Date(invoice.dueDate ?? invoice.createdAt);
                  const monthYear = formatMonthYearGe(serviceDate);

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                        <input
                          type="checkbox"
                          checked={!!selectedInvoiceIds[invoice.id]}
                          onChange={() => toggleSelectInvoice(invoice.id)}
                          aria-label="ინვოისის მონიშვნა"
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                        {monthYear}
                      </td>
                      <td className="px-6 py-4 text-[16px] md:text-[18px] text-black font-semibold max-w-[14rem] md:max-w-[18rem] align-top leading-snug break-words [overflow-wrap:anywhere]">
                        {invoiceHotelLabel(invoice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-bold">
                        {totalAmount.toFixed(2)} ₾
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isPaid}
                            value={
                              isEditing
                                ? paymentAmounts[invoice.id] || ""
                                : paidAmount > 0
                                  ? paidAmount.toFixed(2)
                                  : ""
                            }
                            onChange={(e) => {
                              if (isPaid) return;
                              if (!isEditing) {
                                startEditingPayment(invoice.id, invoice.paidAmount);
                              }
                              setPaymentAmounts({
                                ...paymentAmounts,
                                [invoice.id]: e.target.value,
                              });
                            }}
                            onBlur={() => {
                              if (isPaid) return;
                              // Auto-save on blur if value changed
                              if (isEditing) {
                                const inputValue = paymentAmounts[invoice.id] || "";
                                const newValue = inputValue === "" ? 0 : parseFloat(inputValue);
                                if (newValue !== paidAmount) {
                                  handlePaymentUpdate(invoice.id);
                                } else {
                                  setEditingPayment(null);
                                  setPaymentAmounts({});
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (isPaid) return;
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (isEditing) {
                                  handlePaymentUpdate(invoice.id);
                                } else {
                                  startEditingPayment(invoice.id, invoice.paidAmount);
                                }
                              } else if (e.key === "Escape") {
                                setEditingPayment(null);
                                setPaymentAmounts({});
                              }
                            }}
                            onClick={() => {
                              if (isPaid) return;
                              if (!isEditing) {
                                startEditingPayment(invoice.id, invoice.paidAmount);
                              }
                            }}
                            className={`w-28 px-2 py-1 border border-gray-300 rounded-md text-[16px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${isPaid
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "text-black"
                              }`}
                            placeholder="0.00"
                          />
                          <span className="text-[16px] text-black">₾</span>
                          {isEditing && (
                            <button
                              onClick={() => handlePaymentUpdate(invoice.id)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                              title="შენახვა (Enter)"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                        {!isEditing && remaining > 0 && !isPaid && (
                          <div className="text-[16px] text-red-600 mt-1">
                            დარჩენილი: {remaining.toFixed(2)} ₾
                          </div>
                        )}
                        {isPaid && (
                          <div className="text-[16px] text-green-600 font-semibold mt-1">
                            ✓ დადასტურებული
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                        <div className="flex items-center space-x-3">
                          {isEditing && (
                            <button
                              onClick={() => {
                                setEditingPayment(null);
                                setPaymentAmounts({});
                              }}
                              className="text-red-600 hover:underline text-sm"
                              title="გაუქმება (Esc)"
                            >
                              გაუქმება
                            </button>
                          )}
                          {!isEditing && canConfirm && (
                            <button
                              onClick={() => handleConfirmInvoice(invoice.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-semibold"
                              title="დადასტურება (მხოლოდ სრულად გადახდილი ინვოისებისთვის)"
                            >
                              დასტური
                            </button>
                          )}
                          {!isEditing && !isPaid && !isFullyPaid && (
                            <span className="text-[14px] text-gray-500 italic" title="დადასტურება შესაძლებელია მხოლოდ სრულად გადახდილი ინვოისებისთვის">
                              დარჩენილი: {remaining.toFixed(2)} ₾
                            </span>
                          )}
                          {!isEditing && (
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:underline text-[18px] md:text-[20px]"
                            >
                              წაშლა
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-black">
          გაგზავნილი ინვოისები არ მოიძებნა
        </div>
      )}

      {dedupePreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/50"
          onClick={closeDedupePreview}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-black border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-black">დუბლიკატები (წაშლამდე)</h3>
                <p className="text-[14px] text-gray-600 mt-1">
                  ჯგუფი: {dedupePreview.groupCount} · წასაშლელი ჩანაწერი: {dedupePreview.totalRemoved}. თითო ჯგუფში
                  რჩება უმაღლესი გადახდით ან უახლესი ინვოისი. ცალკე წაშლა — ხაზზე „წაშლა“; დარჩენილების ერთად
                  წაშლა — ქვედა „წაშლა ყველა დარჩენილი“.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDedupePreview}
                className="shrink-0 text-gray-500 hover:text-black text-2xl leading-none px-2"
                aria-label="დახურვა"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-3 sm:px-5 space-y-5">
              {dedupePreview.groups.map((g, idx) => (
                <div key={`${g.table}-${g.fingerprint}-${idx}`} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-[13px] text-gray-700 break-all">
                    <span className="font-semibold text-black">{invoiceTableLabelGe(g.table)}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    {g.fingerprint}
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="text-sm font-semibold text-green-800 mb-1">დარჩება (ბაზაში)</div>
                      <table className="min-w-full text-[14px] border border-green-200 rounded-md overflow-hidden">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium">№</th>
                            <th className="text-left px-2 py-1.5 font-medium">სასტუმრო</th>
                            <th className="text-right px-2 py-1.5 font-medium">ჯამი</th>
                            <th className="text-right px-2 py-1.5 font-medium">გადახდილი</th>
                            <th className="text-left px-2 py-1.5 font-medium">სერვისის თარიღი</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-2 py-1.5 font-mono">{g.kept.invoiceNumber}</td>
                            <td className="px-2 py-1.5 max-w-[200px] break-words">{g.kept.customerName}</td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">
                              {Number(g.kept.totalAmount ?? g.kept.amount ?? 0).toFixed(2)} ₾
                            </td>
                            <td className="px-2 py-1.5 text-right whitespace-nowrap">
                              {Number(g.kept.paidAmount ?? 0).toFixed(2)} ₾
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">{formatDedupeDate(g.kept.dueDate)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-red-800 mb-1">წაიშლება ({g.removed.length})</div>
                      <table className="min-w-full text-[14px] border border-red-200 rounded-md overflow-hidden">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="text-left px-2 py-1.5 font-medium">№</th>
                            <th className="text-left px-2 py-1.5 font-medium">სასტუმრო</th>
                            <th className="text-right px-2 py-1.5 font-medium">ჯამი</th>
                            <th className="text-right px-2 py-1.5 font-medium">გადახდილი</th>
                            <th className="text-left px-2 py-1.5 font-medium">შექმნის თარიღი</th>
                            <th className="text-right px-2 py-1.5 font-medium w-[100px]">მოქმედება</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.removed.map((r) => (
                            <tr key={r.id} className="bg-white border-t border-red-100">
                              <td className="px-2 py-1.5 font-mono">{r.invoiceNumber}</td>
                              <td className="px-2 py-1.5 max-w-[200px] break-words">{r.customerName}</td>
                              <td className="px-2 py-1.5 text-right whitespace-nowrap">
                                {Number(r.totalAmount ?? r.amount ?? 0).toFixed(2)} ₾
                              </td>
                              <td className="px-2 py-1.5 text-right whitespace-nowrap">
                                {Number(r.paidAmount ?? 0).toFixed(2)} ₾
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">{formatDedupeDate(r.createdAt)}</td>
                              <td className="px-2 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => deleteSingleDuplicateFromModal(r.id)}
                                  disabled={dedupeModalBusy}
                                  className={`text-sm font-medium ${
                                    dedupeModalBusy
                                      ? "text-gray-400 cursor-not-allowed"
                                      : "text-red-600 hover:underline"
                                  }`}
                                >
                                  {deletingDuplicateId === r.id ? "..." : "წაშლა"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 px-4 py-3 sm:px-5 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeDedupePreview}
                className="px-4 py-2 rounded-lg border border-gray-300 text-black hover:bg-gray-100 text-[15px] font-medium"
              >
                დახურვა
              </button>
              <button
                type="button"
                onClick={confirmDedupeDeleteFromDb}
                disabled={dedupeModalBusy || dedupePreview.totalRemoved === 0}
                className={`px-4 py-2 rounded-lg text-[15px] font-medium text-white ${
                  dedupeModalBusy || dedupePreview.totalRemoved === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {dedupeDeleting ? "იშლება..." : "წაშლა ყველა დარჩენილი"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

