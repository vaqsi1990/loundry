'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import Image from 'next/image';

const slides = [
  {
    id: 1,
    title: 'პროფესიონალური თეთრეულის რეცხვა და სამრეცხაო სერვისები',
    description: 'ჩვენ ვზრუნავთ თქვენს თეთრეულზე უმაღლესი ხარისხის სერვისით. სწრაფი, საიმედო და ხელმისაწვდომი.',
    image: '/engin-akyurt-yCYVV8-kQNM-unsplash.jpg',
  },
  {
    id: 2,
    title: 'სწრაფი და ეფექტური მომსახურება',
    description: 'თანამედროვე ტექნოლოგიებით და პროფესიონალური გუნდით, ჩვენ ვაძლევთ საუკეთესო შედეგს.',
    image: '/Marriott-frameworks-bed-bedding-set-MAR-101-FW_xlrg.jpg',
  },
  {
    id: 3,
    title: 'უმაღლესი ხარისხის თეთრეულის რეცხვა',
    description: 'ჩვენი სერვისები უზრუნველყოფს თქვენი თეთრეულის სისუფთავესა და ხანგრძლივობას.',
    image: '/Woman_changing_a_guest_bed.jpg',
  },
];

export default function Hero() {
  return (
    <section id="home" className="relative text-white   overflow-hidden">
      <Swiper
        modules={[Pagination, Autoplay, EffectFade]}
        effect="fade"
        spaceBetween={0}
        slidesPerView={1}
        pagination={{ clickable: true, dynamicBullets: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop={true}
        className="h-full w-full"
      >
        {slides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className={`relative bg-gradient-to-r  min-h-[500px] md:min-h-[600px] flex items-center`}>
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  priority={slide.id === 1}
                />
                <div className="absolute inset-0 bg-black/40"></div>
              </div>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-3xl mx-auto text-center">
                  <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in">
                    {slide.title}
                  </h1>
                  <p className="text-xl md:text-2xl mb-8 text-white/90 animate-fade-in-delay">
                    {slide.description}
                  </p>
                
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom Swiper Styles */}
      <style jsx global>{`
       
    
        .swiper-pagination-bullet {
          background: white !important;
          opacity: 0.8;
          width: 12px;
          height: 12px;
          transition: all 0.3s ease;
        }
        .swiper-pagination-bullet-active {
          background: white !important;
          opacity: 1;
          width: 30px;
          border-radius: 6px;
        }
        .swiper-pagination {
          bottom: 30px !important;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s both;
        }
        .animate-fade-in-delay-2 {
          animation: fade-in 0.8s ease-out 0.4s both;
        }
      `}</style>
      
    
    </section>
  );
}

