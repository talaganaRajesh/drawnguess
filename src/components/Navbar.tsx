"use client";

import Link from "next/link";
import { FaGithub } from "react-icons/fa";

const Navbar = () => {
  return (
    <nav className="w-full bg-gradient-to-t from-indigo-50 to-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left Side: Logo */}
        <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 transition">
          Draw <span className="text-indigo-600">N</span> Guess
        </Link>

        {/* Right Side: GitHub Button */}
        <a
          href="https://github.com/talaganaRajesh"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded-lg transition duration-200"
        >
          <FaGithub className="text-xl" />
          GitHub
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
