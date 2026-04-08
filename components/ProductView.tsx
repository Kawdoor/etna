import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { useConfig } from "../context/ConfigContext";
import { GeminiService } from "../services/geminiService";
import { ConsultationService } from "../services/supabase";
import { Product } from "../types";
import { ImageWithLoader } from "./ui/ImageWithLoader";

interface ProductViewProps {
  product: Product;
  onClose: () => void;
}

const ProductView: React.FC<ProductViewProps> = ({ product, onClose }) => {
  const { addItem, setIsOpen } = useCart();
  const { config } = useConfig();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [clarification, setClarification] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    index: number;
  } | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("day");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [consultationForm, setConsultationForm] = useState({
    customerName: "",
    query: "Hola quisiera tener mas información sobre este producto",
  });

  const [customMessage, setCustomMessage] = useState(
    `Hola, estoy interesado en ${product.name}.`,
  );

  const handleConsultationSubmit = async () => {
    if (!consultationForm.customerName.trim()) {
      toast.error("POR FAVOR INGRESA TU NOMBRE");
      return;
    }

    try {
      await ConsultationService.addConsultation({
        customerName: consultationForm.customerName,
        productName: product.name,
        query: consultationForm.query,
      });
      toast.success("CONSULTA ENVIADA CORRECTAMENTE");
      setIsConsultationOpen(false);
      setConsultationForm((prev) => ({
        ...prev,
        customerName: "",
        query: "Hola quisiera tener mas información sobre este producto",
      }));
    } catch (error) {
      console.error(error);
      toast.error("ERROR AL ENVIAR CONSULTA");
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      // Check if click is inside the floating assistant
      const floatingAssistant = document.getElementById(
        "floating-assistant-container",
      );
      const isClickInAssistant =
        floatingAssistant && floatingAssistant.contains(target);

      if (
        modalRef.current &&
        !modalRef.current.contains(target) &&
        !isClickInAssistant
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);

  const allImages = useMemo(
    () => Array.from(new Set([product.image, ...product.gallery])),
    [product],
  );

  // Handle keys for fullscreen modal (ESC + Arrows)
  useEffect(() => {
    if (!lightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
      } else if (e.key === "ArrowRight" && lightbox.index !== -1) {
        const nextIndex = (lightbox.index + 1) % allImages.length;
        setLightbox({ src: allImages[nextIndex], index: nextIndex });
      } else if (e.key === "ArrowLeft" && lightbox.index !== -1) {
        const prevIndex =
          (lightbox.index - 1 + allImages.length) % allImages.length;
        setLightbox({ src: allImages[prevIndex], index: prevIndex });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightbox, allImages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserImage(reader.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVisualize = async () => {
    if (!userImage) return;
    setIsGenerating(true);
    try {
      const themeText =
        selectedTheme === "day"
          ? "during daytime"
          : selectedTheme === "night"
            ? "at night"
            : "at sunset";
      const fullPrompt = clarification
        ? `${clarification}. ${themeText}`
        : themeText;

      // Convert product image to base64
      let productBase64 = null;
      try {
        const response = await fetch(product.image);
        const blob = await response.blob();
        productBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Failed to load product image for AI", e);
      }

      if (productBase64) {
        const result = await GeminiService.visualizeLighting(
          userImage,
          productBase64,
          product.name,
          fullPrompt,
        );
        setResultImage(result);
        toast.success("VISUALIZACIÓN COMPLETADA");
      } else {
        toast.error("ERROR AL CARGAR IMAGEN DEL PRODUCTO");
      }
    } catch (error) {
      console.error(error);
      toast.error("ERROR AL PROCESAR IMAGEN");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `etna-visualization-${product.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={modalRef}
      data-lenis-prevent
      className="fixed inset-0 z-[50000] bg-navalBlue overflow-y-auto animate-in fade-in duration-700"
    >
      <div className="fixed top-0 left-0 w-full h-24 bg-navalBlue z-[-1]" />
      {/* Fullscreen Image Modal */}

      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-navalBlue/95 flex items-center justify-center p-4 md:p-10 cursor-zoom-out animate-in fade-in zoom-in-95 duration-300"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-10 right-10 text-white hover:rotate-90 transition-transform duration-300 z-[220]">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {allImages.length > 1 && lightbox.index !== -1 && (
            <>
              <button
                className="absolute left-4 md:left-10 text-white p-4 hover:bg-white/10 rounded-full transition-colors z-[210]"
                onClick={(e) => {
                  e.stopPropagation();
                  const prevIndex =
                    (lightbox.index - 1 + allImages.length) % allImages.length;
                  setLightbox({ src: allImages[prevIndex], index: prevIndex });
                }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                className="absolute right-4 md:right-10 text-white p-4 hover:bg-white/10 rounded-full transition-colors z-[210]"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextIndex = (lightbox.index + 1) % allImages.length;
                  setLightbox({ src: allImages[nextIndex], index: nextIndex });
                }}
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          <ImageWithLoader
            src={lightbox.src}
            className="max-w-full max-h-full object-contain shadow-2xl"
            alt="Fullscreen view"
            onClick={(e) => e.stopPropagation()}
            containerClassName="bg-transparent flex items-center justify-center w-full h-full"
          />

          {allImages.length > 1 && lightbox.index !== -1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[220] pointer-events-none">
              <span className="font-futuristic text-[10px] tracking-[0.3em] text-white/50">
                {lightbox.index + 1} / {allImages.length}
              </span>
            </div>
          )}
        </div>
      )}

      <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-[120] mix-blend-difference text-white">
        <button
          onClick={onClose}
          className="font-futuristic text-[10px] tracking-[0.3em] flex items-center gap-4 hover:opacity-50 transition-opacity"
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
              strokeWidth="1"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          VOLVER A COLECCIÓN
        </button>
        <span className="font-futuristic text-[10px] tracking-[0.5em] hidden md:block">
          TECH_SPECS // {product.id}
        </span>
      </nav>

      <section className="relative w-full h-[100dvh] flex items-end p-8 md:p-20 overflow-hidden group/hero">
        <div className="absolute inset-0 w-full h-full">
          <ImageWithLoader
            src={product.image}
            alt={product.name}
            containerClassName="!absolute !inset-0 !w-full !h-full"
            className="w-full h-full object-cover scale-105 animate-in fade-in duration-1000"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-navyDark via-navalBlue/40 to-transparent pointer-events-none"></div>

        <div className="relative z-10 w-full">
          <h1 className="font-futuristic text-5xl md:text-[10rem] leading-[0.85] tracking-tighter mb-8 font-extralight uppercase pointer-events-none">
            {product.name.split(" ").map((word, i) => (
              <span key={i} className={i % 2 !== 0 ? "italic opacity-50" : ""}>
                {word}{" "}
              </span>
            ))}
          </h1>
        </div>
      </section>

      <section className="bg-pullmanBrown text-white py-32 px-8 md:px-20">
        <div className="max-w-5xl mx-auto flex flex-col gap-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-16">
              <div>
                <h3 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-600 mb-8 uppercase">
                  ESPECIFICACIONES
                </h3>
                <p className="text-2xl md:text-3xl font-light leading-snug mb-12">
                  {product.longDescription}
                </p>
                <div className="grid grid-cols-2 gap-12">
                  {product.specs.map((spec, i) => (
                    <div key={i} className="border-t border-navalBlue/10 pt-6">
                      <span className="font-futuristic text-[9px] tracking-widest text-neutral-600 block mb-2">
                        {spec.label}
                      </span>
                      <span className="text-sm font-medium">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:sticky md:top-32 h-fit space-y-8 bg-navalBlue text-white p-8 rounded-lg animate-in slide-in-from-right-4 duration-1000 shadow-2xl">
              <div className="space-y-2">
                <span className="font-futuristic text-[10px] tracking-[0.3em] uppercase opacity-50">
                  {product.category} COLLECTION
                </span>
                <h2 className="font-futuristic text-4xl uppercase font-light tracking-wide">
                  {product.name}
                </h2>
                <div className="flex items-center flex-wrap gap-4">
                  {product.sale_price ? (
                    <div className="flex items-baseline gap-4">
                      <span className="text-3xl font-light text-red-400">
                        ${product.sale_price.toLocaleString()}
                      </span>
                      <span className="text-xl line-through text-white/50">
                        $
                        {product.price ? product.price.toLocaleString() : "999"}
                      </span>
                      <span className="px-2 py-1 bg-red-500/20 text-red-300 text-[9px] font-futuristic tracking-widest rounded border border-red-500/30">
                        -
                        {product.price && product.sale_price
                          ? Math.round(
                              ((product.price - product.sale_price) /
                                product.price) *
                                100,
                            )
                          : 0}
                        % OFF
                      </span>
                    </div>
                  ) : (
                    <div className="text-3xl font-light">
                      $
                      {product.price
                        ? product.price.toLocaleString()
                        : product.category === "tech"
                          ? "999"
                          : "399"}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      // Add price if missing in product object
                      const price =
                        product.price ||
                        (product.category === "tech" ? 999 : 399);
                      addItem({ ...product, price });
                      setIsOpen(true);
                      onClose();
                    }}
                    className="bg-white text-navalBlue px-8 py-3 rounded-full hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 font-futuristic text-xs tracking-widest uppercase shadow-xl"
                    aria-label="Agregar al carrito"
                  >
                    AGREGAR AL CARRITO
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-white/70 font-light space-y-2 pt-4 border-t border-white/10">
                <textarea
                  className="w-full bg-white/5 border border-white/10 p-3 text-xs font-light text-white outline-none focus:border-white/30 transition-colors resize-none mb-2 rounded"
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      const phone = config.contact_phone.replace(/\D/g, "");
                      const text = encodeURIComponent(customMessage);
                      window.open(
                        `https://wa.me/${phone}?text=${text}`,
                        "_blank",
                      );
                    }}
                    className="flex-1 py-3 border border-white/20 hover:bg-white hover:text-navalBlue transition-all text-xs font-futuristic tracking-widest uppercase flex items-center justify-center gap-2 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WHATSAPP
                  </button>
                  <button
                    onClick={() => {
                      // Logic to open AI assistant with product context
                      const event = new CustomEvent("open-ai-assistant", {
                        detail: {
                          initialMessage: customMessage,
                        },
                      });
                      window.dispatchEvent(event);
                    }}
                    className="flex-1 py-3 border border-white/20 hover:bg-white hover:text-navalBlue transition-all text-xs font-futuristic tracking-widest uppercase flex items-center justify-center gap-2 rounded"
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    IA_CONSULT
                  </button>
                </div>
                <p>— ENVÍO INTERNACIONAL DISPONIBLE</p>
                <p>— GARANTÍA DE 5 AÑOS</p>
                <p>— INSTALACIÓN PROFESSIONAL RECOMENDADA</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <h3 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-600 mb-0 uppercase">
              Galería
            </h3>
            {allImages.map((img, idx) => (
              <div
                key={idx}
                className="aspect-video bg-neutral-100 overflow-hidden group border border-navalBlue/5 cursor-pointer"
                onClick={() => setLightbox({ src: img, index: idx })}
              >
                <ImageWithLoader
                  src={img}
                  alt={`Gallery ${idx}`}
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                />
              </div>
            ))}
          </div>

          {/* AI Room Visualizer Section */}
          <div className="border-t border-navalBlue/10 pt-24">
            <h3 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-600 mb-12 uppercase text-center">
              AI ROOM VISUALIZER
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              {/* Controls Column */}
              <div className="space-y-8">
                {!config.ai_active ? (
                  <div className="h-full flex items-center justify-center border border-dashed border-neutral-300 dark:border-white/10 p-12 text-center text-neutral-600">
                    <div className="space-y-4">
                      <svg
                        className="w-8 h-8 mx-auto opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1"
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      <p className="text-xs font-futuristic tracking-widest">
                        AI_MODULE_DISABLED
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Upload Box */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video bg-neutral-800/50 border border-dashed border-white/20 hover:border-white transition-colors cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden rounded-lg"
                    >
                      {userImage ? (
                        <img
                          src={userImage}
                          alt="User room"
                          className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="text-center space-y-4">
                          <svg
                            className="w-8 h-8 mx-auto opacity-40 text-neutral-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          <span className="font-futuristic text-[9px] tracking-widest text-neutral-400 block">
                            SUBIR_FOTO_ESPACIO
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>

                    {/* Render Controls - Only if image uploaded */}
                    {userImage && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-4">
                          <label className="font-futuristic text-[8px] tracking-[0.3em] text-neutral-400 uppercase block">
                            1. VISIÓN_ALGORÍTMICA
                          </label>
                          <textarea
                            value={clarification}
                            onChange={(e) => setClarification(e.target.value)}
                            placeholder="Describe el ambiente (ej: 'Minimalista, mucha luz, paredes blancas')..."
                            className="w-full bg-neutral-800/50 border border-white/10 p-4 text-sm font-light text-white focus:border-white focus:outline-none transition-colors min-h-[100px] resize-none rounded-lg"
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="font-futuristic text-[8px] tracking-[0.3em] text-neutral-400 uppercase block">
                            2. ESCENA_LUMÍNICA
                          </label>
                          <div className="grid grid-cols-3 gap-4">
                            {/* Buttons with specific hover colors */}
                            {[
                              {
                                id: "day",
                                label: "DÍA",
                                color: "bg-sky-300",
                                text: "text-navalBlue",
                              },
                              {
                                id: "sunset",
                                label: "ATARDECER",
                                color: "bg-orange-400",
                                text: "text-white",
                              },
                              {
                                id: "night",
                                label: "NOCHE",
                                color: "bg-navalBlue",
                                text: "text-white",
                              },
                            ].map((theme) => (
                              <button
                                key={theme.id}
                                onClick={() => setSelectedTheme(theme.id)}
                                className={`relative py-4 border border-white/10 overflow-hidden group transition-all duration-300 rounded-lg ${selectedTheme === theme.id ? "border-transparent" : "bg-neutral-800/50"}`}
                              >
                                <div
                                  className={`absolute inset-0 transition-transform duration-500 ease-out ${selectedTheme === theme.id ? `translate-y-0 ${theme.color}` : `translate-y-full group-hover:translate-y-0 ${theme.color}`}`}
                                />
                                <span
                                  className={`relative z-10 font-futuristic text-[9px] tracking-widest transition-colors duration-300 ${selectedTheme === theme.id ? theme.text : "text-neutral-400 group-hover:" + theme.text}`}
                                >
                                  {theme.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleVisualize}
                          disabled={isGenerating}
                          className="w-full bg-white text-navalBlue py-6 rounded-lg font-futuristic text-[10px] tracking-[0.3em] uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                          {isGenerating
                            ? "PROCESANDO_SIMULACIÓN..."
                            : "3. RENDERIZAR_ESPACIO"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Result Column */}
              <div className="aspect-square bg-neutral-800/50 rounded-lg relative overflow-hidden border border-white/5">
                {resultImage ? (
                  <div className="relative w-full h-full group">
                    <ImageWithLoader
                      src={resultImage}
                      alt="Room Visualization Result"
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() =>
                        setLightbox({ src: resultImage, index: -1 })
                      }
                    />
                    <button
                      onClick={handleDownload}
                      className="absolute bottom-6 right-6 bg-pullmanBrown text-white p-4 opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-navalBlue hover:text-white"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-futuristic text-[9px] tracking-widest text-neutral-300 uppercase rotate-90 md:rotate-0">
                      VISTA_PREVIA_RENDER
                    </span>
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-navalBlue border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 px-8 md:px-20 text-center">
        <h2 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-600 mb-8">
          ¿INTERESADO EN {product.name}?
        </h2>
        <button
          onClick={() => setIsConsultationOpen(true)}
          className="text-3xl md:text-5xl font-extralight border-b border-white/20 hover:border-white transition-colors pb-4 inline-block uppercase bg-transparent p-0"
        >
          SOLICITAR TECH INFO <span className="italic opacity-30">_TECH</span>
        </button>
      </section>

      {isConsultationOpen && (
        <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-navalBlue/90 backdrop-blur-md"
            onClick={() => setIsConsultationOpen(false)}
          />
          <div className="bg-pullmanBrown text-white w-full max-w-lg p-8 border border-neutral-200 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-futuristic text-lg tracking-[0.2em] mb-8 uppercase border-b border-navalBlue/10 pb-4">
              SOLICITUD DE INFORMACIÓN TÉCNICA
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                  Producto
                </label>
                <input
                  disabled
                  className="w-full bg-neutral-100 border border-neutral-200 p-3 text-sm text-neutral-500"
                  value={product.name}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                  Tu Nombre
                </label>
                <input
                  autoFocus
                  placeholder="NOMBRE COMPLETO"
                  className="w-full bg-neutral-50 border border-neutral-200 p-3 text-sm focus:border-navalBlue outline-none transition-colors"
                  value={consultationForm.customerName}
                  onChange={(e) =>
                    setConsultationForm({
                      ...consultationForm,
                      customerName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                  Consulta
                </label>
                <textarea
                  placeholder="DETALLE DE LA CONSULTA..."
                  className="w-full bg-neutral-50 border border-neutral-200 p-3 text-sm focus:border-navalBlue outline-none transition-colors min-h-[120px] resize-none"
                  value={consultationForm.query}
                  onChange={(e) =>
                    setConsultationForm({
                      ...consultationForm,
                      query: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end mt-8 pt-4 border-t border-neutral-100">
              <button
                onClick={() => setIsConsultationOpen(false)}
                className="px-6 py-3 text-[10px] font-futuristic tracking-widest text-neutral-500 hover:text-navalBlue transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConsultationSubmit}
                className="px-8 py-3 text-[10px] font-futuristic tracking-widest bg-pullmanBrown text-white hover:opacity-80 transition-opacity"
              >
                ENVIAR SOLICITUD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductView;
