import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { OrderService } from "../services/supabase";

const Checkout: React.FC = () => {
  const { items, total, clearCart, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    zipCode: "",
    country: "Argentina", // Default
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (items.length === 0) {
      setError("El carrito está vacío.");
      setLoading(false);
      return;
    }

    try {
      // Create order object matching public.orders table
      const order = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        address: `${formData.address}, ${formData.city}, ${formData.zipCode}, ${formData.country}`,
        status: "pending",
      };

      await OrderService.addOrder(order, items);

      setSuccess(true);
      clearCart();
    } catch (err: any) {
      console.error("Error creating order:", err);
      setError(
        "Hubo un error al procesar tu pedido. Por favor intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navalBlue text-white flex flex-col items-center justify-center p-6 text-center pt-32">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-8 bg-white/5">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="font-futuristic text-4xl mb-4 tracking-widest">
            PEDIDO CONFIRMADO
          </h2>
          <p className="text-neutral-400 font-light tracking-wide mb-8">
            Gracias por tu compra. Hemos enviado los detalles de confirmación a{" "}
            <span className="text-white">{formData.email}</span>.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-pullmanBrown text-white font-futuristic text-xs tracking-[0.3em] hover:bg-pullmanBrown/90 transition-colors"
          >
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navalBlue text-white pt-32 pb-24 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Form Section */}
        <div className="space-y-12">
          <div>
            <h2 className="font-futuristic text-3xl mb-2 tracking-widest">
              CHECKOUT
            </h2>
            <p className="text-neutral-500 font-light text-sm tracking-wider uppercase">
              INFORMACIÓN DE ENVÍO
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                  Nombre
                </label>
                <input
                  required
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-navalBlue border-b border-white/20 py-3 text-white outline-none focus:border-white transition-colors rounded-none placeholder:text-neutral-800"
                  placeholder="NOMBRE"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                  Apellido
                </label>
                <input
                  required
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-navalBlue border-b border-white/20 py-3 text-white outline-none focus:border-white transition-colors rounded-none"
                  placeholder="APELLIDO"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                Email
              </label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-navalBlue border-b border-white/20 py-3 text-white outline-none focus:border-white transition-colors rounded-none"
                placeholder="CORREO ELECTRÓNICO"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                Dirección
              </label>
              <input
                required
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full bg-navalBlue border-b border-white/20 py-3 text-white outline-none focus:border-white transition-colors rounded-none"
                placeholder="CALLE Y NÚMERO"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                  Ciudad
                </label>
                <input
                  required
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full bg-navalBlue border-b border-white/20 py-3 text-white outline-none focus:border-white transition-colors rounded-none"
                  placeholder="CIUDAD"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                  Código Postal
                </label>
                <input
                  required
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className="w-full bg-navalBlue border-b border-white/20 py-3 text-white outline-none focus:border-white transition-colors rounded-none"
                  placeholder="CP"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs tracking-widest uppercase">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-pullmanBrown text-white font-futuristic text-xs tracking-[0.3em] hover:bg-pullmanBrown/90 transition-colors mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "PROCESANDO..." : "CONFIRMAR PEDIDO"}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:pl-12 lg:border-l border-white/10">
          <div className="sticky top-32">
            <h2 className="font-futuristic text-xl mb-8 tracking-widest text-right">
              RESUMEN
            </h2>

            <div className="space-y-6 mb-8">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 group">
                  <div className="w-16 h-20 bg-navalBlue shrink-0 relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-futuristic text-[10px] tracking-widest uppercase mb-1 truncate pr-2 text-white">
                        {item.name}
                      </h3>
                      <button
                        onClick={() => updateQuantity(item.id, 0)}
                        className="text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    <p className="text-[9px] text-neutral-500 tracking-wider">
                      CANT: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-light tracking-wide text-sm">
                      $
                      {(
                        (item.price || (item.category === "tech" ? 999 : 399)) *
                        item.quantity
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/20 pt-6 space-y-2">
              <div className="flex justify-between text-neutral-400 text-sm tracking-wider">
                <span>SUBTOTAL</span>
                <span>${total}</span>
              </div>
              <div className="flex justify-between text-neutral-400 text-sm tracking-wider">
                <span>ENVÍO</span>
                <span>GRATIS</span>
              </div>
              <div className="flex justify-between text-white text-xl tracking-wider pt-4 font-light">
                <span>TOTAL</span>
                <span>${total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
