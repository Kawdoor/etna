import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";

interface NavbarProps {
  onNavigate: (
    view: "home" | "collection" | "about" | "contact" | "admin",
  ) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { items, setIsOpen } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "INICIO", action: () => onNavigate("home") },
    { name: "COLECCIÓN", action: () => onNavigate("collection") },
    { name: "NOSOTROS", action: () => onNavigate("about") },
    { name: "CONTACTO", action: () => onNavigate("contact") },
    { name: "ADMIN", action: () => onNavigate("admin") },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-[20000] transition-all duration-700 ${scrolled ? "bg-navalBlue/95 backdrop-blur-xl py-4 border-b border-white/5 shadow-2xl" : "bg-transparent py-8"}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative z-[20001]">
        <button
          onClick={() => onNavigate("home")}
          className="font-futuristic text-2xl tracking-[0.3em] font-extralight group relative cursor-pointer"
        >
          ETNA
        </button>

        <div className="hidden md:flex space-x-12 items-center">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={link.action}
              className="font-futuristic text-[11px] tracking-widest text-[#a3a3a3] hover:text-white transition-all duration-300 hover:tracking-[0.25em] cursor-pointer outline-none select-none"
            >
              {link.name}
            </button>
          ))}
          <button
            onClick={() => setIsOpen(true)}
            className="font-futuristic text-[11px] tracking-widest text-[#a3a3a3] hover:text-white transition-all duration-300 hover:tracking-[0.25em] cursor-pointer outline-none select-none flex items-center gap-2"
          >
            CART ({items.reduce((acc, item) => acc + item.quantity, 0)})
          </button>
        </div>

        <button
          className="md:hidden text-white relative z-[110]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M20 4H4v16h16M4 12h12"
            />
          </svg>
        </button>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-navalBlue/95 backdrop-blur-xl border-b border-white/5">
            <div className="flex flex-col space-y-4 py-6 px-6">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => {
                    link.action();
                    setIsMobileMenuOpen(false);
                  }}
                  className="font-futuristic text-[11px] tracking-widest text-[#a3a3a3] hover:text-white transition-all duration-300 hover:tracking-[0.25em] cursor-pointer outline-none select-none text-left"
                >
                  {link.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
