"use client";

import { useEffect, useState } from "react";

interface InventoryMovement {
  id: string;
  type: string;
  quantity: number;
  date: string;
  notes: string | null;
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

export default function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
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

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch("/api/admin/inventory");
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
          ...formData,
          quantity: parseInt(formData.quantity),
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
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
      category: "",
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
      category: item.category || "",
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
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">საწყობი</h2>
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

      {/* Balance Block - ნაშთის ბლოკი */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-black mb-4">ნაშთი</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="font-semibold text-black text-[16px] md:text-[18px] mb-2">
                {item.itemName}
              </div>
              <div className="text-[14px] md:text-[16px] text-gray-700">
                <div>დარჩენილი: <span className="font-bold text-blue-600">{item.quantity} {item.unit}</span></div>
                {item.category && <div>კატეგორია: {item.category}</div>}
              </div>
            </div>
          ))}
        </div>
        {items.length === 0 && (
          <div className="text-center py-4 text-gray-600">ნაშთი ცარიელია</div>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">
            {editingId ? "რედაქტირება" : "ახალი პროდუქტი"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                პროდუქტის სახელი *
              </label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                კატეგორია
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  რაოდენობა *
                </label>
                <input
                  type="number"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  ერთეული *
                </label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                >
                  <option value="piece">ცალი</option>
                  <option value="kg">კგ</option>
                  <option value="liter">ლიტრი</option>
                  <option value="box">ყუთი</option>
                  <option value="pack">პაკეტი</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  ერთეულის ფასი
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  მომწოდებელი
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                მიღების თარიღი *
              </label>
              <input
                type="date"
                required
                value={formData.receiptDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
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

      {/* Remove Form */}
      {removingId && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">პროდუქტის გატანა</h3>
          <form onSubmit={(e) => handleRemove(e, removingId)} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                რაოდენობა *
              </label>
              <input
                type="number"
                required
                min="1"
                value={removeData.quantity}
                onChange={(e) => setRemoveData({ ...removeData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                გატანის თარიღი *
              </label>
              <input
                type="date"
                required
                value={removeData.date}
                onChange={(e) => setRemoveData({ ...removeData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                შენიშვნა
              </label>
              <textarea
                value={removeData.notes}
                onChange={(e) => setRemoveData({ ...removeData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                rows={3}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                გატანა
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
                className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                გაუქმება
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory List */}
      <div className="overflow-x-auto mb-6">
        <h3 className="text-lg font-bold text-black mb-4">საწყობის პროდუქტები</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                პროდუქტი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                კატეგორია
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                რაოდენობა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მიღების თარიღი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ერთეულის ფასი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მომწოდებელი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {item.itemName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {item.category || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {item.receiptDate 
                    ? new Date(item.receiptDate).toLocaleDateString("ka-GE")
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {item.unitPrice ? `${item.unitPrice.toFixed(2)} ₾` : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {item.supplier || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => {
                        const qty = prompt("რაოდენობა რესტოკისთვის:");
                        if (qty) {
                          handleRestock(item.id, parseInt(qty));
                        }
                      }}
                      className="text-green-600 text-[16px] md:text-[18px] cursor-pointer hover:underline text-left"
                    >
                      თავიდან შევსება
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
                      className="text-orange-600 text-[16px] md:text-[18px] cursor-pointer hover:underline text-left"
                    >
                      გატანა
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 text-[16px] md:text-[18px] cursor-pointer hover:underline text-left"
                    >
                      რედაქტირება
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 text-[16px] md:text-[18px] cursor-pointer hover:underline text-left"
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

      {items.length === 0 && (
        <div className="text-center py-8 text-black">
          საწყობი ცარიელია
        </div>
      )}

      {/* Removed Items Section */}
      {removedItems.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-black mb-4">გატანილი პროდუქტები</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    პროდუქტი
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    კატეგორია
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    გატანილი რაოდენობა
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    გატანის თარიღი
                  </th>
                  <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                    შენიშვნა
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {removedItems.map((removed) => (
                  <tr key={removed.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                      {removed.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {removed.category || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {removed.quantity} {removed.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                      {new Date(removed.date).toLocaleDateString("ka-GE")}
                    </td>
                    <td className="px-6 py-4 text-[16px] md:text-[18px] text-black">
                      {removed.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
