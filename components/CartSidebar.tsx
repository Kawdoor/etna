import React, { useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";

const CartSidebar: React.FC<{ onCheckout?: () => void }> = ({ onCheckout }) => {
  const { isOpen, setIsOpen, items, updateQuantity, total } = useCart();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleCheckout = () => {
    setIsOpen(false);
    if (onCheckout) {
      onCheckout();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-navalBlue/80 backdrop-blur-sm z-[20050] transition-opacity duration-500 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#111] z-[20060] shadow-2xl transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-8 border-b border-navalBlue/5 dark:border-white/5 flex justify-between items-center">
          <div>
            <h3 className="font-futuristic text-2xl tracking-[0.2em] font-light uppercase dark:text-white text-navalBlue">
              Tu Selección
            </h3>
            <p className="text-[10px] font-futuristic tracking-widest text-neutral-500 mt-1">
              {items.reduce((acc, item) => acc + item.quantity, 0)} ITEMS
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-navalBlue/5 dark:hover:bg-white/5 rounded-full transition-colors dark:text-white text-navalBlue"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-8 space-y-8"
        >
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <svg
                className="w-12 h-12 dark:text-white text-navalBlue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="font-futuristic text-[10px] tracking-widest uppercase dark:text-white text-navalBlue">
                Tu carrito está vacío
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group flex gap-6 items-start animate-in slide-in-from-right-4 duration-500"
              >
                <div className="w-20 h-24 bg-neutral-100 dark:bg-navalBlue overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-futuristic text-[11px] tracking-widest uppercase dark:text-white text-navalBlue">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => updateQuantity(item.id, 0)}
                      className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                      title="Eliminar producto"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500">{item.category}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-navalBlue/10 dark:border-white/10 dark:text-white text-navalBlue">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        className="px-3 py-1 hover:bg-navalBlue/5 dark:hover:bg-white/5 transition-colors"
                      >
                        -
                      </button>
                      <span className="px-3 text-[10px] font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="px-3 py-1 hover:bg-navalBlue/5 dark:hover:bg-white/5 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-light text-sm dark:text-white text-navalBlue">
                      $
                      {(
                        parseFloat(item.category === "tech" ? "999" : "399") *
                        item.quantity
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 border-t border-navalBlue/5 dark:border-white/5 bg-neutral-50 dark:bg-navyDark space-y-6">
          <div className="flex justify-between items-end">
            <span className="font-futuristic text-[10px] tracking-widest text-neutral-500 uppercase">
              Subtotal
            </span>
            <span className="font-light text-2xl dark:text-white text-navalBlue">
              ${total.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            className="w-full bg-navalBlue dark:bg-white text-white dark:text-navalBlue py-4 font-futuristic text-[10px] tracking-[0.3em] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            CHECKOUT
          </button>
        </div>
      </div>
    </>
  );
};

export default CartSidebar;
