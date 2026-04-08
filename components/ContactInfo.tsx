import React, { useEffect, useState } from "react";
import { useConfig } from "../context/ConfigContext";
import { supabase } from "../services/supabase";
import RichTextEditor from "./ui/RichTextEditor";
import { ThemeColorPicker } from "./ui/ThemeColorPicker";

const ContactInfo: React.FC = () => {
  const { config, updateLocalConfig } = useConfig();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editValues, setEditValues] = useState({
    headline: "",
    subheadline: "",
    address: "",
    email: "",
    phone: "",
    opening: "",
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
        headline: config.contact_headline || "UBICACIÓN_FLAGSHIP",
        subheadline:
          config.contact_subheadline ||
          "ESTAMOS EN <br/> <span class='opacity-40 italic'>EL CENTRO.</span>",
        address: config.contact_address || "Calle 12 y 50 N° 820, La Plata",
        email: config.contact_email,
        phone: config.contact_phone,
        opening: config.opening_hours,
      });
    }
  }, [isEditing, config]);

  const handleSave = async () => {
    await updateLocalConfig({
      contact_headline: editValues.headline,
      contact_subheadline: editValues.subheadline,
      contact_address: editValues.address,
      contact_email: editValues.email,
      contact_phone: editValues.phone,
      opening_hours: editValues.opening,
    });
    setIsEditing(false);
  };

  // Permitir cambiar color siempre y reflejar cambios inmediatos
  const [editColors, setEditColors] = useState<{
    bg: string;
    text: string;
  } | null>(null);
  const contactColors = editColors ||
    config.theme_colors?.contact || { bg: "bg-navyDark", text: "text-white" };

  const handleColorChange = (bg: string, text: string) => {
    setEditColors({ bg, text });
    updateLocalConfig({
      theme_colors: {
        ...config.theme_colors,
        contact: { bg, text },
      },
    });
  };

  return (
    <section
      id="contact-info"
      className={`py-32 px-6 ${contactColors.bg} ${contactColors.text?.startsWith("#") ? "" : contactColors.text} relative group/contact transition-colors duration-500`}
      style={{
        color: contactColors.text?.startsWith("#")
          ? contactColors.text
          : undefined,
      }}
    >
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-24 right-6 z-50 flex gap-2 items-center">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/contact:opacity-100"
              title="Editar Info"
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
              <ThemeColorPicker
                currentColor={contactColors.bg}
                currentTextColor={contactColors.text}
                onChange={handleColorChange}
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

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <div>
              <h3 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-500 mb-4 uppercase">
                {isEditing ? (
                  <RichTextEditor
                    tagName="span"
                    initialValue={editValues.headline}
                    onChange={(val: string) =>
                      setEditValues({ ...editValues, headline: val })
                    }
                    className="bg-transparent border border-white/20 outline-none w-full h-[3rem] p-2 focus:border-white transition-colors block"
                    placeholder="UBICACIÓN_FLAGSHIP..."
                  />
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: config.contact_headline || "UBICACIÓN_FLAGSHIP",
                    }}
                  />
                )}
              </h3>
              <h2 className="text-4xl md:text-6xl font-extralight tracking-tighter">
                {isEditing ? (
                  <RichTextEditor
                    tagName="h2"
                    initialValue={editValues.subheadline}
                    onChange={(val: string) =>
                      setEditValues({ ...editValues, subheadline: val })
                    }
                    className="bg-transparent border border-white/20 outline-none w-full h-auto min-h-[8rem] p-2 focus:border-white transition-colors text-3xl font-extralight tracking-tighter"
                    placeholder="Subtítulo..."
                  />
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html:
                        config.contact_subheadline ||
                        "ESTAMOS EN <br/> <span class='opacity-40 italic'>EL CENTRO.</span>",
                    }}
                  />
                )}
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-futuristic text-[9px] tracking-widest text-neutral-500 mb-2 uppercase">
                    UBICACIÓN
                  </h4>
                  {isEditing ? (
                    <RichTextEditor
                      tagName="div"
                      initialValue={editValues.address}
                      onChange={(val) =>
                        setEditValues({
                          ...editValues,
                          address: val,
                        })
                      }
                      className="text-xl font-light bg-transparent border border-white/20 outline-none w-full p-2 focus:border-white h-auto min-h-[4rem]"
                      placeholder="Dirección..."
                    />
                  ) : (
                    <p
                      className="text-xl font-light"
                      dangerouslySetInnerHTML={{
                        __html:
                          config.contact_address ||
                          "Calle 12 y 50 N° 820, La Plata",
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-futuristic text-[9px] tracking-widest text-neutral-500 mb-2 uppercase">
                    WHATSAPP
                  </h4>
                  {isEditing ? (
                    <input
                      value={editValues.phone}
                      onChange={(e) =>
                        setEditValues({ ...editValues, phone: e.target.value })
                      }
                      className="text-xl font-light bg-transparent border-b border-white/20 outline-none w-full focus:border-white"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        const phone = config.contact_phone.replace(/\D/g, "");
                        window.open(`https://wa.me/${phone}`, "_blank");
                      }}
                      className="text-xl font-light hover:text-green-400 transition-colors"
                    >
                      {config.contact_phone}
                    </button>
                  )}
                </div>
              </div>

              {/* EMAIL SECTION ADDED */}
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-futuristic text-[9px] tracking-widest text-neutral-500 mb-2 uppercase">
                    EMAIL
                  </h4>
                  {isEditing ? (
                    <input
                      value={editValues.email}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          email: e.target.value,
                        })
                      }
                      className="text-xl font-light bg-transparent border-b border-white/20 outline-none w-full focus:border-white"
                    />
                  ) : (
                    <a
                      href={`mailto:${config.contact_email}`}
                      className="text-xl font-light hover:text-white transition-colors"
                    >
                      {config.contact_email}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-futuristic text-[9px] tracking-widest text-neutral-500 mb-2 uppercase">
                    HORARIOS
                  </h4>
                  {isEditing ? (
                    <input
                      value={editValues.opening}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          opening: e.target.value,
                        })
                      }
                      className="text-sm font-light text-neutral-400 bg-transparent border-b border-white/20 outline-none w-full focus:border-white"
                    />
                  ) : (
                    <p className="text-sm font-light text-neutral-400">
                      {config.opening_hours}
                    </p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="border border-white/10 p-4 rounded bg-white/5 space-y-4">
                  <h4 className="font-futuristic text-[9px] tracking-widest text-white/50 mb-2 uppercase">
                    CONTACTO DIRECTO
                  </h4>
                  <div>
                    <label className="text-xs text-neutral-500 block mb-1">
                      Email
                    </label>
                    <input
                      value={editValues.email}
                      onChange={(e) =>
                        setEditValues({ ...editValues, email: e.target.value })
                      }
                      className="bg-transparent border-b border-white/20 outline-none w-full focus:border-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 block mb-1">
                      Teléfono
                    </label>
                    <input
                      value={editValues.phone}
                      onChange={(e) =>
                        setEditValues({ ...editValues, phone: e.target.value })
                      }
                      className="bg-transparent border-b border-white/20 outline-none w-full focus:border-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative aspect-square lg:aspect-video bg-navalBlue overflow-hidden group border border-white/5">
            {/* Google Maps Embed - Free & Interactive */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3271.748364808383!2d-57.954620023473175!3d-34.91277127464003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a2e633d7b3e64f%3A0xc6a8276f57c6b44c!2sC.%2017%20903%2C%20B1900%20La%20Plata%2C%20Provincia%20de%20Buenos%20Aires!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
              className="w-full h-full border-0 grayscale invert opacity-70 contrast-125 hover:opacity-90 transition-opacity"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className="absolute inset-0 pointer-events-none border border-white/10 group-hover:border-white/20 transition-colors"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactInfo;
