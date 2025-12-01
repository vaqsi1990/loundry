"use client";

import { useEffect, useState } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
}

export default function InvoicesSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    customerName: "",
    customerEmail: "",
    amount: "",
    status: "PENDING",
    dueDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/admin/invoices");
      if (!response.ok) {
        throw new Error("ინვოისების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setInvoices(data);
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
      const response = await fetch("/api/admin/invoices", {
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

      await fetchInvoices();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("სტატუსის შეცვლა ვერ მოხერხდა");
      }

      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/invoices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: "",
      customerName: "",
      customerEmail: "",
      amount: "",
      status: "PENDING",
      dueDate: new Date().toISOString().split("T")[0],
    });
    setShowAddForm(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "მოლოდინში";
      case "PAID":
        return "გადახდილი";
      case "CANCELLED":
        return "გაუქმებული";
      default:
        return status;
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices
    .filter(inv => inv.status === "PENDING")
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">ინვოისები</h2>
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className=" text-gray-600">სულ ინვოისები</div>
          <div className="text-2xl font-bold text-black">{invoices.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-[16px] md:text-[18px] text-gray-600">სულ თანხა</div>
          <div className="text-2xl font-bold text-black">{totalAmount.toFixed(2)} ₾</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-[16px] md:text-[18px] text-gray-600">მოლოდინში</div>
          <div className="text-2xl font-bold text-black">{pendingAmount.toFixed(2)} ₾</div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">ახალი ინვოისი</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                ინვოისის ნომერი *
              </label>
              <input
                type="text"
                required
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                მომხმარებლის სახელი *
              </label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                მომხმარებლის ელფოსტა
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
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
                გადახდის ვადა *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                სტატუსი *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="PENDING">მოლოდინში</option>
                <option value="PAID">გადახდილი</option>
                <option value="CANCELLED">გაუქმებული</option>
              </select>
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

      {/* Invoices List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ინვოისის ნომერი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მომხმარებელი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                თანხა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სტატუსი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                გადახდის ვადა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  <div>{invoice.customerName}</div>
                  {invoice.customerEmail && (
                    <div className="text-xs text-gray-500">{invoice.customerEmail}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {invoice.amount.toFixed(2)} ₾
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <select
                    value={invoice.status}
                    onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs ${
                      invoice.status === "PAID"
                        ? "bg-green-100 text-green-800"
                        : invoice.status === "CANCELLED"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    <option value="PENDING">მოლოდინში</option>
                    <option value="PAID">გადახდილი</option>
                    <option value="CANCELLED">გაუქმებული</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {new Date(invoice.dueDate).toLocaleDateString("ka-GE")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <button
                    onClick={() => handleDelete(invoice.id)}
                    className="text-red-600 hover:underline"
                  >
                    წაშლა
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoices.length === 0 && (
        <div className="text-center py-8 text-black">
          ინვოისები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

