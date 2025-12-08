"use client";

import { useEffect, useState } from "react";

interface Hotel {
  id: string;
  hotelName: string;
  contactPhone: string;
  email?: string;
  address?: string;
}

interface DailySheetItem {
  id?: string;
  category: string;
  itemNameEn: string;
  itemNameKa: string;
  weight: number;
  received: number;
  washCount: number;
  dispatched: number;
  shortage: number;
  totalWeight: number;
  comment?: string;
}

interface DailySheet {
  id: string;
  date: string;
  hotelName: string | null;
  roomNumber: string | null;
  description: string | null;
  notes: string | null;
  items: DailySheetItem[];
  createdAt: string;
}

// Predefined items based on the images
const TOWEL_ITEMS: Omit<DailySheetItem, "id" | "totalWeight">[] = [
  { category: "TOWELS", itemNameEn: "Bath towel", itemNameKa: "აბაზანის პირსახოცი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameEn: "Hand towel", itemNameKa: "ხელის პირსახოცი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameEn: "Face towel", itemNameKa: "სახის პირსახოცი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameEn: "Bathmat", itemNameKa: "ფეხის ხალიჩა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "TOWELS", itemNameEn: "Bathrobe", itemNameKa: "ხალათი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
];

const LINEN_ITEMS: Omit<DailySheetItem, "id" | "totalWeight">[] = [
  { category: "LINEN", itemNameEn: "Fitted Sheet King", itemNameKa: "ზეწარი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameEn: "Fitted Sheet Twin", itemNameKa: "ზეწარი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameEn: "Fitted Sheet Baby", itemNameKa: "საბავშვო ზეწარი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameEn: "Duvet Cover King", itemNameKa: "კონვერტი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameEn: "Duvet Cover Twin", itemNameKa: "კონვერტი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameEn: "Pillow Case Small", itemNameKa: "ბალიშის პირი პატარა", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameEn: "Pillow Case Large", itemNameKa: "ბალიშის პირი დიდი", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
  { category: "LINEN", itemNameEn: "Pillow Case Baby", itemNameKa: "საბავშვო ბ.პ.", weight: 0, received: 0, washCount: 0, dispatched: 0, shortage: 0 },
];

export default function DailySheetsSection() {
  const [sheets, setSheets] = useState<DailySheet[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [emailModal, setEmailModal] = useState<{ open: boolean; sheetId: string | null; to: string }>({
    open: false,
    sheetId: null,
    to: "",
  });
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    hotelName: "",
    roomNumber: "",
    description: "",
    notes: "",
    items: [] as DailySheetItem[],
  });

  useEffect(() => {
    fetchSheets();
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const response = await fetch("/api/admin/hotels");
      if (!response.ok) {
        throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setHotels(data);
    } catch (err) {
      console.error("Hotels fetch error:", err);
    }
  };

  const fetchSheets = async () => {
    try {
      const response = await fetch("/api/admin/daily-sheets");
      if (!response.ok) {
        throw new Error("დღის ფურცლების ჩატვირთვა ვერ მოხერხდა");
      }
      const data = await response.json();
      setSheets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  const initializeItems = () => {
    const allItems: DailySheetItem[] = [
      ...TOWEL_ITEMS.map(item => ({
        ...item,
        id: undefined,
        totalWeight: item.weight * item.dispatched,
      })),
      ...LINEN_ITEMS.map(item => ({
        ...item,
        id: undefined,
        totalWeight: item.weight * item.dispatched,
      })),
    ];
    return allItems;
  };

  const handleItemChange = (index: number, field: keyof DailySheetItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    
    // Calculate totalWeight when dispatched or weight changes
    if (field === "dispatched" || field === "weight") {
      newItems[index].totalWeight = (newItems[index].weight || 0) * (newItems[index].dispatched || 0);
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.hotelName) {
      setError("გთხოვთ აირჩიოთ სასტუმრო");
      return;
    }

    try {
      const url = editingId ? `/api/admin/daily-sheets/${editingId}` : "/api/admin/daily-sheets";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "ოპერაცია ვერ მოხერხდა");
      }

      await fetchSheets();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleSendEmail = async () => {
    if (!emailModal.sheetId || !emailModal.to) {
      setError("გთხოვთ მიუთითოთ მიმღების ელფოსტა");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/admin/daily-sheets/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: emailModal.sheetId, to: emailModal.to }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "გაგზავნა ვერ მოხერხდა");
      }
      setEmailModal({ open: false, sheetId: null, to: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const handleEdit = (sheet: DailySheet) => {
    setEditingId(sheet.id);
    setFormData({
      date: sheet.date.split("T")[0],
      hotelName: sheet.hotelName || "",
      roomNumber: sheet.roomNumber || "",
      description: sheet.description || "",
      notes: sheet.notes || "",
      items: sheet.items.length > 0 
        ? sheet.items 
        : initializeItems(),
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/daily-sheets/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchSheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      hotelName: "",
      roomNumber: "",
      description: "",
      notes: "",
      items: initializeItems(),
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleNewSheet = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      hotelName: "",
      roomNumber: "",
      description: "",
      notes: "",
      items: initializeItems(),
    });
    setEditingId(null);
    setShowAddForm(true);
  };

  const filteredSheets = sheets.filter(sheet => 
    selectedDate ? sheet.date.split("T")[0] === selectedDate : true
  );

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  const renderSheetTable = (sheet: DailySheet) => {
    const towelItems = sheet.items.filter(item => item.category === "TOWELS");
    const linenItems = sheet.items.filter(item => item.category === "LINEN");

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 md:text-[18px] text-[16px]">
          <thead>
            <tr className="bg-orange-100">
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-left font-semibold">ერთეული</th>
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">წონა (კგ)</th>
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">მიღებული (ც.)</th>
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">რეცხვის რაოდენობა (ც.)</th>
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">გაგზავნილი (ც.)</th>
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">დეფიციტი (ც.)</th>
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">სულ წონა (კგ)</th>
              <th className="border border-gray-300 px-2 py-1  md:text-[18px] text-[16px] text-center font-semibold">შენიშვნა</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} className="bg-orange-100 border border-gray-300 px-2 py-1 font-semibold">
                პირსახოცები
              </td>
            </tr>
            {towelItems.map((item, idx) => (
              <tr key={idx} className="bg-white">
                <td className="border border-gray-300 px-2 py-1">
                  {item.itemNameKa}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.weight.toFixed(3)}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.received}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.washCount}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.dispatched}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.shortage}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.totalWeight.toFixed(2)}</td>
                <td className="border border-gray-300 px-2 py-1">{item.comment || ""}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={8} className="bg-orange-100 border border-gray-300 px-2 py-1 font-semibold">
                თეთრეული
              </td>
            </tr>
            {linenItems.map((item, idx) => (
              <tr key={idx} className="bg-white">
                <td className="border border-gray-300 px-2 py-1">
                  {item.itemNameKa}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.weight.toFixed(3)}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.received}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.washCount}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.dispatched}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.shortage}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">{item.totalWeight.toFixed(2)}</td>
                <td className="border border-gray-300 px-2 py-1">{item.comment || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">დღის ფურცელი</h2>
        <button
          onClick={handleNewSheet}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + ახალი ფურცელი
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Date Filter */}
      <div className="mb-4">
        <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
          თარიღის ფილტრი
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-black"
        />
      </div>

      {/* Add/Edit Form (Modal) */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">
                {editingId ? "ფურცლის რედაქტირება" : "ახალი დღის ფურცელი"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-black text-xl leading-none"
                aria-label="დახურვა"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
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
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    სასტუმრო *
                  </label>
                  <select
                    required
                    value={formData.hotelName}
                    onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  >
                    <option value="">აირჩიეთ სასტუმრო</option>
                    {hotels.map((hotel) => (
                      <option key={hotel.id} value={hotel.hotelName}>
                        {hotel.hotelName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[16px] font-medium text-black mb-1">
                    ოთახის ნომერი
                  </label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                    placeholder="მაგ: 31"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300  text-[16px]">
                    <thead>
                      <tr className="bg-orange-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">ერთეული</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold">წონა (კგ)</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold">მიღებული (ც.)</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold">რეცხვის რაოდენობა (ც.)</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold">გაგზავნილი (ც.)</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold">დეფიციტი (ც.)</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold">სულ წონა (კგ)</th>
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold">შენიშვნა</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={8} className="bg-orange-100 border border-gray-300 px-2 py-1 font-semibold">
                          პირსახოცები
                        </td>
                      </tr>
                      {formData.items
                        .filter(item => item.category === "TOWELS")
                        .map((item, index) => {
                          const actualIndex = formData.items.findIndex(i => i === item);
                          return (
                            <tr key={actualIndex} className="bg-white">
                              <td className="border border-gray-300 px-2 py-1">
                                {item.itemNameKa}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={item.weight}
                                  onChange={(e) => handleItemChange(actualIndex, "weight", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.received}
                                  onChange={(e) => handleItemChange(actualIndex, "received", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.washCount}
                                  onChange={(e) => handleItemChange(actualIndex, "washCount", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.dispatched}
                                  onChange={(e) => handleItemChange(actualIndex, "dispatched", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.shortage}
                                  onChange={(e) => handleItemChange(actualIndex, "shortage", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center bg-gray-50">
                                {item.totalWeight.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="text"
                                  value={item.comment || ""}
                                  onChange={(e) => handleItemChange(actualIndex, "comment", e.target.value)}
                                  className="w-full px-1 py-1 border-0 text-black bg-transparent"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      <tr>
                        <td colSpan={8} className="bg-orange-100 border border-gray-300 px-2 py-1 font-semibold">
                          თეთრეული
                        </td>
                      </tr>
                      {formData.items
                        .filter(item => item.category === "LINEN")
                        .map((item, index) => {
                          const actualIndex = formData.items.findIndex(i => i === item);
                          return (
                            <tr key={actualIndex} className="bg-white">
                              <td className="border border-gray-300 px-2 py-1">
                                {item.itemNameKa}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={item.weight}
                                  onChange={(e) => handleItemChange(actualIndex, "weight", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.received}
                                  onChange={(e) => handleItemChange(actualIndex, "received", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.washCount}
                                  onChange={(e) => handleItemChange(actualIndex, "washCount", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.dispatched}
                                  onChange={(e) => handleItemChange(actualIndex, "dispatched", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="number"
                                  value={item.shortage}
                                  onChange={(e) => handleItemChange(actualIndex, "shortage", parseInt(e.target.value) || 0)}
                                  className="w-full px-1 py-1 border-0 text-center text-black bg-transparent"
                                />
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center bg-gray-50">
                                {item.totalWeight.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                <input
                                  type="text"
                                  value={item.comment || ""}
                                  onChange={(e) => handleItemChange(actualIndex, "comment", e.target.value)}
                                  className="w-full px-1 py-1 border-0 text-black bg-transparent"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
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
        </div>
      )}

      {/* Sheets List */}
      <div className="space-y-6">
        {filteredSheets.map((sheet) => (
          <div key={sheet.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-black">
                  {sheet.hotelName} {sheet.roomNumber && `- Room ${sheet.roomNumber}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(sheet.date).toLocaleDateString("ka-GE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(sheet)}
                  className="text-blue-600 hover:underline px-2"
                >
                  რედაქტირება
                </button>
                <button
                  onClick={() => handleDelete(sheet.id)}
                  className="text-red-600 hover:underline px-2"
                >
                  წაშლა
                </button>
                <button
                  onClick={() => setEmailModal({ open: true, sheetId: sheet.id, to: "" })}
                  className="text-green-700 hover:underline px-2"
                >
                  გაგზავნა მეილზე
                </button>
              </div>
            </div>
            {renderSheetTable(sheet)}
          </div>
        ))}
      </div>

      {filteredSheets.length === 0 && (
        <div className="text-center py-8 text-black">
          დღის ფურცლები არ მოიძებნა
        </div>
      )}

      {emailModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-black mb-4">გაგზავნა მეილზე</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[16px] font-medium text-black mb-1">
                  მიმღების ელფოსტა *
                </label>
                <input
                  type="email"
                  value={emailModal.to}
                  onChange={(e) => setEmailModal({ ...emailModal, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                  placeholder="example@domain.com"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSendEmail}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  გაგზავნა
                </button>
                <button
                  onClick={() => setEmailModal({ open: false, sheetId: null, to: "" })}
                  className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
