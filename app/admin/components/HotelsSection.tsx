"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Hotel {
  id: string;
  hotelName: string;
  contactPhone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
}

type HotelsApiResponse = {
  items: Hotel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function HotelsSection() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeQuery = (searchParams.get("q") ?? "").trim();
  
  const [formData, setFormData] = useState({
    hotelName: "",
    contactPhone: "",
    email: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    const p = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    setPage(p);
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    fetchHotels(page, activeQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeQuery]);

  const setPageInUrl = (nextPage: number) => {
    const next = Math.max(1, nextPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  };

  const setQueryInUrl = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextQuery.trim();
    if (trimmed.length === 0) {
      params.delete("q");
    } else {
      params.set("q", trimmed);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHotels = async (targetPage: number, q: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/hotels?page=${targetPage}&limit=10&q=${encodeURIComponent(q)}`
      );
      if (!response.ok) {
        throw new Error("სასტუმროების ჩატვირთვა ვერ მოხერხდა");
      }
      const data: HotelsApiResponse = await response.json();
      setHotels(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);

      if (targetPage > data.totalPages) {
        setPageInUrl(data.totalPages);
      }
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
      const url = editingId ? `/api/admin/hotels/${editingId}` : "/api/admin/hotels";
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

      await fetchHotels(page, activeQuery);
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
      const response = await fetch(`/api/admin/hotels/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("წაშლა ვერ მოხერხდა");
      }

      await fetchHotels(page, activeQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "დაფიქსირდა შეცდომა");
    }
  };

  const resetForm = () => {
    setFormData({
      hotelName: "",
      contactPhone: "",
      email: "",
      address: "",
      notes: "",
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleEdit = (hotel: Hotel) => {
    setFormData({
      hotelName: hotel.hotelName,
      contactPhone: hotel.contactPhone,
      email: hotel.email || "",
      address: hotel.address || "",
      notes: hotel.notes || "",
    });
    setEditingId(hotel.id);
    setShowAddForm(true);
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">სასტუმროების ბაზა</h2>
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

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQueryInUrl(query);
          }}
          placeholder="ძებნა სახელით ან მეილით…"
          className="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-md text-black"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQueryInUrl(query)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black"
          >
            ძებნა
          </button>
          {(searchParams.get("q") ?? "").trim().length > 0 && (
            <button
              type="button"
              onClick={() => setQueryInUrl("")}
              className="bg-gray-200 text-black px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              გასუფთავება
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">
            {editingId ? "რედაქტირება" : "ახალი სასტუმრო"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                სასტუმროს დასახელება *
              </label>
              <input
                type="text"
                required
                value={formData.hotelName}
                onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                საკონტაქტო ნომერი *
              </label>
              <input
                type="tel"
                required
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                ელ. ფოსტა
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              />
            </div>
            <div>
              <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                მისამართი
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

      {/* Hotels List */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სასტუმროს დასახელება
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                საკონტაქტო ნომერი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ელ. ფოსტა
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მისამართი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hotels.map((hotel) => (
              <tr key={hotel.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black font-semibold">
                  {hotel.hotelName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {hotel.contactPhone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {hotel.email || "-"}
                </td>
                <td className="px-6 py-4 text-[16px] md:text-[18px] text-black">
                  {hotel.address || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(hotel)}
                      className="text-blue-600 hover:underline"
                    >
                      რედაქტირება
                    </button>
                    <button
                      onClick={() => handleDelete(hotel.id)}
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

      <div className="flex items-center justify-between mt-4">
        <div className="text-[14px] md:text-[16px] text-black">
          სულ: <span className="font-semibold">{total}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setPageInUrl(page - 1)}
            disabled={page <= 1}
            className="px-3 py-2 rounded-md border border-gray-300 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            ← წინა
          </button>
          <div className="text-[14px] md:text-[16px] text-black">
            გვერდი <span className="font-semibold">{page}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageInUrl(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-2 rounded-md border border-gray-300 text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            შემდეგ → 
          </button>
        </div>
      </div>

      {hotels.length === 0 && !loading && (
        <div className="text-center py-8 text-black">
          სასტუმროები არ მოიძებნა
        </div>
      )}
    </div>
  );
}

