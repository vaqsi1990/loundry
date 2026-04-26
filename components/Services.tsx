import Image from "next/image";
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

  return (
    <section id="services" className="mt-24 ">
      <div className="container max-w-7xl mx-auto px-4">
        <h2 className="text-[18px] mb-8 text-center md:text-[24px] font-bold text-black mb-4">ჩვენი სერვისები</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center"
            >
              {/* Icon Circle */}
                  <Image src={service.image} alt={service.title} width={96} height={96} />
              

           

              {/* Description */}
                <span className="md:text-[18px] text-[16px] font-semibold">{service.title} </span> 
              <p className="text-black text-[16px] leading-relaxed">
                <span>{service.description}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

