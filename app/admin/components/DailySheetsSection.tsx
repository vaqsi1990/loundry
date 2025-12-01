"use client";

import { useEffect, useState } from "react";

interface DailySheet {
  id: string;
  date: string;
  description: string | null;
  notes: string | null;
  createdAt: string;
}

export default function DailySheetsSection() {
  const [sheets, setSheets] = useState<DailySheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    notes: "",
  });

  useEffect(() => {
    fetchSheets();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/admin/daily-sheets", {
        method: "POST",
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
      description: "",
      notes: "",
    });
    setShowAddForm(false);
  };

  const filteredSheets = sheets.filter(sheet => 
    selectedDate ? sheet.date === selectedDate : true
  );

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">დღის ფურცელი</h2>
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

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">ახალი დღის ფურცელი</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                აღწერა
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                შენიშვნები
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
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

      {/* Sheets List */}
      <div className="space-y-4">
        {filteredSheets.map((sheet) => (
          <div key={sheet.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold text-black">
                  {new Date(sheet.date).toLocaleDateString("ka-GE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
              </div>
              <button
                onClick={() => handleDelete(sheet.id)}
                className="text-red-600 hover:underline"
              >
                წაშლა
              </button>
            </div>
            {sheet.description && (
              <div className="mb-2">
                <p className="text-[16px] md:text-[18px] font-medium text-black">აღწერა:</p>
                <p className="text-[16px] md:text-[18px] text-black">{sheet.description}</p>
              </div>
            )}
            {sheet.notes && (
              <div>
                <p className="text-[16px] md:text-[18px] font-medium text-black">შენიშვნები:</p>
                <p className="text-[16px] md:text-[18px] text-black whitespace-pre-wrap">{sheet.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSheets.length === 0 && (
        <div className="text-center py-8 text-black">
          დღის ფურცლები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

