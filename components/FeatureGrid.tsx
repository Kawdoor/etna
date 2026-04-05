import React, { useEffect, useMemo, useRef, useState } from "react";
// import { allProducts } from "../data/products"; // REMOVED: Using hook
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { useConfig } from "../context/ConfigContext";
import { useProducts } from "../hooks/useProducts";
import { supabase } from "../services/supabase";
import { Product } from "../types";
import { optimizeImage } from "../utils/imageOptimizer";
import { ImageWithLoader } from "./ui/ImageWithLoader";
import RichTextEditor from "./ui/RichTextEditor";

const ExpandingGridRow: React.FC<{
  products: Product[];
  onSelectProduct: (p: Product) => void;
}> = ({ products, onSelectProduct }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    addItem(p);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[70vh] lg:h-[80vh] overflow-hidden">
      {products.map((p, i) => (
        <div
          key={p.id}
          onClick={() => onSelectProduct(p)}
          onMouseEnter={() => setExpandedIndex(i)}
          className={`group relative ${expandedIndex === i ? "flex-[3]" : "flex-[1]"} min-w-0 h-full transition-all duration-500 ease-in-out overflow-hidden border-r last:border-0 border-white/10 cursor-pointer`}
        >
          <ImageWithLoader
            src={p.image}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            alt={p.name}
            containerClassName="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 bg-navalBlue/30 group-hover:bg-navalBlue/10 transition-colors" />

          {/* Add to Cart Button on Hover */}
          <button
            onClick={(e) => handleAddToCart(e, p)}
            className="absolute top-8 right-8 z-20 w-10 h-10 border border-white/30 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-navalBlue hover:scale-110"
            title="Agregar al Carrito"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-12 text-white pointer-events-none">
            <div className="pb-12">
              <p className="font-futuristic text-[10px] lg:text-xs uppercase tracking-[0.4em] font-bold mb-4 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                {p.tag}
              </p>
              <h3 className="font-futuristic text-3xl lg:text-5xl font-bold mb-4 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500 delay-150">
                {p.name}
              </h3>
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transform translate-y-8 group-hover:translate-y-0 transition-all duration-700 delay-[1000ms]">
                <p className="font-futuristic text-xl lg:text-2xl font-light italic">
                  {p.description}
                </p>
                {p.sale_price ? (
                  <div className="flex items-center gap-3">
                    <p className="font-futuristic text-lg lg:text-xl font-bold text-white">
                      ${p.sale_price.toLocaleString()}
                    </p>
                    {p.price && (
                      <p className="font-futuristic text-sm line-through text-white/50">
                        ${p.price.toLocaleString()}
                      </p>
                    )}
                    <span className="text-[9px] bg-red-600 text-white px-1.5 rounded">
                      SALE
                    </span>
                  </div>
                ) : (
                  p.price && (
                    <p className="font-futuristic text-lg lg:text-xl font-bold">
                      ${p.price.toLocaleString()}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface FeatureGridProps {
  onSelectProduct: (product: Product) => void;
  showAll?: boolean;
  onShowAll?: () => void;
}

const FeatureGrid: React.FC<FeatureGridProps> = ({
  onSelectProduct,
  showAll = false,
  onShowAll,
}) => {
  const { products: allProducts, loading } = useProducts();
  const { config, updateLocalConfig } = useConfig();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<
    Record<string, string[]>
  >({});
  const [sortOption, setSortOption] = useState<string>("default");
  const [priceRange, setPriceRange] = useState<{
    min: number;
    max: number | null;
  }>({
    min: 0,
    max: null,
  });
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroScale = Math.max(1, 1.1 - scrollY / 2000);

  // Toggle Advanced Filter
  const toggleAdvancedFilter = (category: string, value: string) => {
    setAdvancedFilters((prev) => {
      const current = prev[category] || [];
      const newCategory = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (newCategory.length === 0) {
        const { [category]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [category]: newCategory };
    });
  };

  const clearAllFilters = () => {
    setFilter("all");
    setSearchQuery("");
    setAdvancedFilters({});
    setSortOption("default");
    setPriceRange({ min: 0, max: null });
  };

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editValues, setEditValues] = useState({
    headline: "",
    subheadline: "",
    // Collection Hero Specific
    collectionHeadline: "",
    collectionSubheadline: "",
    collectionImage: "",
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
        // Main section defaults
        headline: showAll
          ? config.catalog_headline_full || "SISTEMAS ETNA."
          : config.catalog_headline || "DISEÑO EXPANSIVO.",
        subheadline: showAll
          ? config.catalog_description_full || "FILTROS_TÉCNICOS"
          : config.catalog_description || "LA COLECCIÓN",

        // Collection Hero Defaults
        collectionHeadline:
          config.collection_hero_headline ||
          "CATÁLOGO <br/> <span class='italic opacity-30 text-white'>EXTENDIDO.</span>",
        collectionSubheadline:
          config.collection_hero_subheadline || "ENGINEERED FOR MODERN SPACES",
        collectionImage:
          config.collection_hero_image_url ||
          "/images/pexels-photo-276528.webp",
      });
    }
  }, [isEditing, showAll, config]);

  const handleSave = async () => {
    if (showAll) {
      await updateLocalConfig({
        catalog_headline_full: editValues.headline,
        catalog_description_full: editValues.subheadline,
        collection_hero_headline: editValues.collectionHeadline,
        collection_hero_subheadline: editValues.collectionSubheadline,
        collection_hero_image_url: editValues.collectionImage,
      });
    } else {
      await updateLocalConfig({
        catalog_headline: editValues.headline,
        catalog_description: editValues.subheadline,
      });
    }
    setIsEditing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const file = await optimizeImage(e.target.files[0]);
      const url = await import("../services/supabase").then((m) =>
        m.InventoryService.uploadImage(file),
      );
      setEditValues((prev) => ({ ...prev, collectionImage: url }));
      toast.success("IMAGEN DE COLECCIÓN ACTUALIZADA");
    } catch (e) {
      console.error(e);
      toast.error("ERROR AL CARGAR IMAGEN");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeTab = tabsRef.current.find(
        (tab) => tab?.getAttribute("data-id") === filter,
      );
      if (activeTab) {
        setIndicatorStyle({
          left: activeTab.offsetLeft,
          width: activeTab.offsetWidth,
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [filter, showAll]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
    if (filter !== "all") {
      result = result.filter((p) => p.category === filter);
    }

    // Apply Price Filter
    if (priceRange.max !== null) {
      result = result.filter(
        (p) =>
          (p.price || 0) >= priceRange.min && (p.price || 0) <= priceRange.max!,
      );
    } else if (priceRange.min > 0) {
      result = result.filter((p) => (p.price || 0) >= priceRange.min);
    }

    // Apply Advanced Filters
    Object.entries(advancedFilters).forEach(([category, values]) => {
      if (values.length > 0) {
        result = result.filter((p) =>
          values.some((val) =>
            p.specs?.some(
              (spec) =>
                spec.label.toLowerCase() === category.toLowerCase() &&
                spec.value.toLowerCase().includes(val.toLowerCase()),
            ),
          ),
        );
      }
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.longDescription.toLowerCase().includes(q),
      );
    }

    // Apply Sorting
    switch (sortOption) {
      case "az":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "za":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-desc":
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "oldest":
        result.sort((a, b) =>
          (a.created_at || "").localeCompare(b.created_at || ""),
        );
        break;
      case "newest":
        result.sort((a, b) =>
          (b.created_at || "").localeCompare(a.created_at || ""),
        );
        break;
    }

    return result;
  }, [
    filter,
    allProducts,
    searchQuery,
    advancedFilters,
    sortOption,
    priceRange,
  ]);

  const displayedProducts = useMemo(() => {
    if (showAll) return filteredProducts;

    // Landing Page: Show Featured Products
    const featured = allProducts.filter((p) => p.featured);
    return featured.length > 0 ? featured.slice(0, 4) : allProducts.slice(0, 4);
  }, [showAll, filteredProducts, allProducts]);

  const displayedChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < displayedProducts.length; i += 2) {
      chunks.push(displayedProducts.slice(i, i + 2));
    }
    return chunks;
  }, [displayedProducts]);

  const filters = [
    { id: "all", label: "TODOS" },
    { id: "floor", label: "DE PIE" },
    { id: "table", label: "DE MESA" },
    { id: "tech", label: "SMART" },
    { id: "pendant", label: "COLGANTES" },
  ];

  if (loading) {
    return (
      <section
        id="showcase"
        className="py-24 bg-navyDark min-h-screen flex items-center justify-center"
      >
        <div className="font-futuristic text-xs tracking-[0.3em] text-neutral-500 animate-pulse">
          LOADING_COLLECTION...
        </div>
      </section>
    );
  }

  return (
    <section
      id="showcase"
      className={`${showAll ? "min-h-screen pt-0" : "py-24"} bg-navyDark transition-all duration-1000 overflow-hidden relative group/showcase`}
    >
      {/* Admin Controls */}
      {isAdmin && (
        <div className="absolute top-24 right-6 z-50 flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover/showcase:opacity-100"
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
              {showAll && (
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
                    title="Cambiar Imagen"
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
                </>
              )}
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

      {showAll && (
        <div className="relative h-screen w-full flex items-center justify-center overflow-hidden mb-24 group/hero">
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `scale(${heroScale})`,
            }}
          >
            <img
              src={
                isEditing
                  ? editValues.collectionImage
                  : config.collection_hero_image_url ||
                    "/images/pexels-photo-276528.webp"
              }
              alt="Collection Hero"
              className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
            />
            <div className="absolute inset-0 bg-navalBlue/60"></div>
          </div>

          <div
            className="relative z-10 text-center space-y-4"
            style={{
              opacity: heroOpacity,
              transform: `translateY(${scrollY * 0.5}px)`,
            }}
          >
            {isEditing ? (
              <div className="flex flex-col items-center gap-4 w-full">
                <RichTextEditor
                  tagName="h1"
                  initialValue={editValues.collectionHeadline}
                  onChange={(val) =>
                    setEditValues({ ...editValues, collectionHeadline: val })
                  }
                  className="font-futuristic text-5xl md:text-8xl tracking-tighter uppercase font-thin bg-transparent border border-white/20 text-center w-full max-w-5xl h-auto min-h-[10rem] p-4 focus:border-white focus:outline-none"
                  placeholder="TITULO CATALOGO..."
                />
                <input
                  value={editValues.collectionSubheadline}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      collectionSubheadline: e.target.value,
                    })
                  }
                  className="font-futuristic text-[10px] tracking-[0.6em] text-neutral-500 bg-transparent border-b border-white/20 w-full max-w-lg text-center focus:border-white focus:outline-none pb-2 mt-4"
                />
              </div>
            ) : (
              <>
                <h1
                  className="font-futuristic text-5xl md:text-8xl tracking-tighter uppercase font-thin"
                  dangerouslySetInnerHTML={{
                    __html:
                      config.collection_hero_headline ||
                      "CATÁLOGO <br/> <span class='italic opacity-30 text-white'>EXTENDIDO.</span>",
                  }}
                ></h1>
                <p className="font-futuristic text-[10px] tracking-[0.6em] text-neutral-500">
                  {config.collection_hero_subheadline ||
                    "ENGINEERED FOR MODERN SPACES"}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[100vw] mx-auto">
        <div className="flex flex-col mb-16 gap-8 px-10">
          <div className="max-w-2xl">
            <h3 className="font-futuristic text-[10px] tracking-[0.5em] text-neutral-500 mb-4 uppercase">
              {isEditing ? (
                <input
                  value={editValues.subheadline}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      subheadline: e.target.value,
                    })
                  }
                  className="bg-transparent border-b border-white/20 outline-none w-full focus:border-white transition-colors"
                />
              ) : (
                <span>
                  {showAll
                    ? config.catalog_description_full || "FILTROS_TÉCNICOS"
                    : config.catalog_description || "LA COLECCIÓN"}
                </span>
              )}
            </h3>
            <h2 className="text-4xl md:text-8xl font-extralight tracking-tighter leading-none mb-12">
              {isEditing ? (
                <RichTextEditor
                  tagName="h2"
                  initialValue={editValues.headline}
                  onChange={(val) =>
                    setEditValues({ ...editValues, headline: val })
                  }
                  className="bg-transparent border border-white/20 outline-none w-full h-auto min-h-[8rem] focus:border-white transition-colors p-2 text-4xl font-extralight tracking-tighter"
                  placeholder="TITULO PRINCIPAL..."
                />
              ) : (
                <span
                  dangerouslySetInnerHTML={{
                    __html: showAll
                      ? config.catalog_headline_full ||
                        "SISTEMAS <br/> <span class='opacity-40 italic'>ETNA.</span>"
                      : config.catalog_headline ||
                        "DISEÑO <br/> <span class='opacity-40 italic'>EXPANSIVO.</span>",
                  }}
                />
              )}
            </h2>

            {showAll && (
              <div className="flex flex-col gap-8 relative z-[200]">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="font-futuristic text-xs tracking-[0.2em] border-b border-white/30 text-white/50 hover:text-white hover:border-white transition-all pb-1 uppercase"
                  >
                    {showFilters ? "- OCULTAR FILTROS" : "+ MOSTRAR FILTROS"}
                  </button>

                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="BUSCAR_DISEÑO..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-b border-white/10 text-white font-futuristic text-[10px] tracking-widest uppercase w-48 focus:w-64 focus:border-white outline-none transition-all py-1 pl-6"
                    />
                    <svg
                      className="w-3 h-3 text-white/50 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>

                {showFilters && (
                  <div className="animate-in slide-in-from-left-4 fade-in duration-500">
                    <div className="flex flex-wrap gap-4 md:gap-12 mb-8">
                      {filters.map((f) => (
                        <button
                          key={f.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFilter(f.id);
                          }}
                          className={`relative z-[300] font-futuristic text-[11px] tracking-widest transition-all duration-300 cursor-pointer outline-none select-none px-4 py-3 bg-transparent md:bg-navalBlue/40 ${
                            filter === f.id
                              ? "text-white tracking-[0.25em] border-b border-white"
                              : "text-[#a3a3a3] hover:text-white border-b border-transparent hover:border-white/20"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-6">
                        <button
                          onClick={() =>
                            setShowAdvancedFilters(!showAdvancedFilters)
                          }
                          className="font-futuristic text-[10px] tracking-[0.2em] bg-white/5 px-6 py-2 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors uppercase"
                        >
                          {showAdvancedFilters
                            ? "FILTROS AVANZADOS -"
                            : "FILTROS AVANZADOS +"}
                        </button>

                        <button
                          onClick={clearAllFilters}
                          className="font-futuristic text-[10px] tracking-[0.2em] text-neutral-500 hover:text-red-400 transition-colors uppercase"
                        >
                          LIMPIAR FILTROS X
                        </button>
                      </div>

                      <div
                        className={`grid transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${showAdvancedFilters ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-50"}`}
                      >
                        <div className="overflow-hidden">
                          <div className="mt-6 p-6 border border-white/10 bg-white/5 grid grid-cols-2 lg:grid-cols-5 gap-8">
                            {[
                              {
                                label: "Material",
                                options: [
                                  "METAL",
                                  "VIDRIO",
                                  "MADERA",
                                  "HORMIGÓN",
                                ],
                              },
                              {
                                label: "Color Temp",
                                options: ["2700K", "3000K", "4000K", "TUNABLE"],
                              },
                              {
                                label: "Dimming",
                                options: ["DALI", "0-10V", "PHASE", "ZIGBEE"],
                              },
                            ].map((category) => (
                              <div key={category.label} className="space-y-4">
                                <h4 className="font-futuristic text-[9px] tracking-[0.2em] text-white/40 uppercase">
                                  {category.label}
                                </h4>
                                <div className="space-y-2">
                                  {category.options.map((option) => (
                                    <label
                                      key={option}
                                      className="flex items-center gap-2 cursor-pointer group select-none"
                                      onClick={() =>
                                        toggleAdvancedFilter(
                                          category.label,
                                          option,
                                        )
                                      }
                                    >
                                      <div
                                        className={`w-3 h-3 border transition-colors ${advancedFilters[category.label]?.includes(option) ? "bg-white border-white" : "border-white/20 group-hover:border-white"}`}
                                      ></div>
                                      <span
                                        className={`font-futuristic text-[9px] tracking-widest transition-colors ${advancedFilters[category.label]?.includes(option) ? "text-white" : "text-neutral-400 group-hover:text-white"}`}
                                      >
                                        {option}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {/* Sorting Column */}
                            <div className="space-y-4">
                              <h4 className="font-futuristic text-[9px] tracking-[0.2em] text-white/40 uppercase">
                                ORDENAR
                              </h4>
                              <div className="space-y-2 flex flex-col items-start">
                                {[
                                  { id: "default", label: "RECOMENDADO" },
                                  { id: "newest", label: "MÁS RECIENTES" },
                                  { id: "oldest", label: "MÁS ANTIGUOS" },
                                  { id: "az", label: "A - Z" },
                                  { id: "za", label: "Z - A" },
                                  {
                                    id: "price-asc",
                                    label: "PRECIO: BAJO-ALTO",
                                  },
                                  {
                                    id: "price-desc",
                                    label: "PRECIO: ALTO-BAJO",
                                  },
                                ].map((opt) => (
                                  <button
                                    key={opt.id}
                                    onClick={() => setSortOption(opt.id)}
                                    className={`text-left font-futuristic text-[9px] tracking-widest transition-colors ${sortOption === opt.id ? "text-white underline decoration-white/30 underline-offset-4" : "text-neutral-500 hover:text-white"}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Price Range Column */}
                            <div className="space-y-4">
                              <h4 className="font-futuristic text-[9px] tracking-[0.2em] text-white/40 uppercase">
                                RANGO ($)
                              </h4>
                              <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] text-neutral-500 font-futuristic">
                                    MIN
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={priceRange.min}
                                    onChange={(e) =>
                                      setPriceRange((prev) => ({
                                        ...prev,
                                        min: Number(e.target.value),
                                      }))
                                    }
                                    className="bg-navalBlue/20 border border-white/10 text-white text-[10px] p-2 focus:border-white transition-colors outline-none font-mono w-full"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] text-neutral-500 font-futuristic">
                                    MAX
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      priceRange.max === null
                                        ? ""
                                        : priceRange.max
                                    }
                                    placeholder="ILIMITADO"
                                    onChange={(e) =>
                                      setPriceRange((prev) => ({
                                        ...prev,
                                        max: e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      }))
                                    }
                                    className="bg-navalBlue/20 border border-white/10 text-white text-[10px] p-2 focus:border-white transition-colors outline-none font-mono w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full bg-navalBlue">
          {displayedChunks.map((chunk, idx) => (
            <ExpandingGridRow
              key={idx}
              products={chunk}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>

        {!showAll && (
          <div className="mt-20 text-center pb-12 px-4">
            <button
              onClick={onShowAll}
              className="px-20 py-6 border border-white/10 hover:border-white transition-all duration-700 font-futuristic text-[10px] tracking-[0.5em] group overflow-hidden relative"
            >
              <span className="relative z-10">
                VER COLECCIÓN COMPLETA{" "}
                <span className="inline-block transition-transform group-hover:translate-x-4">
                  →
                </span>
              </span>
              <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 -z-0"></div>
              <span className="absolute inset-0 flex items-center justify-center text-navalBlue opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 font-futuristic text-[10px] tracking-[0.5em]">
                VER_TODO
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeatureGrid;
