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
  }>;
}

export default function PhysicalInvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceMonth[]>([]);
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState("");
  const [editingPayments, setEditingPayments] = useState<Record<string, { paidAmount: string }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
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
      
      // Initialize editing state with API's paidAmount
      const initialEditing: Record<string, { paidAmount: string }> = {};
      data.forEach((inv: InvoiceMonth) => {
        initialEditing[inv.month] = {
          paidAmount: (inv.paidAmount || 0).toFixed(2),
        };
      });
      setEditingPayments(initialEditing);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentChange = (month: string, value: string) => {
    setEditingPayments(prev => ({
      ...prev,
      [month]: {
        paidAmount: value,
      },
    }));
  };

  const savePayment = async (month: string) => {
    const payment = editingPayments[month];
    if (!payment) return;

    setSaving(prev => ({ ...prev, [month]: true }));

    try {
      const paidAmount = parseFloat(payment.paidAmount) || 0;
      const response = await fetch("/api/physical/invoices", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      body: JSON.stringify({
        month,
        paidAmount,
      }),
      });

      if (!response.ok) {
        throw new Error("გადახდის შენახვა ვერ მოხერხდა");
      }

      await fetchInvoices();
      alert("გადახდა წარმატებით შეინახა");
    } catch (err) {
      console.error("Error saving payment:", err);
      alert("გადახდის შენახვისას მოხდა შეცდომა");
    } finally {
      setSaving(prev => ({ ...prev, [month]: false }));
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
            <label className="block text-[14px] text-center mx-auto md:text-[16px] font-medium text-gray-700 mb-1">
              თვე
            </label>
            <select
              value={selectedInvoiceMonth}
              onChange={(e) => setSelectedInvoiceMonth(e.target.value)}
              className="w-full md:w-1/3 px-3 py-2 border rounded-md text-[16px] md:text-[18px]"
            >
              <option value="">ყველა თვე</option>
              {invoices.map((inv) => (
                <option key={inv.month} value={inv.month}>
                  {formatMonthGe(inv.month)}
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
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">გადახდილი თანხა (₾)</th>
                  <th className="border border-gray-300 px-2 py-1 text-black md:text-[18px] text-[16px] text-center font-semibold">ქმედება</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const payment = editingPayments[invoice.month] || { paidAmount: (invoice.paidAmount || 0).toFixed(2) };
                  const paidAmount = parseFloat(payment.paidAmount) || 0;
                  // Use API's paidAmount for initial calculation, but allow editing
                  const apiPaidAmount = invoice.paidAmount || 0;
                  const remainingAmount = invoice.totalAmount - paidAmount;
                  const isInsufficient = paidAmount > 0 && remainingAmount > 0 && remainingAmount < invoice.totalAmount;
                  const isFullyPaid = remainingAmount <= 0 && paidAmount > 0 && invoice.totalAmount > 0;
                  const displayStatus = isFullyPaid ? "PAID" : "PENDING";
                  // Disable save button if fully paid and no changes made
                  const hasChanges = Math.abs(paidAmount - apiPaidAmount) > 0.01;
                  const isSaveDisabled = isFullyPaid && !hasChanges;
                  const isExpanded = expandedRows.has(invoice.month);
                  const hasDetails = invoice.invoices && invoice.invoices.length > 0;
                  
                  return (
                    <React.Fragment key={invoice.month}>
                      <tr
                        className={`bg-white cursor-pointer hover:bg-gray-50 ${
                          displayStatus === "PAID" ? "bg-green-50" : ""
                        }`}
                        onClick={() => hasDetails && toggleRow(invoice.month)}
                      >
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {hasDetails && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(invoice.month);
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
                          {formatMonthGe(invoice.month)}
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
                          {isInsufficient && (
                            <div className="text-[12px] text-yellow-600 mt-1">
                              ⚠️ არასაკმარისი
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          <span
                            className={`px-2 py-1 rounded text-[12px] md:text-[14px] font-medium ${
                              displayStatus === "PAID"
                                ? "bg-green-600 text-white"
                                : "bg-yellow-600 text-white"
                            }`}
                          >
                            {displayStatus === "PAID" ? "გადახდილი" : "გადასახდელი"}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={payment.paidAmount}
                            onChange={(e) => handlePaymentChange(invoice.month, e.target.value)}
                            className="w-full px-2 py-1 border rounded text-[14px] md:text-[16px] text-center"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => savePayment(invoice.month)}
                            disabled={saving[invoice.month] || isSaveDisabled}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-[12px] md:text-[14px] hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {saving[invoice.month] ? "ინახება..." : "შენახვა"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr>
                          <td colSpan={8} className="border border-gray-300 px-4 py-3 bg-gray-50">
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
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoice.invoices.map((inv, idx) => {
                                    // Create unique key using month, date, sentAt timestamp, and index
                                    const uniqueKey = `${invoice.month}-${inv.date}-${inv.sentAt || idx}-${idx}`;
                                    return (
                                      <tr key={uniqueKey} className="hover:bg-gray-50">
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
