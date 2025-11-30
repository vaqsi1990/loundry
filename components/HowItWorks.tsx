// Updated HowItWorks component styled like the reference image
import Image from "next/image";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
    image: "/delivery.png",
      title: "ირჩევთ წაღების დროს",
      description: "Select any convenient delivery time",
    },
    { 
      number: "02",
      image: "/wash.png",
      title: "ჩვენ ვასუფთავებთ",
      description: "Professional washing and drying",
    },
    {
      number: "03",
      image: "/returns.png",
      title: "ჩვენ ვაბრუნებთ სუფთა პროდუქტს",
      description: "Your clean items are safely returned",
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left image */}
          <div className="flex justify-center lg:justify-start">
            <Image
              src="/photo-1666934209606-a955a12edd63.jpg" // Replace with your actual image
              width={500}
              height={200}
              alt="Laundry Stack"
              className="rounded-lg shadow-md object-cover"
            />
          </div>

          {/* Right Section */}
          <div>
            <h2 className="text-[18px] mb-8 md:text-[24px] font-bold text-black">
             როგორ მუშაობს ჩვენი სერვისი
            </h2>
 

            {/* Steps */}
            <div className="grid grid-cols-1  md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="relative w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Image src={step.image} alt={step.title} width={40} height={40} />
                    <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-lg font-bold">
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-black md:text-[18px] text-[16px] font-bold mb-2 mt-2">{step.title}</h3>
                
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

