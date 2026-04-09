import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfig } from "../../context/ConfigContext";
import { InventoryService, supabase } from "../../services/supabase";
import { Product } from "../../types";
import { optimizeImage } from "../../utils/imageOptimizer";
import { TableRowSkeleton } from "../ui/AdminSkeletons";

interface AdminInventoryProps {
  onUpdate?: () => void;
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({ onUpdate }) => {
  const { config } = useConfig();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel("products_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          loadProducts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config.use_mock_data]);

  const loadProducts = async () => {
    setIsLoading(true);
    if (!config.use_mock_data) {
      try {
        const data = await InventoryService.getProducts();
        setProducts(data);
      } catch (error) {
        console.error(
          "Failed to load products from Supabase, falling back to mock:",
          error,
        );
        const { allProducts } = await import("../../data/products");
        setProducts(allProducts);
      }
    } else {
      const { allProducts } = await import("../../data/products");
      setProducts(allProducts);
    }
    setIsLoading(false);
  };

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => (p.stock || 0) < 5);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (showLowStockOnly) {
      result = result.filter((p) => (p.stock || 0) < 5);
    }

    return result.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [products, searchTerm, showLowStockOnly]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const id = productToDelete;

    try {
      // Clean up images first
      const product = products.find((p) => p.id === id);
      if (product?.gallery?.length) {
        await Promise.all(
          product.gallery.map((img) => InventoryService.deleteImage(img)),
        );
      }

      await InventoryService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setProductToDelete(null);
      toast.success("PRODUCTO ELIMINADO");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("ERROR AL ELIMINAR EL PRODUCTO");
    }
  };

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<{
    type: "increase" | "decrease";
    mode: "fixed" | "percentage";
    value: number;
  }>({
    type: "increase",
    mode: "fixed",
    value: 0,
  });

  const handleBulkEdit = async () => {
    if (selectedProducts.length === 0) return;

    // Process Local State
    const updatedProducts = products.map((p) => {
      if (!selectedProducts.includes(p.id)) return p;

      let newPrice = p.price || 0;
      const change =
        bulkAction.mode === "fixed"
          ? bulkAction.value
          : newPrice * (bulkAction.value / 100);

      if (bulkAction.type === "increase") {
        newPrice += change;
      } else {
        newPrice -= change;
      }

      return { ...p, price: Math.max(0, Number(newPrice.toFixed(2))) };
    });

    // Optimistic Update
    setProducts(updatedProducts);

    try {
      // Process Backend Updates
      await Promise.all(
        updatedProducts
          .filter((p) => selectedProducts.includes(p.id))
          .map((p) => InventoryService.updateProduct(p.id, { price: p.price })),
      );
      toast.success(
        `PRECIOS ACTUALIZADOS EN ${selectedProducts.length} PRODUCTOS`,
      );
      setIsBulkEditOpen(false);
      setSelectedProducts([]);
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
      toast.error("ERROR AL ACTUALIZAR PRECIOS");
      loadProducts(); // Revert on error
    }
  };

  const handleSave = async (product: Product) => {
    try {
      // Cleanup removed images from storage
      if (editingProduct) {
        const oldImages = editingProduct.gallery || [];
        const newImages = product.gallery || [];
        const removedImages = oldImages.filter(
          (img) => !newImages.includes(img),
        );

        if (removedImages.length > 0) {
          await Promise.all(
            removedImages.map((img) => InventoryService.deleteImage(img)),
          );
        }
      }

      if (product.id.startsWith("NEW_")) {
        const { id, ...data } = product;
        const saved = await InventoryService.addProduct(data);
        setProducts((prev) => [saved, ...prev]);
      } else {
        const saved = await InventoryService.updateProduct(product.id, product);
        setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      toast.success("INVENTARIO ACTUALIZADO");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("ERROR AL GUARDAR EL PRODUCTO");
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.error("NO HAY DATOS PARA EXPORTAR");
      return;
    }

    const headers = [
      "ID",
      "NAME",
      "CATEGORY",
      "DESCRIPTION",
      "PRICE",
      "SALE_PRICE",
      "STOCK",
      "TAG",
      "FEATURED",
      "VISIBLE",
      "CREATED_AT",
    ];

    const csvContent = products.map((p) =>
      [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        `"${p.description?.replace(/"/g, '""') || ""}"`,
        p.price || 0,
        p.sale_price || "",
        p.stock || 0,
        p.tag || "",
        p.featured ? "YES" : "NO",
        p.visible !== false ? "YES" : "NO",
        p.created_at || "",
      ].join(","),
    );

    const csvData = [headers.join(","), ...csvContent].join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `etna_inventory_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("EXPORTACIÓN COMPLETADA");
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Bulk Edit Modal */}
        {isBulkEditOpen && (
          <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-navalBlue/80 backdrop-blur-sm"
              onClick={() => setIsBulkEditOpen(false)}
            />
            <div className="bg-white dark:bg-[#111] p-8 w-full max-w-md relative z-10 rounded-xl border border-neutral-200 dark:border-white/10 shadow-2xl space-y-6">
              <div>
                <h3 className="font-futuristic text-lg tracking-widest uppercase mb-1 dark:text-white">
                  MODIFICACIÓN MASIVA
                </h3>
                <p className="text-xs text-neutral-500">
                  Aplicando cambios a {selectedProducts.length} productos
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setBulkAction((prev) => ({ ...prev, type: "increase" }))
                    }
                    className={`p-3 text-[10px] font-futuristic tracking-widest border transition-all ${bulkAction.type === "increase" ? "bg-navalBlue text-white dark:bg-white dark:text-navalBlue border-transparent" : "border-neutral-200 dark:border-white/20 text-neutral-500"}`}
                  >
                    AUMENTAR (+)
                  </button>
                  <button
                    onClick={() =>
                      setBulkAction((prev) => ({ ...prev, type: "decrease" }))
                    }
                    className={`p-3 text-[10px] font-futuristic tracking-widest border transition-all ${bulkAction.type === "decrease" ? "bg-navalBlue text-white dark:bg-white dark:text-navalBlue border-transparent" : "border-neutral-200 dark:border-white/20 text-neutral-500"}`}
                  >
                    DISMINUIR (-)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setBulkAction((prev) => ({ ...prev, mode: "fixed" }))
                    }
                    className={`p-3 text-[10px] font-futuristic tracking-widest border transition-all ${bulkAction.mode === "fixed" ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-white/30" : "border-neutral-200 dark:border-white/10 text-neutral-500"}`}
                  >
                    VALOR FIJO ($)
                  </button>
                  <button
                    onClick={() =>
                      setBulkAction((prev) => ({ ...prev, mode: "percentage" }))
                    }
                    className={`p-3 text-[10px] font-futuristic tracking-widest border transition-all ${bulkAction.mode === "percentage" ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-white/30" : "border-neutral-200 dark:border-white/10 text-neutral-500"}`}
                  >
                    PORCENTAJE (%)
                  </button>
                </div>

                <div className="pt-2">
                  <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50 block mb-2">
                    Valor a aplicar
                  </label>
                  <input
                    type="number"
                    value={bulkAction.value}
                    onChange={(e) =>
                      setBulkAction((prev) => ({
                        ...prev,
                        value: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0.00"
                    className="w-full bg-neutral-50 dark:bg-adminBlue border border-neutral-200 dark:border-white/10 p-4 text-xl font-light outline-none focus:border-navalBlue dark:focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  onClick={handleBulkEdit}
                  className="flex-1 bg-navalBlue text-white dark:bg-white dark:text-navalBlue py-4 text-[10px] font-futuristic tracking-widest hover:opacity-90 transition-opacity"
                >
                  CONFIRMAR CAMBIOS
                </button>
                <button
                  onClick={() => setIsBulkEditOpen(false)}
                  className="px-6 border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-navalBlue dark:hover:text-white transition-colors text-[10px] font-futuristic tracking-widest"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Notification */}
        {lowStockProducts.length > 0 && (
          <div
            onClick={() => {
              setShowLowStockOnly(!showLowStockOnly);
              setCurrentPage(1);
            }}
            className={`cursor-pointer mb-6 p-4 rounded-lg border transition-all flex items-center justify-between group ${
              showLowStockOnly
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-400 shadow-sm"
                : "bg-red-500/5 border-red-500/20 text-red-600/80 dark:bg-red-500/5 dark:border-red-500/20 dark:text-red-500/80 hover:bg-red-500/10 dark:hover:bg-red-500/15"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${showLowStockOnly ? "bg-red-500/20" : "bg-red-500/10"} flex items-center justify-center`}
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-wide">
                  Alerta de Stock
                </h3>
                <span className="text-xs font-light opacity-90 uppercase tracking-widest mt-0.5 block">
                  Hay{" "}
                  <strong className="font-bold">
                    {lowStockProducts.length}
                  </strong>{" "}
                  productos con existencias críticas (&lt; 5)
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-futuristic tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
              {showLowStockOnly ? "Cerrar Filtro" : "Ver Alertas"}
            </span>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-light dark:text-white text-navalBlue">
              Inventario
            </h2>
            <p className="text-xs font-futuristic tracking-[0.2em] text-neutral-500 uppercase mt-1">
              Gestión de Catálogo
            </p>
          </div>

          {selectedProducts.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-top-2 border border-blue-200 dark:border-blue-800">
              <span className="text-[10px] font-futuristic tracking-wide text-blue-600 dark:text-blue-400">
                {selectedProducts.length} SELECCIONADOS
              </span>
              <div className="h-4 w-px bg-blue-200 dark:bg-blue-700 mx-2" />
              <button
                onClick={() => setIsBulkEditOpen(true)}
                className="text-[10px] font-futuristic hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                MODIFICAR PRECIOS
              </button>
            </div>
          )}

          <div className="flex gap-4 w-full md:w-auto">
            {!isSelectionMode ? (
              <button
                onClick={() => setIsSelectionMode(true)}
                className="bg-neutral-100 dark:bg-neutral-800 text-navalBlue dark:text-white px-4 py-2 text-[10px] font-futuristic tracking-widest hover:opacity-80 transition-opacity"
              >
                BULK SELECT
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedProducts([]);
                }}
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 text-[10px] font-futuristic tracking-widest hover:bg-red-100 transition-colors"
              >
                CANCELAR BULK
              </button>
            )}
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-100 dark:bg-adminBlue border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm outline-none focus:border-neutral-500 w-full md:w-64"
            />
            <div className="flex bg-neutral-100 dark:bg-adminBlue rounded p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded transition-all ${viewMode === "table" ? "bg-white dark:bg-adminBlue shadow-sm" : "text-neutral-500 hover:text-navalBlue dark:hover:text-white"}`}
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded transition-all ${viewMode === "grid" ? "bg-white dark:bg-adminBlue shadow-sm" : "text-neutral-500 hover:text-navalBlue dark:hover:text-white"}`}
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={handleExportCSV}
              className="bg-neutral-800 text-white dark:bg-neutral-200 dark:text-navalBlue px-4 py-2 text-[10px] font-futuristic tracking-widest hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              EXPORTAR
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="bg-navalBlue dark:bg-white text-white dark:text-navalBlue px-6 py-2 text-[10px] font-futuristic tracking-widest hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              + NUEVO
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 dark:bg-adminBlue text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  {isSelectionMode && (
                    <th className="px-6 py-4 animate-in fade-in zoom-in duration-300">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-neutral-300"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(
                              paginatedProducts.map((p) => p.id),
                            );
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                        checked={
                          selectedProducts.length > 0 &&
                          selectedProducts.length >= paginatedProducts.length
                        }
                      />
                    </th>
                  )}
                  <th className="px-6 py-4">Imagen</th>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4 hidden md:table-cell">Categoría</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Tag</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 dark:text-gray-300 text-gray-800">
                {isLoading ? (
                  [...Array(3)].map((_, i) => <TableRowSkeleton key={i} />)
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center opacity-30 gap-4">
                        <svg
                          className="w-12 h-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        <div className="font-futuristic text-[10px] tracking-widest uppercase">
                          {searchTerm
                            ? "No se encontraron resultados"
                            : "Sin productos en inventario"}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className={`group hover:bg-neutral-50 dark:hover:bg-navalBlue/50 transition-colors ${selectedProducts.includes(product.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                    >
                      {isSelectionMode && (
                        <td className="px-6 py-4 animate-in fade-in zoom-in duration-300">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-neutral-300"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => {
                              setSelectedProducts((prev) =>
                                prev.includes(product.id)
                                  ? prev.filter((id) => id !== product.id)
                                  : [...prev, product.id],
                              );
                            }}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden">
                          <img
                            src={product.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm dark:text-white text-navalBlue flex items-center gap-2">
                          {product.name}
                          {product.visible === false && (
                            <span className="text-[8px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-futuristic">
                              Oculto
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 truncate max-w-[200px]">
                          {product.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-[9px] font-futuristic uppercase tracking-wider rounded">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-xs font-mono text-neutral-500">
                          {product.tag}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-mono ${
                            (product.stock || 0) < 5
                              ? "text-red-500 font-bold"
                              : "text-neutral-500"
                          }`}
                        >
                          {product.stock || 0}
                          {(product.stock || 0) < 5 && (
                            <span className="ml-1 text-[8px] uppercase tracking-tighter opacity-70">
                              (Bajo)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400"
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
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product.id)}
                            className="p-2 hover:bg-red-500/10 rounded text-red-500"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-adminBlue transition-all hover:shadow-lg"
              >
                <div className="aspect-square relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {product.visible === false && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-futuristic uppercase px-2 py-1 rounded shadow-sm z-10 pointer-events-none">
                      Oculto
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 bg-white/90 dark:bg-adminBlue/90 p-1 rounded backdrop-blur-sm transition-opacity">
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setIsModalOpen(true);
                      }}
                      className="p-1 hover:text-blue-500"
                    >
                      <svg
                        className="w-3 h-3"
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
                    <button
                      onClick={() => handleDeleteClick(product.id)}
                      className="p-1 hover:text-red-500"
                    >
                      <svg
                        className="w-3 h-3"
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
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm dark:text-white text-navalBlue line-clamp-1">
                      {product.name}
                    </h4>
                    <span className="text-[9px] font-futuristic uppercase bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                      {product.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                    <span
                      className={`text-[10px] font-mono ${
                        (product.stock || 0) > 0
                          ? "text-neutral-400"
                          : "text-red-500 font-bold"
                      }`}
                    >
                      Stock: {product.stock || 0}
                    </span>
                    {product.price && (
                      <span className="text-[10px] font-medium dark:text-white">
                        ${product.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 font-futuristic tracking-widest uppercase">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de{" "}
              {filteredProducts.length}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-[10px] font-futuristic tracking-widest uppercase border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors rounded"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-[10px] font-futuristic tracking-widest uppercase bg-navalBlue dark:bg-white text-white dark:text-navalBlue hover:opacity-80 disabled:opacity-30 disabled:hover:opacity-30 transition-opacity rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSave}
        />
      )}

      {productToDelete && (
        <ConfirmationModal
          title="ELIMINAR PRODUCTO"
          message="¿Está seguro que desea eliminar este producto? Esta acción es irreversible."
          onConfirm={handleConfirmDelete}
          onCancel={() => setProductToDelete(null)}
        />
      )}
    </>
  );
};

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => Promise<void>;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onClose,
  onSave,
}) => {
  const { config } = useConfig();
  const [formData, setFormData] = useState<Product>(
    product
      ? {
          ...product,
          gallery: product.gallery || [],
          specs: product.specs || [],
        }
      : {
          id: `NEW_${Date.now()}`,
          name: "",
          category: "pendant",
          description: "",
          longDescription: "",
          image: "",
          gallery: [],
          tag: "",
          specs: [],
          featured: false,
          stock: 0,
          visible: true,
        },
  );

  const [isDragging, setIsDragging] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleValidateAndSave = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "EL NOMBRE ES REQUERIDO";
    if (!formData.description.trim())
      newErrors.description = "DESCRIPCIÓN REQUERIDA";
    if (!formData.category) newErrors.category = "CATEGORÍA REQUERIDA";

    // Optional: Price validation if needed, but it's typed as number | undefined

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSave(formData);
    } else {
      toast.error("POR FAVOR REVISE EL FORMULARIO");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter((f) => f.type.startsWith("image/"));

    // Process serially to maintain order if desired, or parallel
    for (const file of validFiles) {
      try {
        const optimized = await optimizeImage(file);
        const url = await InventoryService.uploadImage(optimized);
        setFormData((prev) => {
          const newGallery = [...prev.gallery, url];
          return {
            ...prev,
            gallery: newGallery,
            // If image is empty or not in current gallery, set to first item of new gallery
            image:
              prev.image && prev.gallery.includes(prev.image)
                ? prev.image
                : newGallery[0],
          };
        });
      } catch (err) {
        console.error("Error uploading image:", err);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Handle File Drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
      return;
    }
  };

  const handleReorderDrop = (e: React.DragEvent, toIndex: number) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if we are reordering
    const fromIndexStr = e.dataTransfer.getData("text/plain");
    if (!fromIndexStr) return; // Might be a file drop

    const fromIndex = parseInt(fromIndexStr);
    if (isNaN(fromIndex)) return;

    if (fromIndex === toIndex) return;

    const newGallery = [...formData.gallery];
    const [movedItem] = newGallery.splice(fromIndex, 1);
    newGallery.splice(toIndex, 0, movedItem);

    setFormData((prev) => ({
      ...prev,
      gallery: newGallery,
      image: newGallery[0], // Always force first image as main
    }));
    setDraggedImageIndex(null);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navalBlue/90 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="bg-white dark:bg-[#111] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-300 relative z-10">
        {/* Helper for dark mode text */}
        <div className="flex-1 p-8 space-y-6 dark:text-gray-200 text-gray-800">
          {config.use_mock_data && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 p-2 text-yellow-500 text-[10px] font-futuristic tracking-widest text-center">
              MODO MOCK DATA: Los cambios no se guardarán en la base de datos
              real.
            </div>
          )}
          <div className="flex justify-between items-start">
            <h3 className="font-futuristic text-xl tracking-widest uppercase dark:text-white text-navalBlue">
              {product ? "EDITAR_PRODUCTO" : "NUEVO_PRODUCTO"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
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
          </div>

          <div className="grid grid-cols-12 gap-4 md:gap-6 text-sm">
            <div className="col-span-12 md:col-span-8 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Nombre
              </label>
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={`w-full bg-neutral-100 dark:bg-adminBlue border ${errors.name ? "border-red-500" : "border-neutral-200 dark:border-white/10"} p-3 rounded focus:border-navalBlue dark:focus:border-white outline-none transition-colors`}
              />
              {errors.name && (
                <span className="text-[9px] text-red-500 font-futuristic tracking-widest">
                  {errors.name}
                </span>
              )}
            </div>
            <div className="col-span-12 md:col-span-4 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as Product["category"],
                  })
                }
                className="w-full bg-neutral-100 dark:bg-adminBlue border border-neutral-200 dark:border-white/10 p-3 rounded focus:border-navalBlue dark:focus:border-white outline-none appearance-none"
              >
                <option value="pendant">Pendant (Suspensión)</option>
                <option value="floor">Floor (Pie)</option>
                <option value="table">Table (Mesa)</option>
                <option value="tech">Tech (Smart)</option>
              </select>
            </div>

            <div className="col-span-6 md:col-span-3 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Precio (Regular)
              </label>
              <input
                type="number"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="0.00"
                className="w-full bg-neutral-100 dark:bg-adminBlue border border-neutral-200 dark:border-white/10 p-3 rounded focus:border-navalBlue dark:focus:border-white outline-none transition-colors"
              />
            </div>
            <div className="col-span-6 md:col-span-3 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50 text-blue-400">
                Precio (Oferta)
              </label>
              <input
                type="number"
                value={formData.sale_price || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sale_price: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="Opcional"
                className="w-full bg-neutral-100 dark:bg-adminBlue border border-neutral-200 dark:border-white/10 p-3 rounded focus:border-navalBlue dark:focus:border-white outline-none transition-colors border-blue-500/20"
              />
            </div>
            <div className="col-span-6 md:col-span-3 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Stock (Disponible)
              </label>
              <input
                type="number"
                value={formData.stock || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stock: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full bg-neutral-100 dark:bg-adminBlue border border-neutral-200 dark:border-white/10 p-3 rounded focus:border-navalBlue dark:focus:border-white outline-none transition-colors"
              />
            </div>

            <div className="col-span-6 md:col-span-3 flex flex-col justify-end pb-3 gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured || false}
                  onChange={(e) =>
                    setFormData({ ...formData, featured: e.target.checked })
                  }
                  className="w-4 h-4 bg-transparent border border-neutral-500 rounded focus:ring-0 checked:bg-white accent-black dark:accent-white"
                />
                <label
                  htmlFor="featured"
                  className="text-[10px] font-futuristic tracking-widest uppercase cursor-pointer select-none"
                >
                  Destacar
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="visible"
                  checked={formData.visible !== false}
                  onChange={(e) =>
                    setFormData({ ...formData, visible: e.target.checked })
                  }
                  className="w-4 h-4 bg-transparent border border-neutral-500 rounded focus:ring-0 checked:bg-white accent-black dark:accent-white"
                />
                <label
                  htmlFor="visible"
                  className="text-[10px] font-futuristic tracking-widest uppercase cursor-pointer select-none"
                >
                  Visible
                </label>
              </div>
            </div>

            <div className="col-span-12 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Descripción Corta
              </label>
              <input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className={`w-full bg-neutral-100 dark:bg-adminBlue border ${errors.description ? "border-red-500" : "border-neutral-200 dark:border-white/10"} p-3 rounded focus:border-navalBlue dark:focus:border-white outline-none transition-colors`}
              />
              {errors.description && (
                <span className="text-[9px] text-red-500 font-futuristic tracking-widest">
                  {errors.description}
                </span>
              )}
            </div>
            <div className="col-span-12 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Descripción Larga
              </label>
              <textarea
                value={formData.longDescription}
                onChange={(e) =>
                  setFormData({ ...formData, longDescription: e.target.value })
                }
                rows={4}
                className="w-full bg-neutral-100 dark:bg-adminBlue border border-neutral-200 dark:border-white/10 p-3 rounded focus:border-navalBlue dark:focus:border-white outline-none transition-colors resize-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/10">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Galería & Media
              </label>
              <label className="cursor-pointer text-xs font-medium hover:underline flex items-center gap-2">
                <span>+ AGREGAR IMÁGENES</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            <div
              className={`grid grid-cols-4 gap-4 p-4 min-h-[120px] rounded-lg border-2 border-dashed transition-colors ${isDragging ? "border-blue-500 bg-blue-50/10" : "border-neutral-200 dark:border-white/10"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {formData.gallery.length === 0 && (
                <div className="col-span-4 flex flex-col items-center justify-center text-neutral-400 gap-2 pointer-events-none">
                  <svg
                    className="w-8 h-8 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs">Arrastra imágenes aquí</span>
                </div>
              )}
              {formData.gallery.map((img, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", idx.toString());
                    setDraggedImageIndex(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => handleReorderDrop(e, idx)}
                  className={`relative aspect-square rounded transition-all duration-300 overflow-hidden group border cursor-move ${
                    idx === 0
                      ? "border-2 border-navalBlue dark:border-white shadow-lg ring-2 ring-offset-2 ring-transparent"
                      : "border-neutral-200 dark:border-white/10"
                  } ${draggedImageIndex === idx ? "opacity-30 scale-95" : "opacity-100 hover:scale-[1.02]"}`}
                >
                  {idx === 0 && (
                    <span className="absolute top-0 left-0 bg-navalBlue dark:bg-white text-white dark:text-navalBlue text-[9px] font-futuristic tracking-widest px-2 py-1 z-10">
                      MAIN
                    </span>
                  )}
                  <img src={img} className="w-full h-full object-cover" />
                  <button
                    onClick={() =>
                      setFormData((prev) => {
                        const newGallery = prev.gallery.filter(
                          (_, i) => i !== idx,
                        );
                        return {
                          ...prev,
                          gallery: newGallery,
                          image: newGallery.length > 0 ? newGallery[0] : "",
                        };
                      })
                    }
                    className="absolute top-1 right-1 bg-navalBlue/50 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                  >
                    <svg
                      className="w-3 h-3"
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
                </div>
              ))}
            </div>
            <p className="text-[10px] text-neutral-400">
              * La primera imagen será usada como portada principal.
            </p>
          </div>
        </div>

        {/* Actions Footer / Sidebar on desktop */}
        <div className="p-8 bg-neutral-50 dark:bg-adminBlue border-t md:border-t-0 md:border-l border-neutral-200 dark:border-white/10 flex flex-col gap-4 min-w-[250px]">
          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50">
                Código Stock
              </label>
              <input
                value={formData.tag}
                onChange={(e) =>
                  setFormData({ ...formData, tag: e.target.value })
                }
                className="w-full bg-white dark:bg-adminBlue border border-neutral-200 dark:border-white/10 p-3 rounded"
              />
            </div>

            {/* Tech Specs Builder */}
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest uppercase opacity-50 flex justify-between">
                <span>Specs Técnicas</span>
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      specs: [...prev.specs, { label: "New", value: "" }],
                    }))
                  }
                  className="hover:text-blue-500"
                >
                  + ADD
                </button>
              </label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {formData.specs?.map((spec, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={spec.label}
                      onChange={(e) => {
                        const newSpecs = [...formData.specs];
                        newSpecs[i].label = e.target.value;
                        setFormData({ ...formData, specs: newSpecs });
                      }}
                      className="w-1/3 text-xs bg-transparent border-b border-neutral-300 dark:border-neutral-700 outline-none"
                      placeholder="Label"
                    />
                    <input
                      value={spec.value}
                      onChange={(e) => {
                        const newSpecs = [...formData.specs];
                        newSpecs[i].value = e.target.value;
                        setFormData({ ...formData, specs: newSpecs });
                      }}
                      className="w-2/3 text-xs bg-transparent border-b border-neutral-300 dark:border-neutral-700 outline-none"
                      placeholder="Value"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-[10px] font-futuristic tracking-widest border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-white transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleValidateAndSave}
              className="flex-1 py-3 text-[10px] font-futuristic tracking-widest bg-navalBlue dark:bg-white text-white dark:text-navalBlue hover:opacity-80 transition-opacity"
            >
              GUARDAR CAMBIOS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-navalBlue/90 backdrop-blur-md"
        onClick={onCancel}
      />
      <div className="bg-white dark:bg-navyDark w-full max-w-md p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative z-10">
        <h3 className="font-futuristic text-lg tracking-[0.2em] mb-4 uppercase text-red-600 dark:text-red-500">
          {title}
        </h3>
        <p className="text-sm font-light text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-[10px] font-futuristic tracking-widest text-neutral-500 hover:text-navalBlue dark:hover:text-white transition-colors"
          >
            CANCELAR
          </button>
          <button
            onClick={onConfirm}
            className="px-8 py-3 text-[10px] font-futuristic tracking-widest bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            ELIMINAR
          </button>
        </div>
      </div>
    </div>
  );
};
