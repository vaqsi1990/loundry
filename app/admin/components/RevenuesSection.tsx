"use client";

import { useEffect, useState } from "react";

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
  totalAmount: number | null;
  amount: number;
  paidAmount: number | null;
  status: string;
  createdAt: string;
}

interface RevenuesResponse {
  revenues: Revenue[];
  sentInvoices: SentInvoice[];
}

export default function RevenuesSection() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [sentInvoices, setSentInvoices] = useState<SentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    source: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchRevenues();
  }, [viewMode, selectedDate, selectedMonth]);

  const fetchRevenues = async () => {
    try {
      setLoading(true);
      setError("");
      const params = viewMode === "daily" 
        ? `?view=daily&date=${selectedDate}`
        : `?view=monthly&month=${selectedMonth}`;
      
      const response = await fetch(`/api/admin/revenues${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "შემოსავლების ჩატვირთვა ვერ მოხერხდა");
      }
      
      console.log("Revenues fetched:", {
        revenues: data.revenues?.length || 0,
        sentInvoices: data.sentInvoices?.length || 0,
        viewMode,
        selectedDate,
        selectedMonth,
      });
      
      // Debug: Log revenue amounts
      if (data.revenues && data.revenues.length > 0) {
        console.log("Revenue details:", data.revenues.map((r: any) => ({
          id: r.id,
          amount: r.amount,
          description: r.description,
          date: r.date,
        })));
      }
      
      // Debug: Log invoice amounts
      if (data.sentInvoices && data.sentInvoices.length > 0) {
        console.log("Invoice details:", data.sentInvoices.map((inv: any) => ({
          id: inv.id,
          totalAmount: inv.totalAmount,
          amount: inv.amount,
          customerName: inv.customerName,
          createdAt: inv.createdAt,
        })));
      } else {
        console.log("No invoices found in date range. Total invoices in DB:", data.sentInvoices?.length || 0);
      }
      
      setRevenues(data.revenues || []);
      setSentInvoices(data.sentInvoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/revenues/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
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
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
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
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
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

  const handleConfirmInvoice = async (invoiceId: string) => {
    if (!confirm("დარწმუნებული ხართ რომ ინვოისი სრულად ჩაირიცხა? ამის შემდეგ ფასის შეცვლა ვეღარ შეიძლება.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
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

      await fetchRevenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const totalRevenueAmount = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalInvoiceAmount = sentInvoices.reduce((sum, inv) => sum + (inv.totalAmount ?? inv.amount ?? 0), 0);
  const totalAmount = totalRevenueAmount + totalInvoiceAmount;
  
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">შემოსავლები</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + დამატება
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* View Mode Toggle and Date/Month Selector */}
      <div className="mb-4 flex items-center space-x-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "daily" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            ყოველდღიური
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "monthly" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            ყოველთვიური
          </button>
        </div>
        {viewMode === "daily" ? (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
          />
        ) : (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
          />
        )}
      </div>

      {/* Summary */}
      <div className="mb-4">
        <div className="text-lg font-bold text-black">
          სულ: {totalAmount.toFixed(2)} ₾ ({revenues.length} შემოსავალი, {sentInvoices.length} ინვოისი)
        </div>
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
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
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
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
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
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                თარიღი *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                დამატება
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
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
          <h3 className="text-lg font-bold text-black mb-4">გაგზავნილი ინვოისები</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    თარიღი
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
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
                {sentInvoices.map((invoice) => {
                  const totalAmount = invoice.totalAmount ?? invoice.amount ?? 0;
                  const paidAmount = invoice.paidAmount ?? 0;
                  const remaining = totalAmount - paidAmount;
                  const isEditing = editingPayment === invoice.id;
                  const isPaid = invoice.status === "PAID";
                  const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;
                  const canConfirm = isFullyPaid && !isPaid;
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                        {new Date(invoice.createdAt).toLocaleDateString("ka-GE")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                        {invoice.customerName}
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
                            className={`w-28 px-2 py-1 border border-gray-300 rounded-md text-[16px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              isPaid
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
                            >
                              დასტური
                            </button>
                          )}
                          {!isEditing && !isPaid && (
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
    </div>
  );
}

