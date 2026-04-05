import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "../context/ConfigContext";
import { InventoryService, supabase } from "../services/supabase";
import { optimizeImage } from "../utils/imageOptimizer";
import { ImageWithLoader } from "./ui/ImageWithLoader";
import RichTextEditor from "./ui/RichTextEditor";

const VisionSection: React.FC = () => {
  const { config, updateLocalConfig } = useConfig();
  const sectionRef = useRef<HTMLElement>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editValues, setEditValues] = useState({
    text: "",
    imageUrl: "",
  });

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setIsAdmin(!!session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setIsAdmin(!!session),
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setEditValues({
        text:
          config.vision_text ||
          "Diseño que trasciende la función para convertirse en <span class='text-white opacity-100 not-italic'>luz pura.</span>",
        imageUrl:
          config.vision_image_url ||
          "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070",
      });
    }
  }, [isEditing, config]);

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        // We want the image to move slower than scroll (background parallax).
        // As we scroll down (rect.top decreases), we want the image to move DOWN relative to container (translateY increases).
        // Example: rect.top goes 500 -> 0. offset goes -150 -> 0.
        setOffsetY(rect.top * -0.3);
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Trigger once on mount
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSave = async () => {
    // If image changed and old one was from supabase, delete it
    if (
      editValues.imageUrl !== config.vision_image_url &&
      config.vision_image_url?.includes("supabase")
    ) {
      try {
        await InventoryService.deleteImage(config.vision_image_url);
      } catch (e) {
        console.error("Failed to delete old image:", e);
      }
    }

    await updateLocalConfig({
      vision_text: editValues.text,
      vision_image_url: editValues.imageUrl,
    });
    setIsEditing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const file = await optimizeImage(e.target.files[0]);
      const url = await InventoryService.uploadImage(file);
      setEditValues((prev) => ({ ...prev, imageUrl: url }));
      toast.success("IMAGEN ACTUALIZADA");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("ERROR AL CARGAR IMAGEN");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="h-[80vh] relative flex items-center justify-center bg-navalBlue overflow-hidden group/vision"
    >
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-24 right-6 z-50 flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/vision:opacity-100"
              title="Editar Sección"
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
                className={`p-2 bg-blue-500/80 backdrop-blur-md rounded-full text-white hover:bg-blue-500 transition-all ${isUploading ? "animate-pulse" : ""}`}
                title="Cambiar Imagen"
                disabled={isUploading}
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                onClick={handleSave}
                className="p-2 bg-green-500/80 backdrop-blur-md rounded-full text-white hover:bg-green-500 transition-all"
                title="Guardar"
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
                title="Cancelar"
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
        className="absolute inset-0 w-full h-[120%] -top-[10%] pointer-events-none transition-opacity duration-500"
        style={{
          transform: `translateY(${offsetY}px)`,
          willChange: "transform",
        }}
      >
        <ImageWithLoader
          src={
            isEditing
              ? editValues.imageUrl
              : config.vision_image_url ||
                "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070"
          }
          alt="Futuristic architectural view"
          className="w-full h-full object-cover opacity-30"
          containerClassName="w-full h-full"
        />
      </div>

      <div className="relative z-10 text-center max-w-4xl px-6">
        {isEditing ? (
          <RichTextEditor
            tagName="h2"
            initialValue={editValues.text}
            onChange={(val: string) =>
              setEditValues({ ...editValues, text: val })
            }
            className="w-full bg-transparent border border-white/20 rounded p-4 outline-none text-3xl md:text-6xl font-extralight tracking-tight mb-16 italic opacity-80 uppercase leading-tight focus:border-white focus:bg-white/5 h-auto min-h-[10rem] text-center"
            placeholder="Texto visión..."
          />
        ) : (
          <h2
            className="text-3xl md:text-6xl font-extralight tracking-tight mb-16 italic opacity-60 uppercase leading-tight"
            dangerouslySetInnerHTML={{
              __html:
                config.vision_text ||
                "Diseño que trasciende la función para convertirse en <span class='text-white opacity-100 not-italic'>luz pura.</span>",
            }}
          ></h2>
        )}

        <a
          href="#contact-info"
          className="text-2xl md:text-4xl font-extralight border-b border-white/20 hover:border-white transition-colors pb-4 inline-block uppercase group"
        >
          SOLICITAR ASESORAMIENTO{" "}
          <span className="italic opacity-30 group-hover:opacity-100 transition-opacity">
            _TECH
          </span>
        </a>
      </div>
    </section>
  );
};

export default VisionSection;
