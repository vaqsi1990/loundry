export default function About() {
  return (
    <section id="about" className="mt-24 ">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-[18px] mb-8  md:text-[24px] font-bold text-black mb-4">
            King Laundry
            </h2>
            <p className="md:text-xl text-[18px]  text-black mb-3">
              10+ წლის გამოცდილებით, Laundry City ემსახურება ათასობით კმაყოფილ
              მომხმარებელს უმაღლესი ხარისხის ქიმწმენდისა და სამრეცხაო სერვისებით.
            </p>
            <p className="md:text-xl text-[18px]  text-black mb-6">
              ჩვენ ვიყენებთ ეკოლოგიურად უსაფრთხო რეცხვის საშუალებებსა და თანამედროვე
              აღჭურვილობას
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-4xl  text-blue-600 mb-2">10+</div>
                <div className="text-black">წლის გამოცდილება</div>
              </div>
              <div>
                <div className="text-4xl  text-blue-600 mb-2">50K+</div>
                <div className="text-black">კმაყოფილი მომხმარებელი</div>
              </div>
              <div>
                <div className="text-4xl  text-blue-600 mb-2">100%</div>
                <div className="text-black">კმაყოფილება</div>
              </div>
              <div>
                <div className="text-4xl  text-blue-600 mb-2">24/7</div>
                <div className="text-black">მხარდაჭერა</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-200 rounded-xl h-96 flex items-center justify-center">
            <span className="text-black text-lg">სურათის ადგილი</span>
          </div>
        </div>
      </div>
    </section>
  );
}

