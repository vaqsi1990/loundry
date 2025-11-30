"use client";

export default function Contact() {
  return (
    <section id="contact" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            დაგვიკავშირდით
          </h2>
          <p className="text-xl text-black max-w-2xl mx-auto">
            გაქვთ კითხვები? გვსიამოვნებს თქვენგან მოვისმინოთ
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <div>
            <form className="space-y-6">
              <div>
                <label className="block text-black font-semibold mb-2">
                  სახელი
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="თქვენი სახელი"
                />
              </div>
              <div>
                <label className="block text-black font-semibold mb-2">
                  ელფოსტა
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="თქვენი@ელფოსტა.com"
                />
              </div>
              <div>
                <label className="block text-black font-semibold mb-2">
                  ტელეფონი
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="+995 555 000 000"
                />
              </div>
              <div>
                <label className="block text-black font-semibold mb-2">
                  შეტყობინება
                </label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="თქვენი შეტყობინება..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                გაგზავნა
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-black mb-6">
                საკონტაქტო ინფორმაცია
              </h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">მისამართი</h4>
                    <p className="text-black">
                      თბილისი, საქართველო
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-2xl">📞</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">ტელეფონი</h4>
                    <p className="text-black">+995 555 123 456</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">ელფოსტა</h4>
                    <p className="text-black">info@laundrycity.ge</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-2xl">🕒</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-black mb-1">სამუშაო საათები</h4>
                    <p className="text-black">
                      ორშაბათი-პარასკევი: 08:00 - 20:00<br />
                      შაბათ-კვირა: 09:00 - 18:00
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

