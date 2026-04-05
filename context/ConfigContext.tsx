import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigService } from "../services/supabase";
import { AppConfig } from "../types";

interface ConfigContextType {
  config: AppConfig;
  updateLocalConfig: (updates: Partial<AppConfig>) => Promise<void>;
  isLoading: boolean;
}

const defaultConfig: AppConfig = {
  id: 0,
  site_name: "ETNA",
  site_description: "Iluminación de Vanguardia",
  contact_email: "contact@etna.com",
  contact_phone: "+54 9 11 1234 5678",
  opening_hours: "Lun - Vie: 10:00 - 19:00",
  theme: "dark",
  ai_active: true,
  use_mock_data: true,
  hero_headline: "ETNA",
  hero_subheadline: "LIGHTING_TECH",
  hero_text:
    "La interfaz definitiva entre la luz y el espacio. Sistemas de iluminación de alta precisión diseñados para el confort visual.",
  hero_image_url: "/images/hero.jpg",
  about_headline: "LEGADO VIRTUAL.",
  about_description:
    "ETNA no es solo una marca de iluminación; es un laboratorio de ingeniería lumínica donde el futuro de la arquitectura se encuentra con la precisión técnica.",
  about_history: [
    {
      year: "2018",
      title: "LA GÉNESIS",
      description:
        "Nacimiento de ETNA en un pequeño estudio de diseño en La Plata, con la visión de reinventar la iluminación espacial.",
      image: "/images/pexels-photo-3183150.webp",
    },
    {
      year: "2020",
      title: "REVOLUCIÓN SMART",
      description:
        "Lanzamiento de nuestro sistema de iluminación adaptativa con integración neural.",
      image: "/images/pexels-photo-3861969.webp",
    },
    {
      year: "2022",
      title: "VISIÓN GLOBAL",
      description:
        "Expansión a proyectos arquitectónicos internacionales, iluminando residencias y espacios corporativos de vanguardia.",
      image: "/images/pexels-photo-256150.webp",
    },
    {
      year: "2024",
      title: "INTEGRACIÓN IA",
      description:
        "Integración total de Gemini AI para simulación de ambientes y asesoramiento lumínico en tiempo real.",
      image: "/images/pexels-photo-8386440.webp",
    },
  ],
  catalog_headline: "DISEÑO EXPANSIVO.",
  catalog_description: "LA COLECCIÓN",
  catalog_headline_full: "SISTEMAS ETNA.",
  catalog_description_full: "FILTROS_TÉCNICOS",
  collection_hero_headline:
    "CATÁLOGO <br/> <span class='italic opacity-30 text-white'>EXTENDIDO.</span>",
  collection_hero_subheadline: "ENGINEERED FOR MODERN SPACES",
  collection_hero_image_url: "/images/pexels-photo-276528.webp",
  contact_headline: "UBICACIÓN_FLAGSHIP",
  contact_subheadline:
    "ESTAMOS EN <br/> <span class='opacity-40 italic'>EL CENTRO.</span>",
  contact_address: "Calle 12 y 50 N° 820, La Plata",
  vision_text:
    "Diseño que trasciende la función para convertirse en <span class='text-white opacity-100 not-italic'>luz pura.</span>",
  vision_image_url:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2070",
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  updateLocalConfig: async () => {},
  isLoading: true,
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  // Sync theme with config
  useEffect(() => {
    if (config.theme) {
      const root = window.document.documentElement;
      if (config.theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [config.theme]);

  const loadConfig = async () => {
    try {
      const data = await ConfigService.getConfig();
      if (data) {
        setConfig({ ...defaultConfig, ...data });
      } else {
        // If no data, we could try to create default entry, but for now just use local default
        // Optionally auto-create:
        // await ConfigService.updateConfig(defaultConfig);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocalConfig = async (updates: Partial<AppConfig>) => {
    // Optimistic update
    setConfig((prev) => ({ ...prev, ...updates }));
    try {
      await ConfigService.updateConfig(updates);
    } catch (e) {
      console.error("Failed to sync config:", e);
      // Rollback could go here
    }
  };

  return (
    <ConfigContext.Provider value={{ config, updateLocalConfig, isLoading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
