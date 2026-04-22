"use client";

import { Fragment, useEffect, useState } from "react";

interface InventoryMovement {
  id: string;
  type: string;
  quantity: number;
  date: string;
  notes: string | null;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  inventoryId: string | null;
}

interface InventoryItem {
  id: string;
  itemName: string;
  category: string | null;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  supplier: string | null;
  lastRestocked: string | null;
  receiptDate: string | null;
  createdAt: string;
  movements: InventoryMovement[];
}

// Helper function to translate unit to Georgian
const translateUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    "piece": "ცალი",
    "kg": "კილოგრამი",
    "liter": "ლიტრი",
    "box": "ყუთი",
    "pack": "პაკეტი",
  };
  return unitMap[unit] || unit;
};

export default function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [loadingExpenses, setLoadingExpenses] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "piece",
    unitPrice: "",
    supplier: "",
    receiptDate: "",
  });

  const [removeData, setRemoveData] = useState({
    quantity: "",
    notes: "",
    date: new Date().toISOString().split('T')[0],
  });

  const [expenseFormData, setExpenseFormData] = useState<Record<string, {
    category: string;
    description: string;
    amount: string;
    date: string;
  }>>({});

  useEffect(() => {
    fetchItems();
  }, [selectedMonth]);

  const fetchExpensesForItem = async (inventoryId: string) => {
    if (expenses[inventoryId]) {
      return; // Already loaded
    }

    try {
      setLoadingExpenses(prev => new Set(prev).add(inventoryId));
      const response = await fetch("/api/admin/expenses");
      if (!response.ok) {
        throw new Error("ხარჯების ჩატვირთვა ვერ მოხერხდა");
      }
      const allExpenses: Expense[] = await response.json();
      const itemExpenses = allExpenses.filter(exp => exp.inventoryId === inventoryId);
      setExpenses(prev => ({ ...prev, [inventoryId]: itemExpenses }));
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoadingExpenses(prev => {
        const next = new Set(prev);
        next.delete(inventoryId);
        return next;
      });
    }
  };

  const toggleRow = (itemId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      fetchExpensesForItem(itemId);
      // Initialize form data for this item if not exists
      if (!expenseFormData[itemId]) {
        setExpenseFormData(prev => ({
          ...prev,
          [itemId]: {
            category: "SUPPLIES",
            description: "",
            amount: "",
            date: new Date().toISOString().split('T')[0],
          }
        }));
      }
    }
    setExpandedRows(newExpanded);
  };

  const toggleDetails = (itemId: string) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedDetails(newExpanded);
  };

  const handleExpenseSubmit = async (e: React.FormEvent, inventoryId: string) => {
    e.preventDefault();
    setError("");

    const formData = expenseFormData[inventoryId];
    if (!formData || !formData.amount || !formData.description) {
      setError("გთხოვთ შეავსოთ ყველა სავალდებულო ველი");
      return;
    }

    try {
      const response = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          isRecurring: false,
          inventoryId: inventoryId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ხარჯის დამატება ვერ მოხერხდა");
      }

      // Refresh expenses for this item
      await fetchExpensesForItem(inventoryId);
      
      // Reset form
      setExpenseFormData(prev => ({
        ...prev,
        [inventoryId]: {
          category: "SUPPLIES",
          description: "",
          amount: "",
          date: new Date().toISOString().split('T')[0],
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const url = selectedMonth 
        ? `/api/admin/inventory?month=${selectedMonth}`
        : "/api/admin/inventory";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("საწყობის ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setItems(data);
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
      const url = editingId ? `/api/admin/inventory/${editingId}` : "/api/admin/inventory";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemName: formData.itemName,
          quantity: parseInt(formData.quantity),
          unit: formData.unit,
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          supplier: formData.supplier || null,
          receiptDate: formData.receiptDate || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchItems();
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
      const response = await fetch(`/api/admin/inventory/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleRestock = async (id: string, quantity: number) => {
    try {
      const response = await fetch(`/api/admin/inventory/${id}/restock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        throw new Error("რესტოკი ვერ მოხერხდა");
      }

      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleRemove = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`/api/admin/inventory/${id}/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: parseInt(removeData.quantity),
          notes: removeData.notes,
          date: removeData.date,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "გატანა ვერ მოხერხდა");
      }

      await fetchItems();
      setRemovingId(null);
      setRemoveData({
        quantity: "",
        notes: "",
        date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      itemName: "",
      quantity: "",
      unit: "piece",
      unitPrice: "",
      supplier: "",
      receiptDate: "",
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      itemName: item.itemName,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: item.unitPrice?.toString() || "",
      supplier: item.supplier || "",
      receiptDate: item.receiptDate ? new Date(item.receiptDate).toISOString().split('T')[0] : "",
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  // Get all removed items
  const removedItems = items.flatMap(item => 
    item.movements
      .filter(m => m.type === "REMOVAL")
      .map(m => ({
        ...m,
        itemName: item.itemName,
        unit: item.unit,
        category: item.category,
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-gray-600 font-medium">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters and Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-gray-200">
       
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              თვე:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth("")}
                className="px-3 py-1.5 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium transition-colors border border-gray-300"
              >
                ყველა
              </button>
            )}
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 whitespace-nowrap font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>ახალი პროდუქტი</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-lg shadow-sm flex items-center gap-2">
          <span className="text-red-500 font-bold">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {selectedMonth && (
        <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 px-4 py-3 rounded-r-lg shadow-sm">
          <span className="font-medium">ნაჩვენებია: </span>
          {new Date(selectedMonth + "-01").toLocaleDateString("ka-GE", { year: "numeric", month: "long" })}
        </div>
      )}

     

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-6 md:p-8 rounded-xl mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {editingId ? "✏️ რედაქტირება" : "➕ ახალი პროდუქტი"}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                პროდუქტის სახელი <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="შეიყვანეთ პროდუქტის სახელი"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  რაოდენობა <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ერთეული <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="piece">ცალი</option>
                  <option value="kg">კგ</option>
                  <option value="liter">ლიტრი</option>
                  <option value="box">ყუთი</option>
                  <option value="pack">პაკეტი</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ერთეულის ფასი (₾)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  მომწოდებელი
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="მომწოდებლის სახელი"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                მიღების თარიღი <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.receiptDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                {editingId ? "💾 განახლება" : "✅ დამატება"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium transition-colors duration-200"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Remove Form */}
      {removingId && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-l-4 border-orange-400 p-6 md:p-8 rounded-r-xl mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">📤 პროდუქტის გატანა</h3>
            <button
              onClick={() => {
                setRemovingId(null);
                setRemoveData({
                  quantity: "",
                  notes: "",
                  date: new Date().toISOString().split('T')[0],
                });
              }}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
          <form onSubmit={(e) => handleRemove(e, removingId)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                რაოდენობა <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={removeData.quantity}
                onChange={(e) => setRemoveData({ ...removeData, quantity: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                გატანის თარიღი <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={removeData.date}
                onChange={(e) => setRemoveData({ ...removeData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                შენიშვნა
              </label>
              <textarea
                value={removeData.notes}
                onChange={(e) => setRemoveData({ ...removeData, notes: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                rows={3}
                placeholder="დამატებითი ინფორმაცია..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                🗑️ გატანა
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemovingId(null);
                  setRemoveData({
                    quantity: "",
                    notes: "",
                    date: new Date().toISOString().split('T')[0],
                  });
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium transition-colors duration-200"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider w-12">
                  
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  პროდუქტი
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  სულ შემოსული
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  გატანილი რაოდენობა
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  დარჩენილი რაოდენობა
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  მიღების თარიღი
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  ერთეულის ფასი
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  ჯამი
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  მომწოდებელი
                </th>
                <th className="px-4 md:px-6 py-4 text-left text-[16px] md:text-[18px] font-semibold text-gray-700 uppercase tracking-wider">
                  მოქმედებები
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const isDetailsExpanded = expandedDetails.has(item.id);
                const receiptMovements = item.movements.filter(m => m.type === "RECEIPT");
                const removalMovements = item.movements.filter(m => m.type === "REMOVAL");
                
                return (
                  <Fragment key={item.id}>
                    <tr className="text-[16px] md:text-[18px] text-black transition-colors duration-150">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleDetails(item.id)}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="დეტალების ჩვენება"
                        >
                          {isDetailsExpanded ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-[16px] md:text-[18px] font-semibold text-gray-900">{item.itemName}</div>
                      </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-[16px] md:text-[18px] text-gray-900 font-medium">
                      {(() => {
                        const totalRemoved = item.movements
                          .filter(m => m.type === "REMOVAL")
                          .reduce((sum, m) => sum + m.quantity, 0);
                        const totalReceived = item.quantity + totalRemoved;
                        return totalReceived;
                      })()} <span className="text-gray-500">{translateUnit(item.unit)}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-[16px] md:text-[18px] text-orange-600 font-medium">
                      {item.movements
                        .filter(m => m.type === "REMOVAL")
                        .reduce((sum, m) => sum + m.quantity, 0)} <span className="text-gray-500">{translateUnit(item.unit)}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-[16px] md:text-[18px] text-green-600 font-medium">
                      {item.quantity} <span className="text-gray-500">{translateUnit(item.unit)}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-[16px] md:text-[18px] text-gray-600">
                      {item.receiptDate 
                        ? new Date(item.receiptDate).toLocaleDateString("ka-GE")
                        : "-"}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-[16px] md:text-[18px] text-gray-900">
                      {item.unitPrice ? `${item.unitPrice.toFixed(2)} ₾` : <span className="text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-[16px] md:text-[18px] font-bold text-gray-900">
                      {item.unitPrice ? `${(item.quantity * item.unitPrice).toFixed(2)} ₾` : <span className="text-gray-400">-</span>}
                      <div className="text-xs text-gray-500 font-normal mt-1">
                        (დარჩენილი რაოდენობის ჯამი)
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-[16px] md:text-[18px] text-gray-600">
                      {item.supplier || <span className="text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const qty = prompt("რაოდენობა რესტოკისთვის:");
                          if (qty) {
                            handleRestock(item.id, parseInt(qty));
                          }
                        }}
                        className="px-3 py-1.5 text-[16px] md:text-[18px] font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                        title="თავიდან შევსება"
                      >
                        ➕
                      </button>
                      <button
                        onClick={() => {
                          setRemovingId(item.id);
                          setRemoveData({
                            quantity: "",
                            notes: "",
                            date: new Date().toISOString().split('T')[0],
                          });
                        }}
                        className="px-3 py-1.5 text-[16px] md:text-[18px] font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 transition-colors"
                        title="გატანა"
                      >
                        📤
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1.5 text-[16px] md:text-[18px] font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                        title="რედაქტირება"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 text-[16px] md:text-[18px] font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                        title="წაშლა"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
                {isDetailsExpanded && (
                  <tr>
                    <td colSpan={10} className="px-4 md:px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">დეტალური ინფორმაცია</h4>
                        
                        {/* შემოტანის თარიღები */}
                        {receiptMovements.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-md font-semibold text-green-700 mb-2"> შემოტანის თარიღები:</h5>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-green-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">თარიღი</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">რაოდენობა</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">შენიშვნა</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {receiptMovements.map((movement) => (
                                    <tr key={movement.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {new Date(movement.date).toLocaleDateString("ka-GE", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        })}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                                        {movement.quantity} {translateUnit(item.unit)}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-600">
                                        {movement.notes || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* გატანის თარიღები */}
                        {removalMovements.length > 0 && (
                          <div>
                            <h5 className="text-md font-semibold text-orange-700 mb-2"> გატანის თარიღები:</h5>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-orange-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">თარიღი</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">რაოდენობა</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">შენიშვნა</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {removalMovements.map((movement) => (
                                    <tr key={movement.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {new Date(movement.date).toLocaleDateString("ka-GE", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        })}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                                        {movement.quantity} {translateUnit(item.unit)}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-600">
                                        {movement.notes || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {receiptMovements.length === 0 && removalMovements.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            დეტალური ინფორმაცია არ არის ხელმისაწვდომი
                          </div>
                        )}
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
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-lg font-semibold text-gray-700 mb-2">საწყობი ცარიელია</div>
          <div className="text-sm text-gray-500">დაამატეთ პირველი პროდუქტი ზემოთ მოცემული ღილაკით</div>
        </div>
      )}

    
    </div>
  );
}
