"use client";

import { useEffect, useState } from "react";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  createdAt: string;
}

export default function ExpensesSection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calculatorTotal, setCalculatorTotal] = useState(0);
  const [calculatorItems, setCalculatorItems] = useState<Array<{ description: string; amount: number }>>([]);
  
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    isRecurring: false,
  });

  useEffect(() => {
    fetchExpenses();
  }, [viewMode, selectedDate, selectedMonth]);

  const fetchExpenses = async () => {
    try {
      const params = viewMode === "daily" 
        ? `?view=daily&date=${selectedDate}`
        : `?view=monthly&month=${selectedMonth}`;
      
      const response = await fetch(`/api/admin/expenses${params}`);
      if (!response.ok) {
        throw new Error("ხარჯების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setExpenses(data);
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
      const response = await fetch("/api/admin/expenses", {
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

      await fetchExpenses();
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
      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      isRecurring: false,
    });
    setShowAddForm(false);
  };

  const addCalculatorItem = () => {
    setCalculatorItems([...calculatorItems, { description: "", amount: 0 }]);
  };

  const updateCalculatorItem = (index: number, field: string, value: string | number) => {
    const updated = [...calculatorItems];
    updated[index] = { ...updated[index], [field]: value };
    setCalculatorItems(updated);
    calculateTotal(updated);
  };

  const removeCalculatorItem = (index: number) => {
    const updated = calculatorItems.filter((_, i) => i !== index);
    setCalculatorItems(updated);
    calculateTotal(updated);
  };

  const calculateTotal = (items: Array<{ description: string; amount: number }>) => {
    const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    setCalculatorTotal(total);
  };

  const filteredExpenses = expenses;
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">ხარჯები</h2>
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

      {/* View Mode Toggle */}
      <div className="mb-4 flex space-x-4">
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

      {/* Date/Month Selector */}
      <div className="mb-4">
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

      {/* Calculator */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-black mb-4">ხარჯების კალკულატორი</h3>
        <div className="space-y-2">
          {calculatorItems.map((item, index) => (
            <div key={index} className="flex space-x-2">
              <input
                type="text"
                placeholder="აღწერა"
                value={item.description}
                onChange={(e) => updateCalculatorItem(index, "description", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-black"
              />
              <input
                type="number"
                placeholder="თანხა"
                value={item.amount || ""}
                onChange={(e) => updateCalculatorItem(index, "amount", parseFloat(e.target.value) || 0)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md text-black"
              />
              <button
                onClick={() => removeCalculatorItem(index)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                წაშლა
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center">
            <button
              onClick={addCalculatorItem}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              + დამატება
            </button>
            <div className="text-lg font-bold text-black">
              სულ: {calculatorTotal.toFixed(2)} ₾
            </div>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">ახალი ხარჯი</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                კატეგორია *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="">აირჩიეთ</option>
                <option value="UTILITIES">კომუნალური</option>
                <option value="RENT">ქირა</option>
                <option value="SALARIES">ხელფასები</option>
                <option value="SUPPLIES">მარაგი</option>
                <option value="TRANSPORT">ტრანსპორტი</option>
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isRecurring" className="text-[16px] md:text-[18px] text-black">
                განმეორებადი ხარჯი
              </label>
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

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="text-lg font-bold text-black">
          სულ: {totalAmount.toFixed(2)} ₾ ({filteredExpenses.length} ხარჯი)
        </div>
      </div>

      {/* Expenses List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                თარიღი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                კატეგორია
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                აღწერა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                თანხა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                განმეორებადი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {new Date(expense.date).toLocaleDateString("ka-GE")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {expense.category}
                </td>
                <td className="px-6 py-4 text-[16px] md:text-[18px] text-black">
                  {expense.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {expense.amount.toFixed(2)} ₾
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {expense.isRecurring ? "✓" : "✗"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <button
                    onClick={() => handleDelete(expense.id)}
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

      {filteredExpenses.length === 0 && (
        <div className="text-center py-8 text-black">
          ხარჯები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

