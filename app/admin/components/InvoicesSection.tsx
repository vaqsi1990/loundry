"use client";

import React, { useEffect, useState } from "react";

interface DateDetail {
  date: string;
  emailSendCount: number;
  weightKg: number;
  protectorsAmount: number;
  totalAmount: number;
}

interface InvoiceDaySummary {
  hotelName: string | null;
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
  const [busy, setBusy] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [pdfModal, setPdfModal] = useState<{ open: boolean; hotelName: string | null; email: string }>({
    open: false,
    hotelName: null,
    email: "",
  });
  const [sendingPdf, setSendingPdf] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

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
  const totalSheets = summaries.reduce((sum, d) => sum + (d.sheetCount || 0), 0);
  const totalEmailSendCount = summaries.reduce(
    (sum, d) => sum + (d.totalEmailSendCount || 0),
    0
  );

  const formatHotel = (name: string | null) => name || "-";

  const toggleRow = (idx: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedRows(newExpanded);
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

  const openPdfModal = (hotelName: string | null) => {
    setPdfModal({ open: true, hotelName, email: "" });
  };

  const closePdfModal = () => {
    setPdfModal({ open: false, hotelName: null, email: "" });
  };

  const sendPdfInvoice = async () => {
    if (!pdfModal.hotelName || !pdfModal.email) {
      setError("გთხოვთ შეიყვანოთ ელფოსტა");
      return;
    }

    setSendingPdf(true);
    setError("");

    try {
      const response = await fetch("/api/admin/invoices/send-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName: pdfModal.hotelName,
          email: pdfModal.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PDF-ის გაგზავნა ვერ მოხერხდა");
      }

      alert("PDF ინვოისი წარმატებით გაიგზავნა");
      closePdfModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSendingPdf(false);
    }
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider w-12">
                
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სასტუმრო
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ფურცლები
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                გაგზავნილი რაოდენობა
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
            {summaries.map((day, idx) => {
              const isExpanded = expandedRows.has(idx);
              const hasDetails = day.dateDetails && day.dateDetails.length > 0;
              
              return (
                <React.Fragment key={(day.hotelName || "-") + idx}>
                  <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => hasDetails && toggleRow(idx)}>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {hasDetails && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(idx);
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
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                      {formatHotel(day.hotelName)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {day.sheetCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {day.totalEmailSendCount ?? 0}
                    </td>
                   
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {(day.totalWeightKg || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      <div className="flex flex-col leading-tight">
                        <span>{(day.protectorsAmount || 0).toFixed(2)} ₾</span>
                      
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                      <div className="flex flex-col leading-tight">
                        <span>{(day.totalAmount || 0).toFixed(2)} ₾</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPdfModal(day.hotelName);
                          }}
                          className="mt-2 text-[16px] bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 focus:outline-none"
                        >
                           გაგზავნა
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && hasDetails && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-[14px] md:text-[16px] font-medium text-black">
                                  თარიღი
                                </th>
                                <th className="px-4 py-2 text-left text-[14px] md:text-[16px] font-medium text-black">
                                  გაგზავნილი რაოდენობა
                                </th>
                                <th className="px-4 py-2 text-left text-[14px] md:text-[16px] font-medium text-black">
                                  წონა (კგ)
                                </th>
                                <th className="px-4 py-2 text-left text-[14px] md:text-[16px] font-medium text-black">
                                  დამცავები (₾)
                                </th>
                                <th className="px-4 py-2 text-left text-[14px] md:text-[16px] font-medium text-black">
                                  სულ (₾)
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(day.dateDetails || []).map((detail, detailIdx) => (
                                <tr key={detail.date + detailIdx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 whitespace-nowrap text-[14px] md:text-[16px] text-black">
                                    {formatDate(detail.date)}
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
                              ))}
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
      </div>

      {summaries.length === 0 && (
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
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                ელფოსტა
              </label>
              <input
                type="email"
                value={pdfModal.email}
                onChange={(e) => setPdfModal({ ...pdfModal, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
              />
            </div>
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

