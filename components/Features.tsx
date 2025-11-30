export default function Features() {
  const features = [
    {
      icon: "⚡",
      title: "სწრაფი სერვისი",
      description: "იმავე დღის სერვისი გადაუდებელი საჭიროებებისთვის",
    },
    {
      icon: "✨",
      title: "ხარისხის გარანტია",
      description: "100% კმაყოფილების გარანტია ყველა სერვისზე",
    },
    {
      icon: "🌱",
      title: "ეკოლოგიური",
      description: "გარემოსთვის უსაფრთხო რეცხვის საშუალებების გამოყენება",
    },
    {
      icon: "💳",
      title: "მარტივი გადახდა",
      description: "მრავალი გადახდის ვარიანტი, ონლაინ ჩათვლით",
    },
  ];

  return (
    <section className="py-20 bg-blue-600 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            რატომ ავირჩიოთ ჩვენ
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            ჩვენ ვთავაზობთ განსაკუთრებულ სერვისს, რომელიც განსხვავებს ჩვენს
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="text-6xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
              <p className="text-blue-100">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

