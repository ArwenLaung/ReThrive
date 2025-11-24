import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { NAV_LINKS } from "../constants";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("About");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white shadow-md py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="flex-shrink-0" aria-label="ReThrive @USM home">
          <Logo />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setActiveLink(link.label)}
              className={`text-sm font-semibold transition-colors relative pb-1 ${
                activeLink === link.label
                  ? 'text-brand-purple after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-brand-purple'
                  : "text-gray-500 hover:text-brand-purple"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <button className="bg-brand-brown hover:bg-[#c2884a] text-white px-8 py-2 rounded-md font-semibold transition-colors shadow-sm">
            Log In
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-brand-darkText"
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg border-t border-gray-100 py-4 px-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => {
                setActiveLink(link.label);
                setMobileMenuOpen(false);
              }}
              className="text-gray-700 font-medium py-2 border-b border-gray-50 hover:text-brand-purple"
            >
              {link.label}
            </a>
          ))}
          <button className="bg-brand-brown text-white w-full py-3 rounded-md font-bold mt-2">
            Log In
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
