"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Partnior = {
  id: string;
  title: string;
  image: string[];
};

export default function Partniors() {
  const [items, setItems] = useState<Partnior[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/partniors", { cache: "no-store" });
        const data = await res.json().catch(() => []);
        setItems(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <section className="mt-24 mb-16">
      <div className="container max-w-7xl mx-auto px-4">
        <h2 className="text-[18px] mb-8 text-center md:text-[24px] font-bold text-black">
          ჩვენი პარტნიორები
        </h2>

        {loading ? (
          <div className="text-center text-black">იტვირთება...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-600">პარტნიორები არ მოიძებნა</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {items.map((p) => (
              <div key={p.id} className="flex flex-col items-center text-center">
                <div className="relative w-24 h-24 md:w-28 md:h-28 bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  {p.image?.[0] ? (
                    <Image
                      src={p.image[0]}
                      alt={p.title}
                      fill
                      className="object-contain p-3"
                    />
                  ) : null}
                </div>
                <div className="mt-3 text-[14px] md:text-[16px] text-black font-medium">
                  {p.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}