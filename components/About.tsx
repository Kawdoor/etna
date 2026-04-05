import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "../context/ConfigContext";
import { InventoryService, supabase } from "../services/supabase";
import { optimizeImage } from "../utils/imageOptimizer";
import RichTextEditor from "./ui/RichTextEditor";
import { ScrollReveal } from "./ui/ScrollReveal";

const About: React.FC = () => {
  const { config, updateLocalConfig } = useConfig();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [editValues, setEditValues] = useState({
    headline: "",
    description: "",
    items: [] as any[],
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
        headline: config.about_headline || "LEGADO VIRTUAL.",
        description:
          config.about_description ||
          "ETNA no es solo una marca de iluminación; es un laboratorio de ingeniería lumínica donde el futuro de la arquitectura se encuentra con la precisión técnica.",
        items: config.about_history || [],
      });
    }
  }, [isEditing, config]);

  const handleSave = async () => {
    await updateLocalConfig({
      about_headline: editValues.headline,
      about_description: editValues.description,
      about_history: editValues.items,
    });
    setIsEditing(false);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingIndex(index);
    try {
      // Delete old image if it was from supabase?
      // Optional optimization: check if editValues.items[index].image includes supabase and delete it
      const file = await optimizeImage(e.target.files[0]);
      const url = await InventoryService.uploadImage(file);
      const newItems = [...editValues.items];
      newItems[index] = { ...newItems[index], image: url };
      setEditValues((prev) => ({ ...prev, items: newItems }));
      toast.success("IMAGEN ACTUALIZADA");
    } catch (error) {
      console.error(error);
      toast.error("ERROR AL CARGAR IMAGEN");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...editValues.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditValues((prev) => ({ ...prev, items: newItems }));
  };

  const handleAddItem = () => {
    setEditValues((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          year: new Date().getFullYear().toString(),
          title: "NUEVO HITO",
          description: "Descripción del evento...",
          image: "/images/hero.jpg", // Default image
        },
      ],
    }));
  };

  const handleDeleteItem = (index: number) => {
    setEditValues((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  return (
    <div
      id="about"
      className="bg-black pt-32 pb-24 text-white relative group/about"
    >
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-24 right-6 z-50 flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/about:opacity-100"
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

      {/* Hero Section */}
      <section className="px-6 mb-32">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-500 mb-8 uppercase">
            Nuestra Historia
          </h2>
          <h1 className="text-5xl md:text-[8rem] font-thin tracking-tighter leading-none mb-12">
            {isEditing ? (
              <input
                value={editValues.headline}
                onChange={(e) =>
                  setEditValues({ ...editValues, headline: e.target.value })
                }
                className="bg-transparent border-b border-white/20 outline-none text-center w-full focus:border-white transition-colors"
              />
            ) : (
              <span
                dangerouslySetInnerHTML={{
                  __html:
                    config.about_headline?.replace(
                      ".",
                      "<span class='italic opacity-30'>.</span>",
                    ) ||
                    "LEGADO <span class='italic opacity-30'>VIRTUAL.</span>",
                }}
              />
            )}
          </h1>
          {isEditing ? (
            <RichTextEditor
              tagName="p"
              initialValue={editValues.description}
              onChange={(val: string) =>
                setEditValues({ ...editValues, description: val })
              }
              className="w-full max-w-2xl mx-auto bg-transparent border border-white/20 rounded p-4 outline-none text-neutral-400 font-light text-lg leading-relaxed focus:border-white h-auto min-h-[8rem]"
              placeholder="Descripción..."
            />
          ) : (
            <p
              className="max-w-2xl mx-auto text-neutral-400 font-light text-lg leading-relaxed"
              dangerouslySetInnerHTML={{
                __html:
                  config.about_description ||
                  "ETNA no es solo una marca de iluminación; es un laboratorio de ingeniería lumínica donde el futuro de la arquitectura se encuentra con la precisión técnica.",
              }}
            />
          )}
        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10 hidden lg:block"></div>

        <div className="max-w-7xl mx-auto space-y-32">
          {(isEditing ? editValues.items : config.about_history || []).map(
            (item: any, index: number) => (
              <ScrollReveal
                key={index}
                className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-24 ${index % 2 !== 0 ? "lg:flex-row-reverse" : ""} relative`}
              >
                <div className="flex-1 w-full relative group/item">
                  <div className="aspect-[16/9] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col gap-2 items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
                        <input
                          type="file"
                          hidden
                          ref={(el) => { if (el) fileRefs.current[index] = el; }}
                          onChange={(e) => handleImageUpload(e, index)}
                          accept="image/*"
                        />
                        <button
                          onClick={() => fileRefs.current[index]?.click()}
                          className="bg-white text-black px-4 py-2 rounded-full font-futuristic text-xs tracking-widest hover:scale-105 transition-transform"
                          disabled={uploadingIndex === index}
                        >
                          {uploadingIndex === index
                            ? "UPLOADING..."
                            : "CHANGE IMAGE"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 text-center lg:text-left space-y-6 relative">
                  {isEditing && (
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className={`absolute -top-10 text-red-500 hover:text-red-400 p-2 z-20 ${
                        index % 2 === 0
                          ? "right-0 lg:-left-10"
                          : "right-0 lg:-right-10"
                      }`}
                      title="Eliminar Hito"
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
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}

                  {isEditing ? (
                    <input
                      value={item.year}
                      onChange={(e) =>
                        handleItemChange(index, "year", e.target.value)
                      }
                      className="font-futuristic text-4xl text-white/50 bg-transparent border-b border-white/10 w-24 text-center lg:text-left outline-none focus:border-white focus:text-white"
                    />
                  ) : (
                    <span className="font-futuristic text-4xl text-white/20">
                      {item.year}
                    </span>
                  )}

                  {isEditing ? (
                    <input
                      value={item.title}
                      onChange={(e) =>
                        handleItemChange(index, "title", e.target.value)
                      }
                      className="font-futuristic text-2xl tracking-widest bg-transparent border-b border-white/10 w-full text-center lg:text-left outline-none focus:border-white"
                    />
                  ) : (
                    <h3 className="font-futuristic text-2xl tracking-widest">
                      {item.title}
                    </h3>
                  )}

                  {isEditing ? (
                    <RichTextEditor
                      tagName="div"
                      initialValue={item.description}
                      onChange={(val: string) =>
                        handleItemChange(index, "description", val)
                      }
                      className="text-neutral-500 font-light leading-relaxed text-lg bg-transparent border border-white/10 w-full h-auto min-h-[8rem] p-2 outline-none focus:border-white"
                      placeholder="Descripción del item..."
                    />
                  ) : (
                    <p
                      className="text-neutral-500 font-light leading-relaxed text-lg"
                      dangerouslySetInnerHTML={{ __html: item.description }}
                    />
                  )}

                  <div className="w-12 h-[1px] bg-white/20 mx-auto lg:mx-0"></div>
                </div>
              </ScrollReveal>
            ),
          )}

          {isEditing && (
            <div className="flex justify-center pb-12">
              <button
                onClick={handleAddItem}
                className="flex items-center gap-2 px-8 py-4 border border-white/20 rounded-full hover:bg-white/10 transition-colors font-futuristic text-xs tracking-widest"
              >
                <span>+</span>
                AGREGAR HITO
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default About;
