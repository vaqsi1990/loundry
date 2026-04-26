"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { UploadButton } from "@/utils/uploadthing";
import { getApiPath } from "@/lib/api-helper";

type Partnior = {
  id: string;
  title: string;
  image: string[];
  createdAt: string;
  updatedAt: string;
};

export default function PartniorsSection() {
  const [items, setItems] = useState<Partnior[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const apiBase = getApiPath("partniors");

  const fetchItems = async () => {
    try {
      setError("");
      const res = await fetch(apiBase, { cache: "no-store" });
      if (!res.ok) throw new Error("პარტნიორების ჩატვირთვა ვერ მოხერხდა");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setTitle("");
    setImageUrls([]);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (p: Partnior) => {
    setTitle(p.title ?? "");
    setImageUrls(Array.isArray(p.image) ? p.image : []);
    setEditingId(p.id);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const titleTrimmed = title.trim();
    if (!titleTrimmed) {
      setError("სათაური სავალდებულოა");
      return;
    }
    if (!imageUrls.length) {
      setError("ლოგო სავალდებულოა");
      return;
    }

    const method = editingId ? "PUT" : "POST";
    const payload = editingId
      ? { id: editingId, title: titleTrimmed, image: imageUrls }
      : { title: titleTrimmed, image: imageUrls };

    const res = await fetch(apiBase, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let message = "ოპერაცია ვერ მოხერხდა";
      try {
        const data = await res.json();
        message = data?.error || message;
      } catch {
        // ignore
      }
      setError(message);
      return;
    }

    await fetchItems();
    resetForm();
  };

  const remove = async (id: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ წაშლა?")) return;
    setError("");

    const res = await fetch(`${apiBase}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      setError("წაშლა ვერ მოხერხდა");
      return;
    }
    await fetchItems();
  };

  if (loading) {
    return <div className="text-center py-8 text-black">იტვირთება...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">პარტნიორები</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
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

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black">
                {editingId ? "პარტნიორის რედაქტირება" : "ახალი პარტნიორი"}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-1">
                  სახელი / სათაური *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                />
              </div>

              <div>
                <label className="block text-[16px] md:text-[18px] font-medium text-black mb-2">
                  ლოგო *
                </label>

                <div className="flex items-center gap-4 flex-wrap">
                  <UploadButton
                    endpoint="imageUploader"
                    content={{
                      button: "ატვირთე ლოგო",
                    }}
                    appearance={{
                      button:
                        "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-[16px] md:text-[18px]",
                      allowedContent: "text-gray-600 text-[14px] md:text-[16px]",
                    }}
                    onClientUploadComplete={(files) => {
                      const urls = (files || [])
                        .map((f) => (f as any).url as string | undefined)
                        .filter((u): u is string => !!u);
                      if (urls.length) setImageUrls(urls);
                    }}
                    onUploadError={(e: Error) => {
                      setError(e.message || "ატვირთვა ვერ მოხერხდა");
                    }}
                  />

                  {imageUrls[0] && (
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded bg-gray-100 overflow-hidden border border-gray-200">
                        <Image src={imageUrls[0]} alt="logo" fill className="object-contain" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageUrls([])}
                        className="text-red-600 hover:underline"
                      >
                        წაშლა
                      </button>
                    </div>
                  )}
                </div>
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
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                ლოგო
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                სახელი
              </th>
              <th className="px-6 py-3 text-left text-[16px] md:text-[18px] font-medium text-black uppercase tracking-wider">
                მოქმედებები
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative w-14 h-14 rounded bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                    {p.image?.[0] ? (
                      <Image src={p.image[0]} alt={p.title} fill className="object-contain" />
                    ) : (
                      <span className="text-gray-500 text-[12px]">No logo</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px] text-black">
                  {p.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-[16px] md:text-[18px]">
                  <div className="flex space-x-3">
                    <button onClick={() => startEdit(p)} className="text-blue-600 hover:underline">
                      რედაქტირება
                    </button>
                    <button onClick={() => remove(p.id)} className="text-red-600 hover:underline">
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
        <div className="text-center py-8 text-black">პარტნიორები არ მოიძებნა</div>
      )}
    </div>
  );
}

