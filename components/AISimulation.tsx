
import React, { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';
import { ThemeColorPicker } from './ui/ThemeColorPicker';
import RichTextEditor from './ui/RichTextEditor';

const AISimulation: React.FC = () => {
  const { config, updateLocalConfig } = useConfig();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editColors, setEditColors] = useState<{ bg: string; text: string } | null>(null);

  // Editable text state
  const [editValues, setEditValues] = useState({
    subtitle: "AI-Powered Design",
    title: "Virtual <br />\n<span class=\"inline-block mt-6 bg-pullmanBrown text-white px-8 py-4 border border-white/10 shadow-xl\">Simulation.</span>",
    descriptionQuote: `"Experimenta el diseño antes de que exista."`,
    descriptionBody: `Nuestra tecnología de inteligencia artificial generativa crea simulaciones fotorrealistas,\npermitiéndote visualizar cómo se integrará cada pieza y cada lumen en\ntu propio espacio.`,
    badgeText: "Generado en Tiempo Real"
  });

  useEffect(() => {
    import("../services/supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => setIsAdmin(!!session));
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIsAdmin(!!session));
      return () => subscription.unsubscribe();
    });
  }, []);

  // Use config values if available, otherwise fallback to default
  useEffect(() => {
    if (!isEditing) {
      setEditValues({
        subtitle: config.ai_simulation_subtitle || "AI-Powered Design",
        title: config.ai_simulation_title || "Virtual <br />\n<span class=\"inline-block mt-6 bg-pullmanBrown text-white px-8 py-4 border border-white/10 shadow-xl\">Simulation.</span>",
        descriptionQuote: config.ai_simulation_quote || `"Experimenta el diseño antes de que exista."`,
        descriptionBody: config.ai_simulation_body || `Nuestra tecnología de inteligencia artificial generativa crea simulaciones fotorrealistas,\npermitiéndote visualizar cómo se integrará cada pieza y cada lumen en\ntu propio espacio.`,
        badgeText: config.ai_simulation_badge || "Generado en Tiempo Real"
      });
      setEditColors(null); // Reset pending colors
    }
  }, [isEditing, config]);

  const aiSimColors = editColors || config.theme_colors?.ai_simulation || { bg: "bg-navyDark", text: "text-white" };

  const handleColorChange = (bg: string, text: string) => {
    setEditColors({ bg, text });
    // Color is not applied globally here anymore; user must hit save.
  };

  const handleSave = async () => {
    await updateLocalConfig({
      ai_simulation_subtitle: editValues.subtitle,
      ai_simulation_title: editValues.title,
      ai_simulation_quote: editValues.descriptionQuote,
      ai_simulation_body: editValues.descriptionBody,
      ai_simulation_badge: editValues.badgeText,
      theme_colors: { ...config.theme_colors, ai_simulation: { bg: aiSimColors.bg, text: aiSimColors.text } }
    });
    setIsEditing(false);
  };

  return (
    <section 
      id="ai-simulation" 
      className={`py-40 px-8 ${aiSimColors.bg} ${aiSimColors.text?.startsWith('#') ? '' : aiSimColors.text} relative overflow-hidden transition-colors duration-500 group/sim`}
      style={{ color: aiSimColors.text?.startsWith('#') ? aiSimColors.text : undefined }}
    >
      {/* Background gradients if needed */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-navalBlue/20 pointer-events-none" />

      {isAdmin && (
        <div className="absolute top-8 right-8 z-50 flex items-center gap-2">
          {isEditing && (
            <ThemeColorPicker
              currentColor={aiSimColors.bg}
              currentTextColor={aiSimColors.text}
              onChange={handleColorChange}
            />
          )}

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/sim:opacity-100"
              title="Editar Sección"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="p-2 bg-green-500/80 backdrop-blur-md rounded-full text-white hover:bg-green-500 transition-all shadow-xl"
                title="Guardar Cambios"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all"
                title="Cancelar Edición"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12 animate-in slide-in-from-left-8 duration-1000">
            
            {isEditing ? (
              <RichTextEditor
                tagName="span"
                initialValue={editValues.subtitle}
                onChange={val => setEditValues({ ...editValues, subtitle: val })}
                className="bg-transparent border border-white/20 outline-none w-full p-2 focus:border-white font-futuristic uppercase tracking-[0.5em] text-[10px] text-pullmanBrown block h-auto min-h-[3rem]"
                placeholder="SUBTITULO..."
              />
            ) : (
              <span 
                className="font-futuristic uppercase tracking-[0.5em] text-[10px] text-pullmanBrown block"
                dangerouslySetInnerHTML={{ __html: editValues.subtitle }}
              />
            )}

            {isEditing ? (
              <RichTextEditor
                tagName="h2"
                initialValue={editValues.title}
                onChange={val => setEditValues({ ...editValues, title: val })}
                className="bg-transparent border border-white/20 outline-none w-full p-2 focus:border-white font-futuristic text-4xl md:text-6xl text-white font-light leading-normal tracking-widest uppercase"
              />
            ) : (
              <h2 
                className="font-futuristic text-4xl md:text-6xl text-white font-light leading-normal tracking-widest uppercase"
                dangerouslySetInnerHTML={{ __html: editValues.title }}
              />
            )}

            {isEditing ? (
              <RichTextEditor
                tagName="p"
                initialValue={editValues.descriptionQuote}
                onChange={val => setEditValues({ ...editValues, descriptionQuote: val })}
                className="bg-transparent border border-white/20 outline-none w-full p-2 focus:border-white text-xl text-white/80 leading-relaxed font-light h-auto min-h-[4rem]"
                placeholder="CITA..."
              />
            ) : (
              <p 
                className="text-xl text-white/80 leading-relaxed font-light"
                dangerouslySetInnerHTML={{ __html: editValues.descriptionQuote }}
              />
            )}

            {isEditing ? (
              <RichTextEditor
                tagName="p"
                initialValue={editValues.descriptionBody}
                onChange={val => setEditValues({ ...editValues, descriptionBody: val })}
                className="bg-transparent border border-white/20 outline-none w-full p-2 focus:border-white text-sm text-white/50 leading-relaxed font-futuristic tracking-widest uppercase min-h-[6rem]"
                placeholder="CUERPO..."
              />
            ) : (
              <p 
                className="text-sm text-white/50 leading-relaxed font-futuristic tracking-widest uppercase whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: editValues.descriptionBody }}
              />
            )}

          </div>
          <div className="relative animate-in slide-in-from-right-8 duration-1000">
            <div className="aspect-[16/10] w-full bg-navalBlue rounded-none overflow-hidden shadow-2xl relative border border-pullmanBrown/30">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-80"
              >
                <source src="/sillon.mp4" type="video/mp4" />
                Tu navegador no soporta el formato de video.
              </video>
              <div className="absolute inset-0 bg-navyDark/20 pointer-events-none mix-blend-overlay"></div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 bg-pullmanBrown p-6 border border-white/10 hidden md:block">
              {isEditing ? (
                <RichTextEditor
                  tagName="p"
                  initialValue={editValues.badgeText}
                  onChange={val => setEditValues({ ...editValues, badgeText: val })}
                  className="bg-transparent border border-white/20 outline-none w-full p-2 focus:border-white font-futuristic text-[10px] uppercase tracking-widest text-white h-auto min-h-[3rem]"
                  placeholder="BADGE..."
                />
              ) : (
                <p 
                  className="font-futuristic text-[10px] uppercase tracking-widest text-white"
                  dangerouslySetInnerHTML={{ __html: editValues.badgeText }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISimulation;
