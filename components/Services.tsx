"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
export default function Services() {
  const services = [
    {
      image: '/transport.png',
      title: "ტრანსპორტირება",
      description:
        "პუნქტუალურობა მიღება-ჩაბარების თქვენთვის მოსახერხებელი და შეთანხმებული გრაფიკის მიხედვით",
    },
    {
      image: '/4.png',
      title: "რეცხვა-შრობა-დაუთოება",
      description:
        "ინდუსტრიული მაღალი კლასის ტექნიკა და უმაღლესი ხარისხის, ეკოლოგიურად სუფთა სარეცხი საშუალებები",
    },
    {
      image: '/dry.png',
      title: "დაკეცვა-შეფუთვა",
      description:
        "თითოეული პარტიის ინდივიდუალური კონტროლი და უმაღლესი ხარისხი",
    },
    {
      image: '/web.png',
      title: "ელექტრონული სისტემა",
      description:
        "მომსახურების მარტივი ელექტრონული სისტემა საშუალებას გაძლევთ აკონტროლოთ მიღება-ჩაბარება და  ფინანსური ხარჯები",
    },
    {
      image: '/washing.png',
      title: "სატესტო რეცხვა",
      description:
        "პირველი თანამშრომლობის ფარგლებში გთავაზობთ სატესტო რეცხვას , რათა უშუალოდ დარწმუნდეთ ჩვენი სერვისის ხარისხში",
    },
    {
      image: '/2.png',
      title: "სასტუმროები-რესტორნები",
      description:
        "ვემსახურებით მხოლოდ სასტუმროებს და რესტორნებს",
    },
  ];

  const easeOut = [0.16, 1, 0.3, 1] as const;

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.05 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: easeOut },
    },
  };

  return (
    <section id="services" className="mt-24 ">
      <div className="container max-w-7xl mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.45, ease: easeOut }}
          className="text-[18px] mb-8 text-center md:text-[24px] font-bold text-black mb-4"
        >
          ჩვენი სერვისები
        </motion.h2>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center"
              variants={item}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              {/* Icon Circle */}
                  <Image src={service.image} alt={service.title} width={96} height={96} />
              

           

              {/* Description */}
                <span className="md:text-[18px] text-[16px] font-semibold">{service.title} </span> 
              <p className="text-black text-[16px] leading-relaxed">
                <span>{service.description}</span>
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

