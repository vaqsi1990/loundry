"use client";

import { Fragment, useEffect, useState } from "react";

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
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  
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
          // კომუნალური შედის კალკულატორში, ერთჯერადი გამორიცხულია
          excludeFromCalculator: formData.category === "ONE_TIME" ? true : (formData.category === "UTILITIES" ? false : (formData.excludeFromCalculator || false)),
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

  const toggleExpenseDetails = (id: string) => {
    setExpandedExpenses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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

      {/* Add Expense Form Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetForm();
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-black">ახალი ხარჯის დამატება</h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="დახურვა"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    კატეგორია *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      setFormData({ 
                        ...formData, 
                        category: newCategory,
                        // კომუნალური შედის კალკულატორში, ერთჯერადი გამორიცხულია
                        excludeFromCalculator: newCategory === "ONE_TIME"
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
                  <label className="block text-[16px] font-medium text-black mb-1">
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
                  <label className="block text-[16px] font-medium text-black mb-1">
                    სახელი *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    placeholder="ხარჯის სახელი"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
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
                    disabled={formData.category === "ONE_TIME"}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-[16px] ${formData.category === "ONE_TIME" ? "text-gray-500" : "text-black"}`}>
                    კალკულაციიდან გამორიცხვა {formData.category === "ONE_TIME" && "(ავტომატური)"}
                  </span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
          <label className="text-[16px] font-medium text-black whitespace-nowrap">
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
            className="bg-gray-200 text-black px-4 py-2 rounded-lg hover:bg-gray-300 text-[16px]"
          >
            ინვენტარის ჩვენება
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="text-lg font-bold text-black">
          სულ: {totalAmount.toFixed(2)} ₾ ({filteredExpenses.length} ხარჯი
          {calculatorFilter !== "all" && ` - ${calculatorFilter === "included" ? "კალკულაციაში შემავალი" : "კალკულაციიდან გამორიცხული"}`})
        </div>
        {calculatorFilter !== "all" && (
          <div className="text-[16px] text-gray-600 mt-1">
            სულ ხარჯები: {expenses.length} (ნაჩვენები: {filteredExpenses.length})
          </div>
        )}
      </div>

      {/* Expenses List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider w-12">
                
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                თარიღი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                პროდუქტის სახელი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredExpenses.map((expense) => {
              const isExpanded = expandedExpenses.has(expense.id);
              return (
                <Fragment key={expense.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                      <button
                        onClick={() => toggleExpenseDetails(expense.id)}
                        className="text-gray-600 hover:text-gray-900 focus:outline-none transition-transform"
                        aria-label={isExpanded ? "დეტალების დამალვა" : "დეტალების ჩვენება"}
                      >
                        <svg
                          className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {new Date(expense.date).toLocaleDateString("ka-GE")}
                    </td>
                    <td className="px-6 py-4 text-[16px] md:text-[18px] text-black">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                      <div className="flex items-center space-x-3">
                       
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:underline"
                        >
                          წაშლა
                        </button>
                      </div>
                    </td>
              </tr>
              {isExpanded && (
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[16px]">
                      <div>
                        <h4 className="font-semibold text-black mb-2">დეტალური ინფორმაცია</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700">ID:</span>
                            <span className="ml-2 text-black">{expense.id}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">კატეგორია:</span>
                            <span className="ml-2 text-black">{CATEGORY_LABELS[expense.category] || expense.category}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">თარიღი:</span>
                            <span className="ml-2 text-black">{new Date(expense.date).toLocaleDateString("ka-GE", { 
                              year: "numeric", 
                              month: "long", 
                              day: "numeric" 
                            })}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">თანხა:</span>
                            <span className="ml-2 text-black font-semibold">{expense.amount.toFixed(2)} ₾</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">განმეორებადი:</span>
                            <span className="ml-2 text-black">{expense.isRecurring ? "კი" : "არა"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">კალკულაციიდან გამორიცხული:</span>
                            <span className={`ml-2 font-semibold ${expense.excludeFromCalculator ? "text-red-600" : "text-green-600"}`}>
                              {expense.excludeFromCalculator ? "კი" : "არა"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-black mb-2">დამატებითი ინფორმაცია</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium text-gray-700">აღწერა:</span>
                            <p className="mt-1 text-black">{expense.description}</p>
                          </div>
                          {expense.inventory && (
                            <div>
                              <span className="font-medium text-gray-700">ინვენტარი:</span>
                              <div className="mt-1 text-black">
                                <div className="font-semibold">{expense.inventory.itemName}</div>
                                {expense.inventory.category && (
                                  <div className="text-[16px] text-gray-600">
                                    {CATEGORY_LABELS[expense.inventory.category] || expense.inventory.category}
                                  </div>
                                )}
                                {expense.inventory.unitPrice && (
                                  <div className="text-[16px] text-gray-600">
                                    ერთეულის ფასი: {expense.inventory.unitPrice.toFixed(2)} ₾ / {expense.inventory.unit}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-700">შექმნის თარიღი:</span>
                            <span className="ml-2 text-black">
                              {new Date(expense.createdAt).toLocaleDateString("ka-GE", { 
                                year: "numeric", 
                                month: "long", 
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
            );
            })}
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

