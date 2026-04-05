import React from "react";
import { useConfig } from "../context/ConfigContext";

interface FooterProps {
  onAdminOpen?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onAdminOpen }) => {
  const { config } = useConfig();
  return (
    <footer
      id="contact"
      className="bg-pullmanBrown text-white py-24 px-6 border-t border-white/5"     
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="col-span-1 md:col-span-2">
          <h2 className="font-futuristic text-3xl tracking-[0.3em] font-extralight mb-8 uppercase">
             {config.site_name}
          </h2>
          <p className="text-neutral-500 max-w-sm font-light text-sm leading-relaxed">
             {config.site_description}
          </p>
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
            <li className="uppercase">{config.contact_email}</li>
            <li>{config.contact_phone}</li>
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
