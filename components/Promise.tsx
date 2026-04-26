
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Promise() {
  const promises = [
    {
      icon: "❤️",
      title: "100% კმაყოფილების გარანტია",
      description:
        "თუ არ ხართ ჩვენი სერვისით კმაყოფილი და გაქვთ შენიშვნები ჩვენი გუნდი მზად ვართ გავითვალისწინოთ, გამოვასწოროთ და შემოგთავაზოთ თქვენთვის სასურველი უმაღლესი დონის ხარისხი",
    },
    {
      icon: "⏱️",
      title: "სწრაფი და მაღალი ხარისხი",
      description:
        "ჩვენი გუნდი მუშაობს იმისთვის, რომ თქვენ მიიღოთ სრულიად სუფთა, ულაქებო და თქვენზე მორგებული ხარისხის თეთრეული",
    },
   
  ];

  return (
    <section id="promise" className="py-20 bg-white">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Image Section */}
          <motion.div
            className="flex justify-center lg:justify-start"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative w-full max-w-md">
              <div className="  h-96 flex items-center justify-center">
                <Image  className="rounded-xl" src="/aa2d29f2-397f-4ebb-81e3-6d6893fb3e77.jpg" alt="Promise"  width={500} height={500} />
              </div>
            </div>
          </motion.div>

          {/* Right Promises Section */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            {promises.map((promise, index) => (
              <div key={index} className="flex gap-4">
                {/* Icon */}
               

                {/* Content */}
                <div>
                  <h3 className="text-[18px] md:text-[20px] font-bold text-black mb-2">
                    {promise.title}
                  </h3>
                  <p className="text-black text-[16px] md:text-[18px] leading-relaxed">
                    {promise.description}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

       
      </div>
    </section>
  );
}

