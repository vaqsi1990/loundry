import Image from "next/image";
export default function Services() {
  const services = [
    {
      image: '/1.png',
      title: "რეცხვა და დაკეცვა",
      description:
        "მოსახერხებელი რეცხვა და დაკეცვის სერვისი თქვენი ყოველდღიური სამრეცხაო საჭიროებებისთვის.",
    },
    {
      image: '/2.png',
      title: "კომერციული სერვისი",
      description:
        "პროფესიონალური სერვისი ბიზნესებისთვის. დიდი მოცულობის რეცხვა და თეთრეულის რეცხვა.",
    },
    {
      image: '/3.png',
      title: "ეკოლოგიური თეთრეულის რეცხვა",
      description:
        "ეკოლოგიურად უსაფრთხო თეთრეულის რეცხვა კოსტიუმების, კაბებისა და დელიკატური ქსოვილებისთვის.",
    },
    {
      image: '/4.png',
      title: "თვითმომსახურება",
      description:
        "თანამედროვე სამრეცხაო მანქანები და მშრალი გამოწმება თქვენი მოხერხებულობისთვის.",
    },
  ];

  return (
    <section id="services" className="mt-24 ">
      <div className="container max-w-7xl mx-auto px-4">
        <h2 className="text-[18px] mb-8 text-center md:text-[24px] font-bold text-black mb-4">ჩვენი სერვისები</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center"
            >
              {/* Icon Circle */}
                  <Image src={service.image} alt={service.title} width={96} height={96} />
              

              {/* Title */}
              <h3 className="md:text-xl text-[18px] font-bold text-black mb-3">{service.title}</h3>

              {/* Description */}
              <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

