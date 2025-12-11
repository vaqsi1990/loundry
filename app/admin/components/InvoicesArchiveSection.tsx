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

export default function InvoicesArchiveSection() {
  const [archivedMonth, setArchivedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [archivedDate, setArchivedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [archivedInvoices, setArchivedInvoices] = useState<ArchivedInvoice[]>([]);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [viewLabel, setViewLabel] = useState<string>("თვე");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedInvoices(archivedMonth);
  }, []);

  const formatMoney = (n: number | undefined) => (n || 0).toFixed(2);

  const fetchArchivedInvoices = async (month: string) => {
    setArchivedLoading(true);
    setArchivedError("");
    try {
      const res = await fetch(`/api/admin/invoices?month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "არქივის ჩატვირთვა ვერ მოხერხდა");
      setArchivedInvoices(data.invoices || []);
      setArchivedTotal(data.totalAmount || 0);
      setViewLabel(`თვე: ${month}`);
    } catch (err) {
      setArchivedError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
      setArchivedInvoices([]);
      setArchivedTotal(0);
    } finally {
      setArchivedLoading(false);
    }
  };

  const fetchArchivedByDate = async (date: string) => {
    setArchivedLoading(true);
    setArchivedError("");
    try {
      const res = await fetch(`/api/admin/invoices?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "არქივის ჩატვირთვა ვერ მოხერხდა");
      setArchivedInvoices(data.invoices || []);
      setArchivedTotal(data.totalAmount || 0);
      setViewLabel(`თარიღი: ${date}`);
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
      await fetchArchivedInvoices(archivedMonth);
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

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-black">არქივი (თვეების მიხედვით)</h3>
          <p className="text-gray-600 text-sm">აირჩიეთ თვე ან კონკრეტული თარიღი და იხილეთ ინვოისები.</p>
          <p className="text-gray-600 text-xs mt-1">{viewLabel}</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <input
              type="month"
              value={archivedMonth}
              onChange={(e) => setArchivedMonth(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => fetchArchivedInvoices(archivedMonth)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              disabled={archivedLoading}
            >
              {archivedLoading ? "იტვირთება..." : "ჩატვირთვა (თვე)"}
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <input
              type="date"
              value={archivedDate}
              onChange={(e) => setArchivedDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => fetchArchivedByDate(archivedDate)}
              className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
              disabled={archivedLoading}
            >
              {archivedLoading ? "იტვირთება..." : "ჩატვირთვა (თარიღი)"}
            </button>
          </div>
        </div>
      </div>

      {archivedError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {archivedError}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-gray-600 text-sm">ინვოისების რაოდენობა</div>
          <div className="text-xl font-bold text-black">{archivedInvoices.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-gray-600 text-sm">სულ თანხა (₾)</div>
          <div className="text-xl font-bold text-black">{formatMoney(archivedTotal)} ₾</div>
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
              <th className="px-4 py-2 text-left text-sm font-medium text-black">წონა (კგ)</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">დამცავები (₾)</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-black">სულ (₾)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {archivedInvoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-black text-sm">
                  არჩეულ თვეში ინვოისები არ არის
                </td>
              </tr>
            )}
            {archivedInvoices.map((inv) => (
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
                    <td colSpan={7} className="px-4 py-3 text-sm text-black">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div><span className="font-semibold">ინვოისი №:</span> {inv.invoiceNumber}</div>
                        <div><span className="font-semibold">კლიენტი:</span> {inv.customerName}</div>
                        <div><span className="font-semibold">ელფოსტა:</span> {inv.customerEmail || "-"}</div>
                       
                        <div><span className="font-semibold">შექმნის თარიღი:</span> {new Date(inv.createdAt).toLocaleDateString("ka-GE")}</div>
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
    </div>
  );
}

