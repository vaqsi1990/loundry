import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
             
              <span className="text-2xl font-bold">King Laundry</span>
            </div>
            
          
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">სწრაფი ბმულები</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#home" className="text-white hover:text-white transition">
                  მთავარი
                </Link>
              </li>
              <li>
                <Link href="#services" className="text-white hover:text-white transition">
                  სერვისები
                </Link>
              </li>
              <li>
                <Link href="#about" className="text-white hover:text-white transition">
                  ჩვენს შესახებ
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-white hover:text-white transition">
                  ფასები
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">კონტაქტი</h3>
            <ul className="space-y-2 text-white">
              <li>თბილისი, საქართველო</li>
              <li>+995 555 123 456</li>
              <li>info@laundrycity.ge</li>
            </ul>
          </div>
        </div>

    
      </div>
    </footer>
  );
}

