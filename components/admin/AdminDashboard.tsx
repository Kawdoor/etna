import React, { useEffect, useState } from "react";
import { InventoryService, supabase } from "../../services/supabase";
import { Product } from "../../types";

export const AdminDashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState({
    orders: 0,
    consultations: 0,
    lowStock: 0,
  });
  const [latestOrders, setLatestOrders] = useState<any[]>([]);
  const [latestConsultations, setLatestConsultations] = useState<any[]>([]);

  useEffect(() => {
    InventoryService.getProducts().then(setProducts).catch(console.error);

    const fetchCounts = async () => {
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

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: consultationsData } = await supabase
        .from("consultations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setCounts({
        orders: ordersCount || 0,
        consultations: consultationsCount || 0,
        lowStock: lowStockCount || 0,
      });
      setLatestOrders(ordersData || []);
      setLatestConsultations(consultationsData || []);
    };

    fetchCounts();

    const channel = supabase
      .channel("dashboard_stats")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        fetchCounts();
        InventoryService.getProducts().then(setProducts).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Stats Calculation
  const totalProducts = products.length;
  // Calculate total stock value
  const stockValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);

  const categories = products.reduce(
    (acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const categoryData = Object.entries(categories).map(
    ([name, value], index) => {
      const percentage = (value / totalProducts) * 100;
      // Calculate cumulative offset for pie slices (simplified as conic gradient stops)
      return { name, value, percentage };
    },
  );

  const topProducts = products
    .sort((a, b) => (b.price * b.stock) - (a.price * a.stock))
    .slice(0, 5);

  // Simple Conic Gradient For Pie Chart
  let currentAngle = 0;
  const pieSegments = categoryData.map((cat, i) => {
    const start = currentAngle;
    const end = currentAngle + cat.percentage * 3.6; // 360 deg / 100
    currentAngle = end;

    // Aesthetic colors fitting the theme
    const colors = ["#333", "#666", "#999", "#CCC", "#EEE"];
    const color = colors[i % colors.length];

    return `${color} ${start}deg ${end}deg`;
  });

  const pieGradient = `conic-gradient(${pieSegments.join(", ")})`;

  return (
    <div className="space-y-16 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-navalBlue/5 dark:border-white/5 pb-8">
        <h2 className="text-4xl md:text-6xl font-thin tracking-tighter">
          SISTEMA <br />
          <span className="opacity-40 italic">MÉTRICO.</span>
        </h2>
        <span className="font-futuristic text-[10px] tracking-widest text-neutral-500">
          SYSTEM_UPTIME: 99.9%
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
        {[
          {
            label: "TOTAL_SKU",
            value: totalProducts,
            change: "ACTIVE",
            alert: false,
          },
          {
            label: "VALOR_STOCK",
            value: new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(stockValue),
            change: "",
            alert: false,
          },
          {
            label: "CONSULTAS_PENDING",
            value: counts.consultations,
            change: counts.consultations > 0 ? "ACTION_REQ" : "ALL_CLEAR",
            alert: counts.consultations > 0,
          },
          {
            label: "ORDENES_PENDING",
            value: counts.orders,
            change: counts.orders > 0 ? "PRIORITY" : "FULFILLED",
            alert: counts.orders > 0,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className={`p-8 border bg-neutral-50 dark:bg-adminBlue/40 hover:border-navalBlue/20 dark:hover:border-white/20 transition-colors ${
              stat.alert
                ? "border-red-500/50 dark:border-red-500/50"
                : "border-navalBlue/5 dark:border-white/5"
            }`}
          >
            <span className="font-futuristic text-[9px] tracking-widest text-neutral-600 block mb-4 uppercase truncate">
              {stat.label}
            </span>
            <div className="flex items-baseline gap-4">
              <span
                className={`text-3xl font-light tracking-tighter block ${stat.alert ? "text-red-500 font-normal" : ""}`}
                title={
                  typeof stat.value === "string"
                    ? stat.value
                    : String(stat.value)
                }
              >
                {stat.value}
              </span>
              <span
                className={`text-[9px] font-futuristic tracking-widest ${
                  stat.change === "ACTIVE"
                    ? "text-blue-500"
                    : stat.change === "ESTIMATED..."
                      ? "text-neutral-400 animate-pulse"
                      : stat.alert
                        ? "text-red-500 animate-pulse"
                        : "text-green-500"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
        {/* Pie Chart Card */}
        <div className="p-8 md:p-12 border border-navalBlue/5 dark:border-white/5 bg-neutral-50 dark:bg-adminBlue/20">
          <h3 className="font-futuristic text-[10px] tracking-[0.3em] uppercase mb-12 dark:text-white text-navalBlue">
            DISTRIBUCIÓN_CATEGORÍA
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div
              className="relative w-48 h-48 rounded-full shadow-2xl"
              style={{ background: pieGradient }}
            >
              <div className="absolute inset-4 rounded-full bg-neutral-50 dark:bg-[#111] flex items-center justify-center">
                <span className="font-futuristic text-2xl tracking-tighter opacity-50">
                  {totalProducts}
                </span>
              </div>
            </div>

            <div className="space-y-4 flex-1 w-full">
              {categoryData.map((cat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: [
                          "#333",
                          "#666",
                          "#999",
                          "#CCC",
                          "#EEE",
                        ][i % 5],
                      }}
                    ></div>
                    <span className="text-xs font-futuristic uppercase tracking-wider text-neutral-500 group-hover:text-navalBlue dark:group-hover:text-white transition-colors">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono opacity-50">
                    {Math.round(cat.percentage)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="p-8 md:p-12 border border-navalBlue/5 dark:border-white/5 bg-neutral-50 dark:bg-adminBlue/20 flex flex-col">
          <h3 className="font-futuristic text-[10px] tracking-[0.3em] uppercase mb-12 dark:text-white text-navalBlue">
            TOP_PRODUCTOS_VALOR
          </h3>
          <div className="flex-1 flex items-end justify-between gap-4 h-48 w-full border-b border-navalBlue/10 dark:border-white/10 pb-4">
            {topProducts.map((p, i) => {
              const value = p.price * p.stock;
              const maxValue = Math.max(...topProducts.map(p => p.price * p.stock));
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <div
                  key={i}
                  className="relative group flex-1 bg-gray-500 dark:bg-gray-400 rounded-t hover:bg-navalBlue dark:hover:bg-white transition-all duration-500"
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-navalBlue dark:bg-white text-white dark:text-navalBlue text-[9px] py-1 px-2 rounded">
                    {value.toFixed(0)} USD
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-[9px] font-futuristic text-neutral-400">
            {topProducts.map((p, i) => (
              <span key={i}>{p.name.slice(0, 3).toUpperCase()}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
        {/* Latest Orders */}
        <div className="p-8 md:p-12 border border-navalBlue/5 dark:border-white/5 bg-neutral-50 dark:bg-adminBlue/20">
          <h3 className="font-futuristic text-[10px] tracking-[0.3em] uppercase mb-12 dark:text-white text-navalBlue">
            ÚLTIMAS ÓRDENES
          </h3>
          <div className="space-y-4">
            {latestOrders.map((order, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-navalBlue/5 dark:border-white/5">
                <span className="text-sm">{new Date(order.created_at).toLocaleDateString()}</span>
                <span className="text-sm font-bold">{order.total ? `${order.total} USD` : '0 USD'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Consultations */}
        <div className="p-8 md:p-12 border border-navalBlue/5 dark:border-white/5 bg-neutral-50 dark:bg-adminBlue/20">
          <h3 className="font-futuristic text-[10px] tracking-[0.3em] uppercase mb-12 dark:text-white text-navalBlue">
            ÚLTIMAS CONSULTAS
          </h3>
          <div className="space-y-4">
            {latestConsultations.map((consult, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-navalBlue/5 dark:border-white/5">
                <span className="text-sm font-mono">{consult.name || consult.email}</span>
                <span className="text-sm">{new Date(consult.created_at).toLocaleDateString()}</span>
                <span className="text-sm">{consult.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="p-8 md:p-12 border border-navalBlue/5 dark:border-white/5 bg-neutral-50 dark:bg-adminBlue/20 flex flex-col">
        <h3 className="font-futuristic text-[10px] tracking-[0.3em] uppercase mb-12 dark:text-white text-navalBlue">
          RENDIMIENTO_MENSUAL
        </h3>
        <div className="flex-1 flex items-end justify-between gap-4 h-48 w-full border-b border-navalBlue/10 dark:border-white/10 pb-4">
          {[40, 65, 30, 85, 50, 75, 90, 60, 45, 80, 55, 70].map((h, i) => (
            <div
              key={i}
              className="relative group flex-1 bg-gray-500 dark:bg-gray-400 rounded-t hover:bg-navalBlue dark:hover:bg-white transition-all duration-500"
              style={{ height: `${h}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-navalBlue dark:bg-white text-white dark:text-navalBlue text-[9px] py-1 px-2 rounded">
                {h}%
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-[9px] font-futuristic text-neutral-400">
          <span>ENE</span>
          <span>FEB</span>
          <span>MAR</span>
          <span>ABR</span>
          <span>MAY</span>
          <span>JUN</span>
          <span className="hidden md:inline">JUL</span>
          <span className="hidden md:inline">AGO</span>
          <span className="hidden md:inline">SEP</span>
          <span className="hidden md:inline">OCT</span>
          <span className="hidden md:inline">NOV</span>
          <span className="hidden md:inline">DIC</span>
        </div>
      </div>
    </div>
  );
};
