import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "../context/ConfigContext";
import { supabase } from "../services/supabase";
import { AdminConsultations } from "./admin/AdminConsultations";
import { AdminDashboard } from "./admin/AdminDashboard";
import { AdminInventory } from "./admin/AdminInventory";
import { AdminOrders } from "./admin/AdminOrders";

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { config, updateLocalConfig } = useConfig();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("admin@etna.com");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState({
    orders: 0,
    consultations: 0,
    lowStock: 0,
  });
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "collection" | "orders" | "consultations" | "settings"
  >("dashboard");

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      }
    });
  }, []); // Run once on mount

  const fetchCounts = React.useCallback(async () => {
    const { count: ordersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: consultationsCount } = await supabase
      .from("consultations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: lowStockCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .lt("stock", 5);

    setCounts({
      orders: ordersCount || 0,
      consultations: consultationsCount || 0,
      lowStock: lowStockCount || 0,
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCounts();

      // Subscribe to changes in Orders, Consultations and Products tables
      const channel = supabase
        .channel("admin_global_updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            fetchCounts();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "consultations" },
          () => {
            fetchCounts();
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => {
            fetchCounts();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, fetchCounts]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    window.innerWidth < 768,
  );

  // Theme logic is now handled in ConfigContext

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC (only if authenticated to avoid accidental close during login)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If we are authenticated, ESC closes the panel.
      // If we are NOT authenticated, ESC also simply calls onClose() to return to home.
      if (e.key === "Escape") onClose();
    };

    // Only set up click outside if we are actually showing the modal (though we are full screen now)
    // Actually, since it's full screen, click outside concept changes.
    // We will leave the logic but effectively the modal covers everything so click outside is impossible unless margin.

    const handleResize = () => {
      if (window.innerWidth < 768) setIsSidebarCollapsed(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [onClose]);

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setIsLoading(false);
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("CREDENCIALES INVÁLIDAS");
      } else if (data.session) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("ERROR AL INICIAR SESIÓN");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[50000] bg-white dark:bg-navalBlue flex items-center justify-center p-6 animate-in fade-in duration-500 text-navalBlue dark:text-white">
        <div className="max-w-md w-full p-12 border border-navalBlue/10 dark:border-white/10 bg-neutral-50 dark:bg-navalBlue shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 opacity-50 hover:opacity-100"
          >
            <svg
              className="w-4 h-4"
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

          <h2 className="font-futuristic text-xl tracking-[0.5em] text-center mb-12">
            ADMIN_ACCESS
          </h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 block uppercase">
                IDENTITY
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-navalBlue border-b border-navalBlue/20 dark:border-white/20 py-3 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light text-navalBlue dark:text-white"
                placeholder="USER_ID"
              />
            </div>
            <div className="space-y-2">
              <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 block uppercase">
                PASS_PHRASE
              </label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-navalBlue border-b border-navalBlue/20 dark:border-white/20 py-3 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light text-navalBlue dark:text-white"
                placeholder="******"
              />
            </div>
            <button
              disabled={isLoading}
              className="w-full py-4 bg-navalBlue dark:bg-white text-white dark:text-navalBlue font-futuristic text-[10px] tracking-[0.3em] hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? "VERIFYING..." : "VERIFY_IDENTITY"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-[9px] font-futuristic tracking-widest text-neutral-500 hover:text-navalBlue dark:hover:text-white transition-colors"
            >
              CANCEL
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[50000] bg-white dark:bg-navalBlue flex animate-in fade-in duration-700 text-navalBlue dark:text-white">
      {/* Sidebar */}
      <aside
        className={`${isSidebarCollapsed ? "w-20" : "w-72"} border-r border-navalBlue/5 dark:border-white/5 flex flex-col transition-all duration-300 ease-in-out bg-neutral-50 dark:bg-navyDark shrink-0 overflow-visible relative z-20`}
      >
        <div
          className={`p-8 flex items-start ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}
        >
          {isSidebarCollapsed ? (
            <span className="font-futuristic text-xl tracking-widest animate-in fade-in duration-300">
              A
            </span>
          ) : (
            <div className="mb-0 animate-in fade-in duration-300">
              <h2 className="font-futuristic text-xl tracking-[0.3em] whitespace-nowrap">
                ETNA_OS
              </h2>
              <p className="text-[8px] font-futuristic tracking-[0.4em] text-neutral-600 mt-2">
                TERMINAL_v4.2
              </p>
            </div>
          )}
        </div>

        {/* Floating Collapse Button (better UX) */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-9 z-50 bg-white dark:bg-navalBlue border border-neutral-200 dark:border-neutral-800 rounded-full p-1 text-neutral-500 hover:text-navalBlue dark:hover:text-white hover:border-navalBlue dark:hover:border-white transition-all shadow-sm"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <nav className="flex-1 space-y-2 mt-8">
          {[
            {
              id: "dashboard",
              label: "DASHBOARD",
              icon: "M4 6h16M4 12h16M4 18h16",
            },
            {
              id: "collection",
              label: "COLLECTION",
              icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z",
            },
            {
              id: "orders",
              label: "ÓRDENES",
              icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
            },
            {
              id: "consultations",
              label: "CONSULTAS",
              icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
            },
            {
              id: "settings",
              label: "SETTINGS",
              icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full font-futuristic text-[9px] tracking-[0.4em] flex items-center transition-all py-3 relative group ${isSidebarCollapsed ? "justify-center px-0" : "justify-start px-8 gap-4"} ${activeTab === tab.id ? "text-navalBlue dark:text-white bg-navalBlue/5 dark:bg-white/5 border-r-2 border-navalBlue dark:border-white" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 hover:bg-navalBlue/5 dark:hover:bg-white/5 border-r-2 border-transparent"}`}
            >
              <div className="relative overflow-visible">
                <svg
                  className="w-4 h-4 min-w-[1rem]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d={tab.icon}
                  />
                </svg>
                {isSidebarCollapsed &&
                  tab.id === "orders" &&
                  counts.orders > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-600 w-1.5 h-1.5 rounded-full z-[100] pointer-events-none shadow-sm"></span>
                  )}
                {isSidebarCollapsed &&
                  tab.id === "consultations" &&
                  counts.consultations > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-600 w-1.5 h-1.5 rounded-full z-[100] pointer-events-none shadow-sm"></span>
                  )}
                {isSidebarCollapsed &&
                  tab.id === "collection" &&
                  counts.lowStock > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-600 w-1.5 h-1.5 rounded-full z-[100] pointer-events-none shadow-sm"></span>
                  )}
              </div>

              <span
                className={`truncate transition-all duration-300 relative overflow-visible ${isSidebarCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}
              >
                {tab.label}
                {tab.id === "orders" && counts.orders > 0 && (
                  <span className="ml-2 text-red-600 font-sans font-bold text-[10px]">
                    {counts.orders}
                  </span>
                )}
                {tab.id === "consultations" && counts.consultations > 0 && (
                  <span className="ml-2 text-red-600 font-sans font-bold text-[10px]">
                    {counts.consultations}
                  </span>
                )}
                {tab.id === "collection" && counts.lowStock > 0 && (
                  <span className="ml-2 text-red-600 font-sans font-bold text-[10px]">
                    {counts.lowStock}
                  </span>
                )}
              </span>

              {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 bg-white dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 text-navalBlue dark:text-white text-[9px] py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl rounded-r">
                  {tab.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Theme Toggle */}
        <div className="flex flex-col border-t border-navalBlue/5 dark:border-white/5">
          <button
            onClick={() =>
              updateLocalConfig({
                theme: config.theme === "dark" ? "light" : "dark",
              })
            }
            className={`font-futuristic text-[9px] tracking-[0.4em] text-neutral-500 hover:text-navalBlue dark:hover:text-white transition-colors flex items-center py-6 hover:bg-navalBlue/5 dark:hover:bg-white/5 ${isSidebarCollapsed ? "justify-center" : "px-8 gap-4"}`}
            title={
              config.theme === "dark"
                ? "Switch to Light Mode"
                : "Switch to Dark Mode"
            }
          >
            {config.theme === "dark" ? (
              <svg
                className="w-4 h-4 min-w-[1rem]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 min-w-[1rem]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
            {!isSidebarCollapsed && (
              <span>
                {config.theme === "dark" ? "LIGHT_MODE" : "DARK_MODE"}
              </span>
            )}
          </button>

          <button
            onClick={onClose}
            className={`font-futuristic text-[9px] tracking-[0.4em] text-neutral-500 hover:text-navalBlue dark:hover:text-white transition-colors flex items-center py-6 hover:bg-navalBlue/5 dark:hover:bg-white/5 border-t border-navalBlue/5 dark:border-white/5 ${isSidebarCollapsed ? "justify-center" : "px-8 gap-4"}`}
            title="Volver al Sitio"
          >
            <svg
              className="w-4 h-4 min-w-[1rem]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {!isSidebarCollapsed && "RETURN"}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className={`font-futuristic text-[9px] tracking-[0.4em] text-neutral-600 hover:text-navalBlue dark:hover:text-white transition-colors flex items-center py-6 hover:bg-navalBlue/5 dark:hover:bg-white/5 ${isSidebarCollapsed ? "justify-center" : "px-8 gap-4"}`}
          title="Logout"
        >
          <svg
            className="w-4 h-4 min-w-[1rem]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {!isSidebarCollapsed && <span>LOGOUT</span>}
        </button>
      </aside>

      {/* Main Content */}
      <main
        data-lenis-prevent
        className="flex-1 p-6 md:p-20 overflow-y-auto bg-white dark:bg-navyDark transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto">
          {activeTab === "dashboard" && <AdminDashboard />}

          {activeTab === "collection" && (
            <AdminInventory onUpdate={fetchCounts} />
          )}

          {activeTab === "orders" && <AdminOrders onUpdate={fetchCounts} />}

          {activeTab === "consultations" && (
            <AdminConsultations onUpdate={fetchCounts} />
          )}

          {activeTab === "settings" && (
            <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
              <div className="border-b border-navalBlue/5 dark:border-white/5 pb-8">
                <h2 className="text-4xl font-thin tracking-tighter uppercase">
                  CORE_SETTINGS
                </h2>
                <p className="font-futuristic text-[9px] tracking-widest text-neutral-600 mt-2">
                  CONFIGURACIÓN DE SISTEMAS GLOBALES
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      SITE_NAME
                    </label>
                    <input
                      type="text"
                      value={config.site_name}
                      onChange={(e) =>
                        updateLocalConfig({ site_name: e.target.value })
                      }
                      className="w-full bg-neutral-100 dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 p-4 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      SITE_DESCRIPTION
                    </label>
                    <input
                      type="text"
                      value={config.site_description}
                      onChange={(e) =>
                        updateLocalConfig({ site_description: e.target.value })
                      }
                      className="w-full bg-neutral-100 dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 p-4 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      HERO_HEADLINE (MAIN TITLE)
                    </label>
                    <input
                      type="text"
                      value={config.hero_headline || ""}
                      onChange={(e) =>
                        updateLocalConfig({ hero_headline: e.target.value })
                      }
                      className="w-full bg-neutral-100 dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 p-4 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-xl font-light"
                      placeholder="ETNA"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      HERO_SUBHEADLINE
                    </label>
                    <input
                      type="text"
                      value={config.hero_subheadline || ""}
                      onChange={(e) =>
                        updateLocalConfig({ hero_subheadline: e.target.value })
                      }
                      className="w-full bg-neutral-100 dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 p-4 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light"
                      placeholder="LIGHTING_TECH"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      HERO_MAIN_TEXT
                    </label>
                    <textarea
                      value={config.hero_text || ""}
                      onChange={(e) =>
                        updateLocalConfig({ hero_text: e.target.value })
                      }
                      className="w-full bg-neutral-100 dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 p-4 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light resize-none h-32"
                      placeholder="Texto principal del Hero..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      OPENING_HOURS
                    </label>
                    <input
                      type="text"
                      value={config.opening_hours}
                      onChange={(e) =>
                        updateLocalConfig({ opening_hours: e.target.value })
                      }
                      className="w-full bg-neutral-100 dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 p-4 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      WHATSAPP_NUMBER
                    </label>
                    <input
                      type="text"
                      value={config.contact_phone}
                      onChange={(e) =>
                        updateLocalConfig({ contact_phone: e.target.value })
                      }
                      className="w-full bg-neutral-100 dark:bg-navalBlue border border-navalBlue/10 dark:border-white/10 p-4 outline-none focus:border-navalBlue dark:focus:border-white transition-colors text-sm font-light"
                      placeholder="+54 9 11 1234 5678"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      GLOBAL_THEME
                    </label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => updateLocalConfig({ theme: "light" })}
                        className={`w-12 h-12 bg-white border border-neutral-200 shadow-sm ${config.theme === "light" ? "ring-2 ring-black ring-offset-2" : ""}`}
                      ></button>
                      <button
                        onClick={() => updateLocalConfig({ theme: "dark" })}
                        className={`w-12 h-12 bg-navalBlue border border-neutral-800 ${config.theme === "dark" ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""}`}
                      ></button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      AI_FEATURES (CHAT & SIMULATION)
                    </label>
                    <div
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() =>
                        updateLocalConfig({ ai_active: !config.ai_active })
                      }
                    >
                      <div
                        className={`w-12 h-6 rounded-full relative transition-colors ${config.ai_active ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-700"}`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${config.ai_active ? "left-7" : "left-1"}`}
                        ></div>
                      </div>
                      <span
                        className={`text-[10px] font-futuristic tracking-widest transition-colors ${config.ai_active ? "text-green-500" : "text-neutral-500"}`}
                      >
                        {config.ai_active ? "ACTIVE" : "DISABLED"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="font-futuristic text-[9px] tracking-widest text-neutral-500 uppercase block">
                      DATA_SOURCE
                    </label>
                    <div
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() =>
                        updateLocalConfig({
                          use_mock_data: !config.use_mock_data,
                        })
                      }
                    >
                      <div
                        className={`w-12 h-6 rounded-full relative transition-colors ${!config.use_mock_data ? "bg-blue-500" : "bg-neutral-300 dark:bg-neutral-700"}`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${!config.use_mock_data ? "left-7" : "left-1"}`}
                        ></div>
                      </div>
                      <span
                        className={`text-[10px] font-futuristic tracking-widest transition-colors ${!config.use_mock_data ? "text-blue-500" : "text-neutral-500"}`}
                      >
                        {!config.use_mock_data
                          ? "SUPABASE (REAL)"
                          : "MOCK DATA (LOCAL)"}
                      </span>
                    </div>
                    <p className="text-[9px] text-neutral-400 mt-2">
                      Cambia entre los datos de prueba locales y la base de
                      datos real de Supabase.
                    </p>
                  </div>
                </div>

                <div className="p-10 border border-navalBlue/5 dark:border-white/5 bg-neutral-50 dark:bg-navalBlue/40 h-fit">
                  <h4 className="font-futuristic text-[10px] tracking-widest mb-6 opacity-40">
                    SYSTEM_STATUS
                  </h4>
                  <p className="text-xs font-light text-neutral-500 mb-8 leading-relaxed">
                    La configuración se sincroniza en tiempo real con la base de
                    datos distribuida. El estado de la IA afecta tanto al Chat
                    como a la Simulación de Productos.
                  </p>
                  <div className="text-[10px] font-futuristic tracking-widest text-neutral-400">
                    ID_CONFIG: {config.id || "LOCAL"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
