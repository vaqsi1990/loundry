"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md shadow-sm">
      <nav className="container max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">

          <Link href="/" className="flex items-center space-x-2">

            <Image src="/logo.jpg" alt="Logo" className="rounded-lg shadow-md " width={60} height={60} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-black md:text-[18px] text-[16px] transition">
              მთავარი
            </Link>
            <Link href="#services" className="text-black md:text-[18px] text-[16px] transition">
              სერვისები
            </Link>
            <Link href="#about" className="text-black md:text-[18px] text-[16px] transition">
              ჩვენს შესახებ
            </Link>
            <Link href="/clean" className="text-black md:text-[18px] text-[16px] transition">
              რეცხვის გარემო
            </Link>

            <Link href="#contact" className="text-black md:text-[18px] text-[16px] transition">
              კონტაქტი
            </Link>
            {status === "authenticated" && session ? (
              <>
                <Link href="/profile" className="text-black md:text-[18px] text-[16px] transition">
                  პროფილი
                </Link>
                {(session.user as any)?.role === "ADMIN" && (
                  <Link href="/admin" className="text-black md:text-[18px] text-[16px] transition">
                    ადმინის პანელი
                  </Link>
                )}
                {(session.user as any)?.role === "MANAGER" && (
                  <Link href="/manager" className="text-black md:text-[18px] text-[16px] transition">
                    მენეჯერის პანელი
                  </Link>
                )}
                {(session.user as any)?.role === "MANAGER_ASSISTANT" && (
                  <Link href="/assistant" className="text-black md:text-[18px] text-[16px] transition">
                    მენეჯერის ასისტენტის პანელი
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full md:w-auto bg-gray-200 text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition hover:bg-gray-300"
                >
                  გასვლა
                </button>
              </>
            ) : (
              <Link href="/login" className="w-full md:w-auto font-bold bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition">
                შესვლა
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-black"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 space-y-4 pb-4">
            <Link
              href="/"
              className="block text-black text-[16px] transition"
              onClick={() => setIsMenuOpen(false)}
            >
              მთავარი
            </Link>
            <Link
              href="#services"
              className="block text-black text-[16px] transition"
              onClick={() => setIsMenuOpen(false)}
            >
              სერვისები
            </Link>
            <Link
              href="#about"
              className="block text-black text-[16px] transition"
              onClick={() => setIsMenuOpen(false)}
            >
              ჩვენს შესახებ
            </Link>
            <Link href="/clean" className="text-black text-[16px transition">
              რეცხვის გარემო
            </Link>
            <Link
              href="#contact"
              className="block text-black text-[16px] transition"
              onClick={() => setIsMenuOpen(false)}
            >
              კონტაქტი
            </Link>
            {status === "authenticated" && session ? (
              <>
                <Link
                  href="/profile"
                  className="block text-black text-[16px] transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  პროფილი
                </Link>
                {(session.user as any)?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="block text-black text-[16px] transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    ადმინის პანელი
                  </Link>
                )}
                {(session.user as any)?.role === "MANAGER" && (
                  <Link
                    href="/manager"
                    className="block text-black text-[16px] transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    მენეჯერის პანელი
                  </Link>
                )}
                {(session.user as any)?.role === "MANAGER_ASSISTANT" && (
                  <Link
                    href="/assistant"
                    className="block text-black text-[16px] transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    მენეჯერის ასისტენტის პანელი
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="w-full bg-gray-200 text-black text-[16px] px-6 py-2 rounded-lg cursor-pointer transition hover:bg-gray-300"
                >
                  გასვლა
                </button>
              </>
            ) : (
              <Link href="/login" className="w-full font-bold bg-[#efa758] text-black md:text-[18px] text-[16px] px-6 py-2 rounded-lg cursor-pointer transition">
                შესვლა
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

