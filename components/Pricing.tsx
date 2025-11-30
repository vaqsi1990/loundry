export default function Pricing() {
  const plans = [
    {
      name: "ბაზური",
      price: "15₾",
      period: "ჩანთაზე",
      features: [
        "რეცხვა და დაკეცვა",
        "სტანდარტული საპონი",
        "24-48 საათიანი ვადა",
        "უფასო შეკრება",
      ],
      popular: false,
    },
    {
      name: "პრემიუმ",
      price: "35₾",
      period: "ჩანთაზე",
      features: [
        "რეცხვა და დაკეცვა",
        "პრემიუმ საპონი",
        "იმავე დღის სერვისი",
        "უფასო შეკრება და მიწოდება",
        "ქსოვილის დამზადებელი",
      ],
      popular: true,
    },
    {
      name: "დელუქს",
      price: "60₾",
      period: "ჩანთაზე",
      features: [
        "რეცხვა და დაკეცვა",
        "ეკოლოგიური საპონი",
        "ექსპრეს სერვისი (4 საათი)",
        "უფასო შეკრება და მიწოდება",
        "პრემიუმ ქსოვილის მოვლა",
        "ლაქების მოშორება",
      ],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            ფასები
          </h2>
          <p className="text-xl text-black max-w-2xl mx-auto">
            აირჩიეთ თქვენთვის ყველაზე შესაფერისი გეგმა
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-lg p-8 ${
                plan.popular
                  ? "border-4 border-blue-600 transform scale-105"
                  : "border-2 border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg -mt-8 -mx-8 mb-4">
                  ყველაზე პოპულარული
                </div>
              )}
              <h3 className="text-2xl font-bold text-black mb-2">
                {plan.name}
              </h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-blue-600">
                  {plan.price}
                </span>
                <span className="text-black ml-2">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-black">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                გეგმის არჩევა
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

