"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import React from "react";

interface InvoiceMonth {
  month: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  isPaid?: boolean;
  confirmedAt?: string | null;
  invoices: Array<{
    date: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    status: string;
    sentAt: string | null;
    weightKg: number;
    protectorsAmount: number;
    emailSendCount: number;
    confirmedAt: string | null;
    emailSendIds: string[]; // IDs of emailSends that belong to this invoice detail
  }>;
}

export default function PhysicalInvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceMonth[]>([]);
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.id) {
      fetchInvoices();
    }
  }, [status, session, router, selectedInvoiceMonth]);

  const fetchInvoices = async () => {
    try {
      let url = "/api/physical/invoices";
      if (selectedInvoiceMonth) {
        url += `?month=${selectedInvoiceMonth}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("ინვოისების ჩატვირთვა ვერ მოხერხდა");
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };


  const formatMonthGe = (monthKey: string) => {
    const [year, monthNum] = monthKey.split("-");
    const months = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
    ];
    const monthIndex = parseInt(monthNum) - 1;
    return `${months[monthIndex]} ${year}`;
  };

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

  const toggleRow = (month: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedRows(newExpanded);
  };

  const confirmInvoiceMonth = async (month: string, uniqueKey?: string) => {
    // Check if invoice is already confirmed
    // If uniqueKey is provided, find by uniqueKey, otherwise find by month (for backward compatibility)
    const invoice = uniqueKey 
      ? invoices.find((inv, idx) => {
          const firstInvoiceDate = inv.invoices && inv.invoices.length > 0 ? inv.invoices[0].date : '';
          const invUniqueKey = `${inv.month}-${inv.totalAmount.toFixed(2)}-${firstInvoiceDate}-${idx}`;
          return invUniqueKey === uniqueKey;
        })
      : invoices.find((inv) => inv.month === month);
    
    if (invoice?.confirmedAt) {
      alert("ინვოისი უკვე დადასტურებულია");
      return;
    }

    // Collect all emailSendIds from all invoices in this invoice group
    const allEmailSendIds: string[] = [];
    if (invoice?.invoices) {
      invoice.invoices.forEach((inv) => {
        if (inv.emailSendIds && Array.isArray(inv.emailSendIds)) {
          allEmailSendIds.push(...inv.emailSendIds);
        }
      });
    }

    if (allEmailSendIds.length === 0) {
      alert("ინვოისის ID-ები არ მოიძებნა");
      return;
    }

    try {
      // Use the individual confirm endpoint with all emailSendIds from this invoice group
      // This ensures only this specific invoice group is confirmed, not all invoices for the month
      const response = await fetch(`/api/physical/invoices/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailSendIds: allEmailSendIds,
          month: invoice?.month || month,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Show the actual error message from API if available
        const errorMessage = data.error || "დადასტურება ვერ მოხერხდა";
        alert(errorMessage);
        return;
      }
      
      await fetchInvoices();
      alert("ინვოისი წარმატებით დაადასტურა");
    } catch (err) {
      console.error("Error confirming invoice:", err);
      alert("დადასტურებისას მოხდა შეცდომა");
    }
  };

  const confirmSingleInvoice = async (date: string, month: string, amount: number, weightKg: number, protectorsAmount: number, emailSendIds: string[]) => {
    try {
      const response = await fetch(`/api/physical/invoices/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date,
          month,
          amount,
          weightKg,
          protectorsAmount,
          emailSendIds, // Send specific emailSend IDs to confirm only these
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || "დადასტურება ვერ მოხერხდა";
        alert(errorMessage);
        return;
      }
      
      await fetchInvoices();
      alert("ინვოისი წარმატებით დაადასტურა");
    } catch (err) {
      console.error("Error confirming invoice:", err);
      alert("დადასტურებისას მოხდა შეცდომა");
    }
  };

  const handleDownloadPDF = async (month: string) => {
    try {
      const response = await fetch(`/api/physical/invoices/pdf?month=${month}`);
      if (!response.ok) {
        throw new Error("PDF-ის გადმოწერა ვერ მოხერხდა");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `ინვოისი_${month}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("PDF-ის გადმოწერისას მოხდა შეცდომა");
    }
  };

  const handleDownloadSingleInvoicePDF = async (
    date: string, 
    month: string, 
    amount: number, 
    weightKg: number, 
    protectorsAmount: number
  ) => {
    try {
      // Build URL with all invoice parameters for exact matching
      const url = `/api/physical/invoices/pdf?month=${month}&date=${date}&amount=${amount.toFixed(2)}&weight=${weightKg.toFixed(2)}&protectors=${protectorsAmount.toFixed(2)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("PDF-ის გადმოწერა ვერ მოხერხდა");
      }
      
      const blob = await response.blob();
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `ინვოისი_${date}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObj);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("PDF-ის გადმოწერისას მოხდა შეცდომა");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-[18px] md:text-[20px] text-gray-600">იტვირთება...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href="/physical"
            className="text-blue-600 hover:underline text-[18px] mb-2 font-bold inline-block"
          >
            ← უკან
          </Link>
          <h1 className="text-center text-[18px] md:text-[24px] font-bold text-black">
            ინვოისები
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          {/* Month Filter */}
          <div className="mb-4">
          
          
            <select
              value={selectedInvoiceMonth}
              onChange={(e) => setSelectedInvoiceMonth(e.target.value)}
              className="w-full md:w-1/3 px-3 py-2 border rounded-md text-[16px] md:text-[18px]"
            >
              <option value="">ყველა თვე</option>
              {Array.from(new Set(invoices.map(inv => inv.month))).map((month) => (
                <option key={month} value={month}>
                  {formatMonthGe(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 bg-white md:text-[18px] text-[16px]">
              <thead>
                <tr className="bg-orange-100">
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold w-12"></th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">თვე</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">სულ თანხა</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">გადახდილი თანხა</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">დარჩენილი</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">სტატუსი</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, invoiceIdx) => {
                  // Get paidAmount directly from API (updated by admin in /admin/revenues)
                  const paidAmount = invoice.paidAmount || 0;
                  const remainingAmount = invoice.remainingAmount || (invoice.totalAmount - paidAmount);
                  const isFullyPaid = remainingAmount <= 0 && paidAmount > 0 && invoice.totalAmount > 0;
                  const displayStatus = invoice.status || (isFullyPaid ? "PAID" : "PENDING");
                  // Create unique key: month + totalAmount + first invoice date (if available) + index
                  const firstInvoiceDate = invoice.invoices && invoice.invoices.length > 0 ? invoice.invoices[0].date : '';
                  const uniqueKey = `${invoice.month}-${invoice.totalAmount.toFixed(2)}-${firstInvoiceDate}-${invoiceIdx}`;
                  const isExpanded = expandedRows.has(uniqueKey);
                  const hasDetails = invoice.invoices && invoice.invoices.length > 0;
                  
                  return (
                    <React.Fragment key={uniqueKey}>
                      <tr
                        className={`bg-white cursor-pointer hover:bg-gray-50 ${
                          displayStatus === "PAID" ? "bg-green-50" : ""
                        }`}
                        onClick={() => hasDetails && toggleRow(uniqueKey)}
                      >
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {hasDetails && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(uniqueKey);
                              }}
                              className="text-gray-600 hover:text-gray-900 focus:outline-none"
                            >
                              {isExpanded ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-black font-semibold">
                          <div className="flex flex-col">
                            <span>{formatMonthGe(invoice.month)}</span>
                            {invoice.confirmedAt && (
                              <span className="text-xs text-green-600 font-normal mt-1">
                                ✓ დაადასტურა {new Date(invoice.confirmedAt).toLocaleDateString("ka-GE")}
                              </span>
                            )}
                            {!invoice.confirmedAt && (
                              <span className="text-xs text-yellow-600 font-normal mt-1">
                                დადასტურება საჭიროა
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                          {invoice.totalAmount.toFixed(2)} ₾
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-green-600 font-medium">
                          {paidAmount.toFixed(2)} ₾
                        </td>
                        <td className={`border border-gray-300 px-2 py-1 text-center font-medium ${
                          remainingAmount > 0 ? "text-red-600" : "text-green-600"
                        }`}>
                          {remainingAmount.toFixed(2)} ₾
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-[12px] md:text-[14px] font-medium ${
                                displayStatus === "PAID"
                                  ? "bg-green-600 text-white"
                                  : "bg-yellow-600 text-white"
                              }`}
                            >
                              {displayStatus === "PAID" ? "გადახდილი" : "გადასახდელი"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!invoice.confirmedAt) {
                                  confirmInvoiceMonth(invoice.month, uniqueKey);
                                }
                              }}
                              disabled={!!invoice.confirmedAt}
                              className={`font-bold px-3 py-1 rounded text-[12px] md:text-[14px] ${
                                invoice.confirmedAt
                                  ? "bg-gray-400 text-white cursor-not-allowed opacity-50"
                                  : "bg-green-600 text-white hover:bg-green-700"
                              }`}
                            >
                              {invoice.confirmedAt ? "დადასტურებულია" : "დადასტურება"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr>
                          <td colSpan={7} className="border border-gray-300 px-4 py-3 bg-gray-50">
                          
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300 bg-white md:text-[16px] text-[14px]">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">თარიღი</th>
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">გაგზავნის თარიღი</th>
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">გაგზავნილი რაოდენობა</th>
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">წონა (კგ)</th>
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">დამცავები (₾)</th>
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">სულ (₾)</th>
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">დადასტურება</th>
                                    <th className="border border-gray-300 px-2 py-1 text-black text-center font-semibold">გადმოწერა</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoice.invoices.map((inv, idx) => {
                                    // Create unique key using parent uniqueKey, date, amount, weight, protectors, and index
                                    const detailUniqueKey = `${uniqueKey}-${inv.date}-${inv.amount.toFixed(2)}-${inv.weightKg.toFixed(2)}-${inv.protectorsAmount.toFixed(2)}-${idx}`;
                                    return (
                                      <tr key={detailUniqueKey} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                                          {formatDate(inv.date)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                                          {inv.sentAt ? formatDate(inv.sentAt) : "-"}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                                          {inv.emailSendCount}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                                          {inv.weightKg.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center text-black">
                                          {inv.protectorsAmount.toFixed(2)} ₾
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center text-black font-semibold">
                                          {inv.amount.toFixed(2)} ₾
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                          {inv.confirmedAt ? (
                                            <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-3 py-1 text-xs font-semibold">
                                              ✓ დაადასტურა {new Date(inv.confirmedAt).toLocaleDateString("ka-GE")}
                                            </span>
                                          ) : (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                confirmSingleInvoice(inv.date, invoice.month, inv.amount, inv.weightKg, inv.protectorsAmount, inv.emailSendIds || []);
                                              }}
                                              className="bg-green-600 font-bold text-white px-3 py-1 rounded text-[12px] md:text-[14px] hover:bg-green-700"
                                            >
                                              დადასტურება
                                            </button>
                                          )}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadSingleInvoicePDF(
                                                inv.date, 
                                                invoice.month,
                                                inv.amount,
                                                inv.weightKg,
                                                inv.protectorsAmount
                                              );
                                            }}
                                            className="bg-green-600 text-white font-bold px-3 py-1 rounded text-[12px] md:text-[14px] hover:bg-green-700 flex items-center gap-1 mx-auto"
                                            title="ინვოისის გადმოწერა"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            გადმოწერა
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <div className="text-center py-8 text-gray-600 bg-white">
                ინვოისები არ მოიძებნა
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
