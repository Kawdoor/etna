import Lenis from "lenis";
import React, { useEffect, useState } from "react";
import CartSidebar from "./components/CartSidebar";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import { CartProvider } from "./context/CartContext";
import { ConfigProvider } from "./context/ConfigContext";

// Add type declaration for window.lenis
declare global {
  interface Window {
    lenis: any;
  }
}

import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import About from "./components/About";
import AdminPanel from "./components/AdminPanel";
import Checkout from "./components/Checkout";
import ContactInfo from "./components/ContactInfo";
import FeatureGrid from "./components/FeatureGrid";
import FloatingAssistant from "./components/FloatingAssistant";
import Footer from "./components/Footer";
import ProductView from "./components/ProductView";
import VisionSection from "./components/VisionSection";
import { Product } from "./types";

const AppContent: React.FC = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    window.lenis = lenis;

    return () => {
      lenis.destroy();
      window.lenis = null;
    };
  }, []);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentView, setCurrentView] = useState<
    "home" | "collection" | "checkout"
  >("home");
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.querySelector(id);
    if (element) {
      // Use Lenis scroll if available, otherwise fallback
      if (window.lenis) {
        window.lenis.scrollTo(element);
      } else {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleNavigation = (
    view: "home" | "collection" | "about" | "contact" | "admin" | "checkout",
  ) => {
    if (view === "collection") {
      setCurrentView("collection");
      if (window.lenis) window.lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (view === "checkout") {
      setCurrentView("checkout");
      if (window.lenis) window.lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (view === "about") {
      if (currentView !== "home") {
        setCurrentView("home");
        setTimeout(() => scrollToSection("#about"), 100);
      } else {
        scrollToSection("#about");
      }
    } else if (view === "contact") {
      if (currentView !== "home") {
        setCurrentView("home");
        setTimeout(() => scrollToSection("#contact-info"), 100);
      } else {
        scrollToSection("#contact-info");
      }
    } else if (view === "admin") {
      setIsAdminOpen(true);
    } else {
      setCurrentView("home");
      if (window.lenis) window.lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();

          if (href === "#") {
            if (window.lenis) window.lenis.scrollTo(0);
            else window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }

          if (
            currentView !== "home" &&
            (href === "#about" ||
              href === "#contact-info" ||
              href === "#showcase" ||
              href === "#contact")
          ) {
            setCurrentView("home");
            setTimeout(() => scrollToSection(href), 100);
          } else {
            scrollToSection(href);
          }
        }
      }
    };
    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [currentView]);

  useEffect(() => {
    if (selectedProduct || isAdminOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [selectedProduct, isAdminOpen]);

  return (
    <div className="animate-gradient min-h-screen selection:bg-white selection:text-black relative">
      <CartSidebar onCheckout={() => handleNavigation("checkout")} />
      {!selectedProduct && !isAdminOpen && (
        <Navbar onNavigate={handleNavigation} />
      )}

      {currentView === "home" ? (
        <main className="animate-in fade-in duration-1000">
          <Hero />

          <div className="py-24 bg-black flex items-center justify-center border-y border-white/5 overflow-hidden">
            <div className="flex whitespace-nowrap animate-marquee">
              <span className="font-futuristic text-[8px] tracking-[2em] text-neutral-700 px-10">
                ETNA_LIGHTING - ARCHITECTURAL_ATMOSPHERE - PURE_MINIMALISM -
                NEURAL_LIGHTING_AI -
              </span>
              <span className="font-futuristic text-[8px] tracking-[2em] text-neutral-700 px-10">
                ETNA_LIGHTING - ARCHITECTURAL_ATMOSPHERE - PURE_MINIMALISM -
                NEURAL_LIGHTING_AI -
              </span>
            </div>
          </div>

          <FeatureGrid
            onSelectProduct={setSelectedProduct}
            showAll={false}
            onShowAll={() => setCurrentView("collection")}
          />

          <About />

          <ContactInfo />

          <VisionSection />
        </main>
      ) : currentView === "checkout" ? (
        <Checkout />
      ) : (
        <main className="animate-in slide-in-from-bottom-10 duration-1000 min-h-screen">
          <FeatureGrid onSelectProduct={setSelectedProduct} showAll={true} />
        </main>
      )}

      <Footer onAdminOpen={() => setIsAdminOpen(true)} />
      <FloatingAssistant />

      {selectedProduct && (
        <ProductView
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "rgba(0,0,0,0.8)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            fontFamily: "monospace",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          },
        }}
      />

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 50s linear infinite;
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider>
      <CartProvider>
        <AppContent />
        <Analytics />
      </CartProvider>
    </ConfigProvider>
  );
};

export default App;
