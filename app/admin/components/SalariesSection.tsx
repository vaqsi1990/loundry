"use client";

import { useEffect, useState } from "react";

interface Salary {
  id: string;
  employeeId: string | null;
  employeeName: string;
  firstName: string | null;
  lastName: string | null;
  workPeriodStart: string | null;
  workPeriodEnd: string | null;
  accruedAmount: number | null;
  issuedAmount: number | null;
  signature: string | null;
  amount: number;
  month: number;
  year: number;
  status: string;
  notes: string | null;
  createdAt: string;
}

export default function SalariesSection() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  
  const [formData, setFormData] = useState({
    employeeName: "",
    firstName: "",
    lastName: "",
    workPeriodStart: "",
    workPeriodEnd: "",
    accruedAmount: "",
    issuedAmount: "",
    signature: "",
    amount: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: "PENDING",
    notes: "",
  });

  useEffect(() => {
    fetchSalaries();
  }, [filterMonth, filterYear]);

  const fetchSalaries = async () => {
    try {
      const response = await fetch(`/api/admin/salaries?month=${filterMonth}&year=${filterYear}`);
      if (!response.ok) {
        throw new Error("ხელფასების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setSalaries(data);
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
      const url = editingId ? `/api/admin/salaries/${editingId}` : "/api/admin/salaries";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount ? parseFloat(formData.amount) : (formData.accruedAmount ? parseFloat(formData.accruedAmount) : 0),
          accruedAmount: formData.accruedAmount ? parseFloat(formData.accruedAmount) : null,
          issuedAmount: formData.issuedAmount ? parseFloat(formData.issuedAmount) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchSalaries();
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
      const response = await fetch(`/api/admin/salaries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchSalaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      employeeName: "",
      firstName: "",
      lastName: "",
      workPeriodStart: "",
      workPeriodEnd: "",
      accruedAmount: "",
      issuedAmount: "",
      signature: "",
      amount: "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: "PENDING",
      notes: "",
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleEdit = (salary: Salary) => {
    setFormData({
      employeeName: salary.employeeName,
      firstName: salary.firstName || "",
      lastName: salary.lastName || "",
      workPeriodStart: salary.workPeriodStart ? new Date(salary.workPeriodStart).toISOString().split('T')[0] : "",
      workPeriodEnd: salary.workPeriodEnd ? new Date(salary.workPeriodEnd).toISOString().split('T')[0] : "",
      accruedAmount: salary.accruedAmount?.toString() || "",
      issuedAmount: salary.issuedAmount?.toString() || "",
      signature: salary.signature || "",
      amount: salary.amount.toString(),
      month: salary.month,
      year: salary.year,
      status: salary.status,
      notes: salary.notes || "",
    });
    setEditingId(salary.id);
    setShowAddForm(true);
  };

  const getMonthName = (month: number) => {
    const months = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
    ];
    return months[month - 1];
  };

  const totalAmount = salaries.reduce((sum, s) => sum + s.amount, 0);
  const paidAmount = salaries.filter(s => s.status === "PAID").reduce((sum, s) => sum + s.amount, 0);

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">ხელფასები</h2>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
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

      {/* Filter */}
      <div className="mb-4 flex space-x-4">
        <div>
          <label className="block text-sm font-medium text-black mb-1">თვე</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">წელი</label>
          <input
            type="number"
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-black"
            min="2020"
            max="2100"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">სულ ხელფასები</div>
          <div className="text-2xl font-bold text-black">{salaries.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">სულ თანხა</div>
          <div className="text-2xl font-bold text-black">{totalAmount.toFixed(2)} ₾</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">გადახდილი</div>
          <div className="text-2xl font-bold text-black">{paidAmount.toFixed(2)} ₾</div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">
            {editingId ? "რედაქტირება" : "ახალი ხელფასი"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  სახელი *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => {
                    const firstName = e.target.value;
                    const employeeName = firstName && formData.lastName 
                      ? `${firstName} ${formData.lastName}` 
                      : formData.employeeName;
                    setFormData({ ...formData, firstName, employeeName });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  გვარი *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => {
                    const lastName = e.target.value;
                    const employeeName = formData.firstName && lastName 
                      ? `${formData.firstName} ${lastName}` 
                      : formData.employeeName;
                    setFormData({ ...formData, lastName, employeeName });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                თანამშრომლის სახელი (სრული)
              </label>
              <input
                type="text"
                value={formData.employeeName || (formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : '')}
                onChange={(e) => {
                  const newEmployeeName = e.target.value;
                  setFormData({ ...formData, employeeName: newEmployeeName });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="ავტომატურად შეივსება სახელისა და გვარისგან"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  სამუშაო პერიოდის დასაწყისი *
                </label>
                <input
                  type="date"
                  required
                  value={formData.workPeriodStart}
                  onChange={(e) => setFormData({ ...formData, workPeriodStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  სამუშაო პერიოდის დასასრული *
                </label>
                <input
                  type="date"
                  required
                  value={formData.workPeriodEnd}
                  onChange={(e) => setFormData({ ...formData, workPeriodEnd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  დარიცხული თანხა *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.accruedAmount}
                  onChange={(e) => setFormData({ ...formData, accruedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  გაცემული თანხა *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.issuedAmount}
                  onChange={(e) => setFormData({ ...formData, issuedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                ხელმოწერა
              </label>
              <input
                type="text"
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="ხელმოწერა"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  თვე *
                </label>
                <select
                  required
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  წელი *
                </label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  min="2020"
                  max="2100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  თანხა (უკან თავსებადობისთვის)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount || (formData.accruedAmount ? formData.accruedAmount : '')}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="ავტომატურად შეივსება დარიცხული თანხიდან"
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
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                შენიშვნები
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingId ? "განახლება" : "დამატება"}
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

      {/* Salaries List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სამუშაო პერიოდი (თარიღები)
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სახელი გვარი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                დარიცხული თანხა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                გაცემული თანხა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ხელმოწერა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salaries.map((salary) => (
              <tr key={salary.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {salary.workPeriodStart && salary.workPeriodEnd
                    ? `${new Date(salary.workPeriodStart).toLocaleDateString('ka-GE')} - ${new Date(salary.workPeriodEnd).toLocaleDateString('ka-GE')}`
                    : `${getMonthName(salary.month)} ${salary.year}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {salary.firstName && salary.lastName
                    ? `${salary.firstName} ${salary.lastName}`
                    : salary.employeeName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {salary.accruedAmount ? `${salary.accruedAmount.toFixed(2)} ₾` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {salary.issuedAmount ? `${salary.issuedAmount.toFixed(2)} ₾` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {salary.signature || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(salary)}
                      className="text-blue-600 hover:underline"
                    >
                      რედაქტირება
                    </button>
                    <button
                      onClick={() => handleDelete(salary.id)}
                      className="text-red-600 hover:underline"
                    >
                      წაშლა
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {salaries.length === 0 && (
        <div className="text-center py-8 text-black">
          ხელფასები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

