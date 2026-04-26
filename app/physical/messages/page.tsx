"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Thread = {
  id: string;
  messages: Array<{
    id: string;
    senderType: "ADMIN" | "HOTEL";
    body: string;
    createdAt: string;
  }>;
  hotel: { hotelName: string };
};

export default function PhysicalMessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/messages/threads");
      if (!res.ok) throw new Error("ჩატის ჩატვირთვა ვერ მოხერხდა");
      const data = (await res.json()) as Thread[];
      setThread(data?.[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "გაგზავნა ვერ მოხერხდა");
      }
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "დაფიქსირდა შეცდომა");
    } finally {
      setSending(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-[18px] md:text-[20px] text-gray-600">იტვირთება...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="bg-gray-50 px-4 sm:px-6 lg:px-8 mt-10 min-h-screen py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[18px] md:text-[24px] font-bold text-black">შეტყობინებები</h1>
          <button
            onClick={load}
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

        <div className="bg-white rounded-lg shadow-sm border p-3">
          <div className="border rounded-lg p-3 h-[60vh] overflow-auto bg-gray-50">
            {thread?.messages?.length ? (
              <div className="space-y-2">
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-lg p-3 ${
                      m.senderType === "HOTEL"
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
            ) : (
              <div className="text-gray-600">შეტყობინებები ჯერ არ არის</div>
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
              }}
              disabled={sending}
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
            >
              {sending ? "იგზავნება..." : "გაგზავნა"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

