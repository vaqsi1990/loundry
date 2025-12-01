import Image from "next/image";

export default function Promise() {
  const promises = [
    {
      icon: "❤️",
      title: "100% კმაყოფილების გარანტია",
      description:
        "თუ ჩვენი რეცხვის ან თეთრეულის რეცხვის შედეგით არ ხართ სრულად კმაყოფილი, ჩვენ უფასოდ გადავრეცხავთ თქვენს თეთრეულს!",
    },
    {
      icon: "⏱️",
      title: "სწრაფი და მაღალი ხარისხი",
      description:
        "ჩვენ ვმუშაობთ იმისთვის, რომ თქვენ მიიღოთ სრულად სუფთა და მზად თეთრეული.",
    },
    {
      icon: "🌱",
      title: "სუფთა და ეკოლოგიური",
      description:
        "ჩვენ ვმუშაობთ გარემოს გათვალისწინებით. არ ვიყენებთ მკაცრ ქიმიკატებს. მხოლოდ ეკოლოგიურად დამტკიცებული პროდუქტები.",
    },
  ];

  return (
    <section id="promise" className="py-20 bg-white">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Image Section */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative w-full max-w-md">
              <div className="bg-gray-200 rounded-xl h-96 flex items-center justify-center">
                <span className="text-black text-lg">სურათის ადგილი</span>
              </div>
            </div>
          </div>

          {/* Right Promises Section */}
          <div className="space-y-8">
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
          </div>
        </div>

       
      </div>
    </section>
  );
}

