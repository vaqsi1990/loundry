"use client";

import { useEffect, useState } from "react";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  excludeFromCalculator: boolean;
  createdAt: string;
  inventoryId?: string | null;
  inventory?: {
    id: string;
    itemName: string;
    category: string | null;
    unit: string;
    unitPrice: number | null;
  } | null;
}

interface InventoryItem {
  id: string;
  itemName: string;
  category: string | null;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  supplier: string | null;
  receiptDate: string | null;
}

const CATEGORY_LABELS: { [key: string]: string } = {
  UTILITIES: "კომუნალური",
  ONE_TIME: "ერთჯერადი",
  // Inventory categories (for display purposes)
  KALMEBI: "კალმები",
  SKOCHI: "სკოჩი",
  PKHVNILI: "ფხვნილი",
  KLORI: "ქლორი",
  PERADI_STIKERI: "ფერადი სტიკერი",
  TETRI_STIKERI: "თეთრი სტიკერი",
  // Legacy categories (for backward compatibility)
  RENT: "ქირა",
  SALARIES: "ხელფასები",
  SUPPLIES: "მარაგი",
  TRANSPORT: "ტრანსპორტი",
  OTHER: "სხვა",
};

export default function ExpensesSection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInventorySection, setShowInventorySection] = useState(true);
  const [viewMode, setViewMode] = useState<"daily" | "monthly" | "all">("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [calculatorFilter, setCalculatorFilter] = useState<"all" | "included" | "excluded">("all");
  const [calculatorTotal, setCalculatorTotal] = useState(0);
  const [calculatorItems, setCalculatorItems] = useState<Array<{ description: string; amount: number }>>([]);
  
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    isRecurring: false,
    excludeFromCalculator: false,
  });

  useEffect(() => {
    fetchExpenses();
    fetchInventoryItems();
  }, [viewMode, selectedDate, selectedMonth]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let params = "";
      if (viewMode === "daily") {
        params = `?view=daily&date=${selectedDate}`;
      } else if (viewMode === "monthly") {
        params = `?view=monthly&month=${selectedMonth}`;
      }
      // If viewMode is "all", no params needed - will fetch all expenses
      
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

  const fetchInventoryItems = async () => {
    try {
      setInventoryLoading(true);
      const response = await fetch("/api/admin/inventory");
      if (!response.ok) {
        throw new Error("ინვენტარის ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setInventoryItems(data);
    } catch (err) {
      console.error("Inventory fetch error:", err);
    } finally {
      setInventoryLoading(false);
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
          // კომუნალური და ერთჯერადი ხარჯები ყოველთვის გამორიცხულია კალკულატორიდან
          excludeFromCalculator: formData.category === "UTILITIES" || formData.category === "ONE_TIME" ? true : (formData.excludeFromCalculator || false),
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
      excludeFromCalculator: false,
    });
    setShowAddForm(false);
  };

  const handleToggleExcludeFromCalculator = async (id: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          excludeFromCalculator: !currentValue,
        }),
      });

      if (!response.ok) {
        throw new Error("განახლება ვერ მოხერხდა");
      }

      await fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
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

  const createExpenseFromInventory = async (item: InventoryItem, quantity: number) => {
    if (!item.unitPrice || item.unitPrice <= 0) {
      setError("პროდუქტს არ აქვს ფასი");
      return;
    }

    if (quantity <= 0 || quantity > item.quantity) {
      setError("არასწორი რაოდენობა");
      return;
    }

    try {
      const totalAmount = quantity * item.unitPrice;
      const description = `${item.itemName} - ${quantity} ${item.unit}`;
      
      const response = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: "SUPPLIES",
          description: description,
          amount: totalAmount,
          date: new Date().toISOString().split("T")[0],
          isRecurring: false,
          excludeFromCalculator: false, // ინვენტარიდან დამატებული ხარჯები შედის კალკულატორში
          inventoryId: item.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchExpenses();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  // Filter expenses by calculator filter
  const filteredExpenses = expenses.filter((expense) => {
    if (calculatorFilter === "included") {
      return !expense.excludeFromCalculator;
    } else if (calculatorFilter === "excluded") {
      return expense.excludeFromCalculator;
    }
    return true; // "all" - show all expenses
  });
  
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">ხარჯები</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showAddForm ? "გაუქმება" : "ხარჯის დამატება"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add Expense Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">ახალი ხარჯის დამატება</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  კატეგორია *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    setFormData({ 
                      ...formData, 
                      category: newCategory,
                      // კომუნალური და ერთჯერადი ხარჯები ავტომატურად გამორიცხულია კალკულატორიდან
                      excludeFromCalculator: newCategory === "UTILITIES" || newCategory === "ONE_TIME"
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  required
                >
                  <option value="">აირჩიეთ კატეგორია</option>
                  <option value="UTILITIES">კომუნალური</option>
                  <option value="ONE_TIME">ერთჯერადი</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  თარიღი *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  აღწერა *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="ხარჯის აღწერა"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  თანხა (₾) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.excludeFromCalculator}
                  onChange={(e) => setFormData({ ...formData, excludeFromCalculator: e.target.checked })}
                  disabled={formData.category === "UTILITIES" || formData.category === "ONE_TIME"}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`text-sm ${formData.category === "UTILITIES" || formData.category === "ONE_TIME" ? "text-gray-500" : "text-black"}`}>
                  კალკულატორიდან გამორიცხვა {(formData.category === "UTILITIES" || formData.category === "ONE_TIME") && "(ავტომატური)"}
                </span>
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
              >
                გაუქმება
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                დამატება
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-2 rounded-lg ${
              viewMode === "all" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            ყველა
          </button>
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
        
        {/* Calculator Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-black whitespace-nowrap">
            კალკულატორის ფილტრი:
          </label>
          <select
            value={calculatorFilter}
            onChange={(e) => setCalculatorFilter(e.target.value as "all" | "included" | "excluded")}
            className="px-4 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">ყველა</option>
            <option value="included">კალკულატორში შემავალი</option>
            <option value="excluded">კალკულატორიდან გამორიცხული</option>
          </select>
        </div>
      </div>

      {/* Date/Month Selector */}
      {viewMode !== "all" && (
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
      )}

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
        
        </div>
      </div>


      {!showInventorySection && (
        <div className="mb-4">
          <button
            onClick={() => setShowInventorySection(true)}
            className="bg-gray-200 text-black px-4 py-2 rounded-lg hover:bg-gray-300 text-sm"
          >
            ინვენტარის ჩვენება
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="text-lg font-bold text-black">
          სულ: {totalAmount.toFixed(2)} ₾ ({filteredExpenses.length} ხარჯი
          {calculatorFilter !== "all" && ` - ${calculatorFilter === "included" ? "კალკულატორში შემავალი" : "კალკულატორიდან გამორიცხული"}`})
        </div>
        {calculatorFilter !== "all" && (
          <div className="text-sm text-gray-600 mt-1">
            სულ ხარჯები: {expenses.length} (ნაჩვენები: {filteredExpenses.length})
          </div>
        )}
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
                კალკულატორიდან გამორიცხული
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
                  {CATEGORY_LABELS[expense.category] || expense.category}
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
             
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExcludeFromCalculator(expense.id, expense.excludeFromCalculator);
                    }}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      expense.excludeFromCalculator
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {expense.excludeFromCalculator ? "გამორიცხული" : "ჩართული"}
                  </button>
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

