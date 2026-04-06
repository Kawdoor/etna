import React from 'react';

const AISimulation: React.FC = () => {
  return (
    <section id="ai-simulation" className="py-40 px-8 bg-navyDark relative overflow-hidden">
      {/* Background gradients if needed */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-navalBlue/20 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12 animate-in slide-in-from-left-8 duration-1000">
            <span className="font-futuristic uppercase tracking-[0.5em] text-[10px] text-pullmanBrown block">
              AI-Powered Design
            </span>
            <h2 className="font-futuristic text-4xl md:text-6xl text-white font-light leading-normal tracking-widest uppercase">
              Virtual <br />
              <span className="inline-block mt-6 bg-pullmanBrown text-white px-8 py-4 border border-white/10 shadow-xl">Simulation.</span>
            </h2>
            <p className="text-xl text-white/80 leading-relaxed font-light">
               "Experimenta el diseño antes de que exista."
            </p>
            <p className="text-sm text-white/50 leading-relaxed font-futuristic tracking-widest uppercase">
              Nuestra tecnología de inteligencia artificial generativa crea simulaciones fotorrealistas,
              permitiéndote visualizar cómo se integrará cada pieza y cada lumen en
              tu propio espacio.
            </p>
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
               <p className="font-futuristic text-[10px] uppercase tracking-widest text-white">
                  Generado en Tiempo Real
               </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISimulation;
