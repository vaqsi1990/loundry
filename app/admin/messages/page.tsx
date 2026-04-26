"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Hotel = {
  id: string;
  hotelName: string;
  type: string;
  email: string;
  mobileNumber: string;
};

type Thread = {
  id: string;
  hotelId: string;
  lastMessageAt: string | null;
  updatedAt: string;
  hotel: {
    id: string;
    hotelName: string;
    type: string;
    email: string;
    mobileNumber: string;
  };
  messages: Array<{
    id: string;
    body: string;
    senderType: "ADMIN" | "MANAGER" | "HOTEL";
    createdAt: string;
  }>;
};

type Message = {
  id: string;
  conversationId: string;
  senderType: "ADMIN" | "MANAGER" | "HOTEL";
  body: string;
  createdAt: string;
};

export default function AdminMessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelSearch, setHotelSearch] = useState("");
  const [selectedHotelIds, setSelectedHotelIds] = useState<Record<string, boolean>>({});
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const sendAbortRef = useRef<AbortController | null>(null);
  const bulkAbortRef = useRef<AbortController | null>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );

  const filteredHotels = useMemo(() => {
    const q = hotelSearch.trim().toLowerCase();
    return (hotels ?? []).filter((h) => {
      if (!q) return true;
      return (
        h.hotelName?.toLowerCase().includes(q) ||
        h.email?.toLowerCase().includes(q) ||
        h.mobileNumber?.toLowerCase().includes(q)
      );
    });
  }, [hotels, hotelSearch]);

  const selectedIds = useMemo(
    () => Object.entries(selectedHotelIds).filter(([, v]) => v).map(([k]) => k),
    [selectedHotelIds]
  );

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = (session?.user as any)?.role;
    if (role !== "ADMIN" && role !== "MANAGER" && role !== "MANAGER_ASSISTANT") {
      router.push("/");
      return;
    }
    fetchThreads();
    fetchHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const fetchThreads = async () => {
    setLoadingThreads(true);
    setError("");
    try {
      const res = await fetch("/api/messages/threads");
      if (!res.ok) throw new Error("ჩატების ჩატვირთვა ვერ მოხერხდა");
      const data = (await res.json()) as Thread[];
      setThreads(data);
      if (!activeThreadId && data.length > 0) {
        setActiveThreadId(data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    setLoadingMessages(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/threads/${threadId}`);
      if (!res.ok) throw new Error("შეტყობინებების ჩატვირთვა ვერ მოხერხდა");
      const data = await res.json();
      setMessages((data?.messages ?? []) as Message[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchHotels = async () => {
    setLoadingHotels(true);
    try {
      const res = await fetch("/api/admin/our-hotels");
      if (!res.ok) throw new Error("სასტუმროების სიის ჩატვირთვა ვერ მოხერხდა");
      const data = (await res.json()) as any[];
      const mapped: Hotel[] = (data ?? []).map((h) => ({
        id: h.id,
        hotelName: h.hotelName,
        type: h.type,
        email: h.email,
        mobileNumber: h.mobileNumber,
      }));
      setHotels(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoadingHotels(false);
    }
  };

  const openHotel = async (hotelId: string) => {
    setError("");
    try {
      // If thread already exists in current list, just open it.
      const existing = threads.find((t) => t.hotelId === hotelId);
      if (existing) {
        // Clicking the same hotel again closes the active chat
        if (activeThreadId === existing.id) {
          setActiveThreadId(null);
          setMessages([]);
          return;
        }
        setActiveThreadId(existing.id);
        return;
      }

      const res = await fetch("/api/messages/threads/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "ჩატის შექმნა ვერ მოხერხდა");
      }
      const data = await res.json();
      await fetchThreads();
      setActiveThreadId(data.threadId as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    }
  };

  const closeActiveThread = () => {
    setActiveThreadId(null);
    setMessages([]);
  };

  const toggleSelect = (hotelId: string) => {
    setSelectedHotelIds((prev) => ({ ...prev, [hotelId]: !prev[hotelId] }));
  };

  const selectAllFiltered = () => {
    setSelectedHotelIds((prev) => {
      const next = { ...prev };
      for (const h of filteredHotels) next[h.id] = true;
      return next;
    });
  };

  const clearSelection = () => setSelectedHotelIds({});

  const bulkSend = async (mode: "selected" | "all") => {
    const body = bulkText.trim();
    if (!body) return;

    if (mode === "selected" && selectedIds.length === 0) {
      setError("აირჩიეთ მინიმუმ ერთი სასტუმრო");
      return;
    }

    if (mode === "all") {
      const ok = confirm("დარწმუნებული ხარ რომ ყველას გაუგზავნო შეტყობინება?");
      if (!ok) return;
    }

    setBulkSending(true);
    setError("");
    try {
      bulkAbortRef.current?.abort();
      const controller = new AbortController();
      bulkAbortRef.current = controller;

      const res = await fetch("/api/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          all: mode === "all",
          hotelIds: mode === "selected" ? selectedIds : undefined,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "გაგზავნა ვერ მოხერხდა");
      }
      setBulkText("");
      clearSelection();
      await fetchThreads();
      alert(`გაიგზავნა: ${data.sent}/${data.total}`);
      bulkAbortRef.current = null;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setBulkSending(false);
    }
  };

  const cancelBulkSend = () => {
    bulkAbortRef.current?.abort();
    bulkAbortRef.current = null;
    setBulkSending(false);
  };

  useEffect(() => {
    if (!activeThreadId) return;
    fetchMessages(activeThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]);

  const send = async () => {
    if (!activeThreadId) return;
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      sendAbortRef.current?.abort();
      const controller = new AbortController();
      sendAbortRef.current = controller;

      const res = await fetch(`/api/messages/threads/${activeThreadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "გაგზავნა ვერ მოხერხდა");
      }
      setText("");
      await Promise.all([fetchMessages(activeThreadId), fetchThreads()]);
      sendAbortRef.current = null;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSending(false);
    }
  };

  const cancelSend = () => {
    sendAbortRef.current?.abort();
    sendAbortRef.current = null;
    setSending(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-[18px] md:text-[20px] text-gray-600">იტვირთება...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[18px] md:text-[24px] font-bold text-black">
            შეტყობინებები (სასტუმროები)
          </h1>
          <button
            onClick={fetchThreads}
            className="bg-black text-white px-4 py-2 rounded-lg text-[14px] md:text-[16px]"
          >
            განახლება
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-3 lg:col-span-1">
            <div className="font-semibold text-black mb-2">ჩატები</div>
            
            <div className="mt-4 border-t pt-3">
              <div className="font-semibold text-black mb-2">სასტუმროების სია</div>
              <input
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                placeholder="ძებნა..."
                className="w-full border rounded-lg px-3 py-2 mb-2"
              />

              <div className="flex gap-2 mb-2">
                <button
                  onClick={selectAllFiltered}
                  className="flex-1 border rounded-lg px-3 py-2 text-[13px] hover:bg-gray-50"
                  type="button"
                >
                  მონიშნე ყველა (ფილტრი)
                </button>
                <button
                  onClick={clearSelection}
                  className="flex-1 border rounded-lg px-3 py-2 text-[13px] hover:bg-gray-50"
                  type="button"
                >
                  გასუფთავება
                </button>
              </div>

              {loadingHotels ? (
                <div className="text-gray-600">იტვირთება...</div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-auto">
                  {filteredHotels
                    .slice(0, 250)
                    .map((h) => (
                      <div
                        key={h.id}
                        className="w-full rounded-lg border border-gray-200 hover:bg-gray-50 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(selectedHotelIds[h.id])}
                            onChange={() => toggleSelect(h.id)}
                            className="mt-1"
                          />
                          <button
                            type="button"
                            onClick={() => openHotel(h.id)}
                            className="flex-1 text-left"
                          >
                            <div className="font-semibold text-black">{h.hotelName}</div>
                            <div className="text-[12px] text-gray-600">{h.email}</div>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-3 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-black">
                  {activeThread?.hotel?.hotelName ?? "აირჩიეთ ჩატი"}
                </div>
                {activeThread?.hotel?.email && (
                  <div className="text-[12px] text-gray-600">{activeThread.hotel.email}</div>
                )}
              </div>
              {activeThreadId && (
                <button
                  type="button"
                  onClick={closeActiveThread}
                  className="border px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  დახურვა
                </button>
              )}
            </div>

            <div className="border rounded-lg p-3 h-[55vh] overflow-auto bg-gray-50">
              {loadingMessages ? (
                <div className="text-gray-600">იტვირთება...</div>
              ) : messages.length === 0 ? (
                <div className="text-gray-600">შეტყობინებები ჯერ არ არის</div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-lg p-3 ${
                        m.senderType === "ADMIN"
                          ? "ml-auto bg-black text-white"
                          : "mr-auto bg-white text-black border"
                      }`}
                    >
                      <div className="text-[14px] whitespace-pre-wrap">{m.body}</div>
                      <div className="text-[11px] opacity-70 mt-1">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="შეტყობინება..."
                className="flex-1 border rounded-lg px-3 py-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                  if (e.key === "Escape") setText("");
                }}
                disabled={!activeThreadId || sending}
              />
              <button
                type="button"
                onClick={() => setText("")}
                disabled={!text || sending}
                className="border px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                გაუქმება
              </button>
              <button
                onClick={send}
                disabled={!activeThreadId || sending || !text.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
              >
                {sending ? "იგზავნება..." : "გაგზავნა"}
              </button>
              {sending && (
                <button
                  type="button"
                  onClick={cancelSend}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                  შეწყვეტა
                </button>
              )}
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="font-semibold text-black mb-2">
                მასობრივი გაგზავნა ({selectedIds.length} მონიშნული)
              </div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="შეტყობინება ყველასთვის ან მონიშნულებისთვის..."
                className="w-full border rounded-lg px-3 py-2 min-h-[96px]"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setBulkText("");
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setBulkText("")}
                  disabled={!bulkText || bulkSending}
                  className="border px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedIds.length === 0 || bulkSending}
                  className="border px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  არჩეულის გაუქმება
                </button>
                <button
                  type="button"
                  onClick={() => bulkSend("selected")}
                  disabled={bulkSending || !bulkText.trim() || selectedIds.length === 0}
                  className="flex-1 bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                >
                  {bulkSending ? "იგზავნება..." : "გაუგზავნე მონიშნულებს"}
                </button>
                <button
                  type="button"
                  onClick={() => bulkSend("all")}
                  disabled={bulkSending || !bulkText.trim()}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                >
                  {bulkSending ? "იგზავნება..." : "გაუგზავნე ყველას"}
                </button>
                {bulkSending && (
                  <button
                    type="button"
                    onClick={cancelBulkSend}
                    className="bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    შეწყვეტა
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

