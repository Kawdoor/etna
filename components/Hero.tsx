import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "../context/ConfigContext";
import { InventoryService, supabase } from "../services/supabase";
import { optimizeImage } from "../utils/imageOptimizer";
import { FloatingGeometryHero } from "./ui/FloatingGeometryHero";
import RichTextEditor from "./ui/RichTextEditor";
import { ThemeColorPicker } from "./ui/ThemeColorPicker";

const Hero: React.FC = () => {
  const { config, updateLocalConfig } = useConfig();
  const [scrollY, setScrollY] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for editing
  const [editValues, setEditValues] = useState({
    headline: "",
    subheadline: "",
    text: "",
    imageUrl: "",
    colors: {} as Record<string, { bg?: string; text?: string }>,
  });

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  // Initialize edit values when enabling edit mode or when config changes
  useEffect(() => {
    if (!isEditing) {
      setEditValues({
        headline: config.hero_headline || "ETNA",
        subheadline: config.hero_subheadline || "LIGHTING_TECH",
        text:
          config.hero_text ||
          "La interfaz definitiva entre la luz y el espacio. Sistemas de iluminación de alta precisión diseñados para el confort visual.",
        imageUrl: config.hero_image_url || "/images/hero.jpg",
        colors: config.theme_colors || {},
      });
    }
  }, [isEditing, config]);

  const handleSave = async () => {
    // If image changed and old one was from supabase, delete it
    if (
      editValues.imageUrl !== config.hero_image_url &&
      config.hero_image_url?.includes("supabase")
    ) {
      try {
        await InventoryService.deleteImage(config.hero_image_url);
      } catch (e) {
        console.error("Failed to delete old image:", e);
      }
    }

    await updateLocalConfig({
      hero_headline: editValues.headline,
      hero_subheadline: editValues.subheadline,
      hero_text: editValues.text,
      hero_image_url: editValues.imageUrl,
      theme_colors: editValues.colors,
    });
    setIsEditing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      // Convert to WebP
      const optimizedFile = await optimizeImage(file);

      const publicUrl = await InventoryService.uploadImage(optimizedFile);
      setEditValues((prev) => ({ ...prev, imageUrl: publicUrl }));
      toast.success("IMAGEN ACTUALIZADA");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("ERROR AL CARGAR IMAGEN. REVISE SESIÓN.");
    } finally {
      setIsUploading(false);
    }
  };

  const opacity = Math.max(0, 1 - scrollY / 600);
  const scale = Math.max(1, 1.1 - scrollY / 2000); // Starts at 1.1 to match original scale-110 feel, scales down

  const currentWrapperClass = isEditing
    ? `${editValues.colors?.hero?.bg || "bg-navyDark"} ${editValues.colors?.hero?.text || "text-white"} relative h-screen w-full flex items-center justify-center overflow-hidden group/hero transition-colors duration-500`
    : `${config.theme_colors?.hero?.bg || "bg-navyDark"} ${config.theme_colors?.hero?.text || "text-white"} relative h-screen w-full flex items-center justify-center overflow-hidden group/hero transition-colors duration-500`;

  return (
    <section id="hero" className={currentWrapperClass}>
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-24 right-6 z-50 flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/hero:opacity-100"
              title="Editar Hero"
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
                  strokeWidth="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 bg-blue-500/80 backdrop-blur-md rounded-full text-white hover:bg-blue-500 transition-all ${isUploading ? "animate-pulse w-auto px-4" : ""}`}
                title="Cambiar Imagen de Fondo"
                disabled={isUploading}
              >
                {isUploading ? (
                  <span className="text-[10px] font-futuristic tracking-wider">
                    OPTIMIZANDO...
                  </span>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
              <ThemeColorPicker
                sectionId="hero"
                colors={editValues.colors}
                onChange={(sectionId, bg, text) =>
                  setEditValues({
                    ...editValues,
                    colors: {
                      ...editValues.colors,
                      [sectionId]: { bg, text },
                    },
                  })
                }
              />
              <button
                onClick={handleSave}
                className="p-2 bg-green-500/80 backdrop-blur-md rounded-full text-white hover:bg-green-500 transition-all"
                title="Guardar Cambios"
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
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all"
                title="Cancelar Edición"
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
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      <div
        className="absolute inset-0 z-0 transition-transform duration-75 ease-out"
        style={{
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        {isEditing && editValues.imageUrl ? (
          <img
            src={editValues.imageUrl}
            alt="ETNA Modern Lighting"
            className="w-full h-full object-cover opacity-50 transition-all duration-500"
          />
        ) : config.hero_image_url &&
          config.hero_image_url !== "/images/hero.jpg" ? (
          <img
            src={config.hero_image_url}
            alt="ETNA Modern Lighting"
            className="w-full h-full object-cover opacity-50 transition-all duration-500"
          />
        ) : (
          <FloatingGeometryHero />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-navalBlue/30 via-transparent to-navalBlue/80 pointer-events-none"></div>
      </div>

      <div
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        style={{ opacity }}
      >
        <h1 className="font-futuristic text-6xl md:text-[10rem] font-thin tracking-tighter leading-[0.85] mb-12 flex flex-col items-center">
          {isEditing ? (
            <RichTextEditor
              tagName="span"
              initialValue={editValues.headline}
              onChange={(val) =>
                setEditValues({ ...editValues, headline: val })
              }
              className="bg-transparent border border-white/20 outline-none text-center w-full max-w-3xl focus:border-white transition-colors h-auto min-h-[6rem] p-2"
              placeholder="ETNA..."
            />
          ) : (
            <span
              dangerouslySetInnerHTML={{
                __html: config.hero_headline || "ETNA",
              }}
            />
          )}

          {isEditing ? (
            <RichTextEditor
              tagName="span"
              initialValue={editValues.subheadline}
              onChange={(val) =>
                setEditValues({ ...editValues, subheadline: val })
              }
              className="text-4xl md:text-6xl tracking-[0.2em] font-light bg-transparent border border-white/20 outline-none text-center w-full max-w-3xl focus:border-white transition-colors mt-4 p-2 min-h-[4rem]"
              placeholder="LIGHTING_TECH..."
            />
          ) : (
            <span
              className="text-4xl md:text-6xl tracking-[0.2em] font-light mt-2 md:mt-0 block"
              dangerouslySetInnerHTML={{
                __html: config.hero_subheadline || "LIGHTING_TECH",
              }}
            />
          )}
        </h1>

        {isEditing ? (
          <RichTextEditor
            tagName="p"
            initialValue={editValues.text}
            onChange={(val) => setEditValues({ ...editValues, text: val })}
            className="w-full max-w-2xl mx-auto bg-transparent border border-white/20 rounded p-4 outline-none text-neutral-400 font-light text-sm md:text-base tracking-[0.15em] leading-relaxed mb-16 uppercase focus:border-white focus:bg-white/5 h-auto min-h-[8rem]"
            placeholder="TEXTO PRINCIPAL..."
          />
        ) : (
          <p
            className="max-w-xl mx-auto text-neutral-400 font-light text-sm md:text-base tracking-[0.15em] leading-relaxed mb-16 uppercase"
            dangerouslySetInnerHTML={{
              __html:
                config.hero_text ||
                "La interfaz definitiva entre la luz y el espacio. Sistemas de iluminación de alta precisión diseñados para el confort visual.",
            }}
          />
        )}

        <div className="flex flex-col md:flex-row items-center justify-center gap-10">
          <a
            href="#showcase"
            className="group relative overflow-hidden px-12 py-5 border border-white/20 font-futuristic text-[9px] tracking-[0.4em] bg-white/5"
          >
            <span className="relative z-10">EXPLORAR_COLECCIÓN</span>
            <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <span className="absolute inset-0 flex items-center justify-center text-navalBlue opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 font-futuristic text-[9px] tracking-[0.4em]">
              COLECCIÓN_LUMÍNICA
            </span>
          </a>
        </div>
      </div>

      <div className="absolute bottom-12 left-12 flex flex-col gap-4">
        <div className="w-[1px] h-20 bg-gradient-to-b from-white to-transparent opacity-30"></div>
        <span className="font-futuristic text-[8px] tracking-[0.5em] vertical-text opacity-40">
          SCROLL_DOWN
        </span>
      </div>

      <style>{`.vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }`}</style>
    </section>
  );
};

export default Hero;
