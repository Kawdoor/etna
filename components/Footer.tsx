import React, { useEffect, useState } from "react";
import { useConfig } from "../context/ConfigContext";
import RichTextEditor from "./ui/RichTextEditor";
import { ThemeColorPicker } from "./ui/ThemeColorPicker";

interface FooterProps {
  onAdminOpen?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onAdminOpen }) => {
  const { config, updateLocalConfig } = useConfig();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    siteName: "",
    siteDescription: "",
    email: "",
    phone: "",
    colors: { bg: "", text: "" },
  });

  useEffect(() => {
    import("../services/supabase").then(({ supabase }) => {
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => setIsAdmin(!!session));
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) =>
        setIsAdmin(!!session),
      );
      return () => subscription.unsubscribe();
    });
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setEditValues({
        siteName: config.site_name || "ETNA",
        siteDescription: config.site_description || "Iluminación de Vanguardia",
        email: config.contact_email || "contact@etna.com",
        phone: config.contact_phone || "+54 9 11 1234 5678",
        colors: config.theme_colors?.footer || {
          bg: "bg-pullmanBrown",
          text: "text-white",
        },
      });
    }
  }, [isEditing, config]);

  const handleSave = async () => {
    await updateLocalConfig({
      site_name: editValues.siteName,
      site_description: editValues.siteDescription,
      contact_email: editValues.email,
      contact_phone: editValues.phone,
      theme_colors: {
        ...config.theme_colors,
        footer: editValues.colors,
      },
    });
    setIsEditing(false);
  };

  const footerColors = isEditing
    ? editValues.colors
    : config.theme_colors?.footer || {
        bg: "bg-pullmanBrown",
        text: "text-white",
      };

  const handleColorChange = (sectionId: string, bg: string, text: string) => {
    setEditValues({ ...editValues, colors: { bg, text } });
  };

  return (
    <footer
      id="contact"
      className={`${footerColors.bg} ${footerColors.text?.startsWith("#") ? "" : footerColors.text} py-24 px-6 border-t border-white/5 transition-colors duration-500 relative group/footer`}
      style={{
        color: footerColors.text?.startsWith("#")
          ? footerColors.text
          : undefined,
      }}
    >
      {isAdmin && (
        <div className="absolute top-8 right-8 z-50 flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/footer:opacity-100"
              title="Editar Footer"
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
                sectionId="footer"
                colors={{ footer: editValues.colors }}
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
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="col-span-1 md:col-span-2">
          {isEditing ? (
            <RichTextEditor
              tagName="div"
              initialValue={editValues.siteName}
              onChange={(val) =>
                setEditValues({ ...editValues, siteName: val })
              }
              className="font-futuristic text-3xl tracking-[0.3em] font-extralight mb-8 uppercase bg-transparent w-full focus:border-white transition-colors h-auto min-h-[4rem] p-2 border border-white/20"
              placeholder="ETNA..."
            />
          ) : (
            <h2
              className="font-futuristic text-3xl tracking-[0.3em] font-extralight mb-8 uppercase"
              dangerouslySetInnerHTML={{ __html: config.site_name || "ETNA" }}
            />
          )}

          {isEditing ? (
            <RichTextEditor
              tagName="div"
              initialValue={editValues.siteDescription}
              onChange={(val) =>
                setEditValues({ ...editValues, siteDescription: val })
              }
              className="text-neutral-500 max-w-sm font-light text-sm leading-relaxed bg-transparent border border-white/20 rounded p-2 outline-none w-full focus:border-white transition-colors h-auto min-h-[4rem] mb-4"
              placeholder="Descripción..."
            />
          ) : (
            <p
              className="text-neutral-500 max-w-sm font-light text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: config.site_description || "Iluminación de Vanguardia",
              }}
            />
          )}
        </div>

        <div>
          <h4 className="font-futuristic text-[10px] tracking-widest mb-6 opacity-40">
            SOCIALES
          </h4>
          <ul className="space-y-4 font-light text-sm text-neutral-400">
            <li>
              <a
                href="https://www.instagram.com/etnailuminacion"
                target="_blank"
                className="hover:text-white transition-colors"
              >
                INSTAGRAM
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                BEHANCE
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                PINTEREST
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-futuristic text-[10px] tracking-widest mb-6 opacity-40">
            CONTACTO
          </h4>
          <ul className="space-y-4 font-light text-sm text-neutral-400">
            <li className="uppercase">
              {isEditing ? (
                <input
                  value={editValues.email}
                  onChange={(e) =>
                    setEditValues({ ...editValues, email: e.target.value })
                  }
                  className="bg-transparent border-b border-white/20 outline-none w-full focus:border-white transition-colors"
                />
              ) : (
                config.contact_email
              )}
            </li>
            <li>
              {isEditing ? (
                <input
                  value={editValues.phone}
                  onChange={(e) =>
                    setEditValues({ ...editValues, phone: e.target.value })
                  }
                  className="bg-transparent border-b border-white/20 outline-none w-full focus:border-white transition-colors"
                />
              ) : (
                config.contact_phone
              )}
            </li>
            <li>BUENOS AIRES, ARG</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-futuristic tracking-[0.3em] text-neutral-600">
        <span>© 2024 ETNA TECHNOLOGIES. TODOS LOS DERECHOS RESERVADOS.</span>
        <div className="flex gap-8 items-center">
          <a href="#" className="hover:text-white transition-colors">
            PRIVACIDAD
          </a>
          <a href="#" className="hover:text-white transition-colors">
            TÉRMINOS
          </a>
          <button
            onClick={onAdminOpen}
            className="hover:text-white transition-colors border border-white/10 px-4 py-1 hover:border-white/40"
          >
            ADMIN
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
