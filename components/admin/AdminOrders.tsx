import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  InventoryService,
  OrderService,
  supabase,
} from "../../services/supabase";
import { Order, Product, SaleItem } from "../../types";
import { TableRowSkeleton } from "../ui/AdminSkeletons";

interface AdminOrdersProps {
  onUpdate?: () => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ onUpdate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    InventoryService.getProducts().then(setProducts).catch(console.error);

    const channel = supabase
      .channel("orders_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await OrderService.getOrders();
      setOrders(data as Order[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = orders;

    if (showPendingOnly) {
      result = result.filter((o) => o.status === "pending");
    }

    return result.filter(
      (o) =>
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.firstName + " " + o.lastName)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );
  }, [orders, searchTerm, showPendingOnly]);

  const pendingCount = useMemo(() => {
    return orders.filter((o) => o.status === "pending").length;
  }, [orders]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const confirmDelete = (id: string) => {
    setOrderToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    try {
      await OrderService.deleteOrder(orderToDelete);
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
      toast.success("ORDEN ELIMINADA");
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
      toast.error("ERROR AL ELIMINAR");
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleSave = async (order: Partial<Order>) => {
    try {
      if (order.id && !order.id.startsWith("NEW_")) {
        await OrderService.updateStatus(order.id, order.status || "pending");
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? ({ ...o, ...order } as Order) : o,
          ),
        );
      } else {
        const { id, items, ...rest } = order;

        // Extract fields that might not exist in the DB schema
        // "city" and "zipCode" are in the form state but might trigger "column not found"
        const { city, zipCode, ...data } = rest as any;

        // Append city/zip to address if they exist, to preserve the data
        if (city || zipCode) {
          data.address = `${data.address || ""}${city ? `, ${city}` : ""}${zipCode ? ` ${zipCode}` : ""}`;
        }

        // Map items to the structure expected by Supabase service
        const serviceItems =
          items?.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })) || [];

        await OrderService.addOrder(data, serviceItems);
        loadData(); // Reload to get full structure with IDs
      }
      setIsFormOpen(false);
      setEditingOrder(null);
      toast.success("ORDEN GUARDADA");
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
      toast.error("ERROR AL GUARDAR");
    }
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        {pendingCount > 0 && (
          <div
            onClick={() => {
              setShowPendingOnly(!showPendingOnly);
              setCurrentPage(1);
            }}
            className={`cursor-pointer mb-6 p-4 rounded-lg border transition-all flex items-center justify-between group ${
              showPendingOnly
                ? "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100"
                : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            }`}
          >
            <span className="text-xs font-futuristic tracking-widest uppercase">
              Ordenes Pendientes:{" "}
              <span className="text-red-500 font-bold">{pendingCount}</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
              {showPendingOnly ? "Mostrar todas" : "Filtrar pendientes"}
            </span>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-light dark:text-white text-black">
              ÓRDENES
            </h2>
            <p className="text-xs font-futuristic tracking-[0.2em] text-neutral-500 uppercase mt-1">
              Gestión de Pedidos
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar orden, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm outline-none focus:border-neutral-500 w-full md:w-64 transition-colors"
            />
            <button
              onClick={() => {
                setEditingOrder(null);
                setIsFormOpen(true);
              }}
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-[10px] font-futuristic tracking-widest hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              + NUEVA ORDEN
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 dark:text-gray-300 text-gray-800">
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRowSkeleton key={i} />)
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center opacity-30">
                    <p className="font-futuristic text-[10px] tracking-widest uppercase">
                      Sin Órdenes
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const total =
                    order.items?.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0,
                    ) || 0;
                  return (
                    <tr
                      key={order.id}
                      className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-xs opacity-50">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">
                          {order.firstName} {order.lastName}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {order.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-light">
                        ${total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-[9px] font-futuristic uppercase tracking-wider rounded select-none border ${
                            order.status === "delivered"
                              ? "border-green-500/30 bg-green-500/10 text-green-600"
                              : order.status === "cancelled"
                                ? "border-red-500/30 bg-red-500/10 text-red-600"
                                : order.status === "shipped"
                                  ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                                  : "border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-500">
                        {order.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => handleEdit(order)}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
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
                            onClick={() => confirmDelete(order.id)}
                            className="p-2 hover:bg-red-500/10 rounded text-red-500 transition-colors"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 font-futuristic tracking-widest uppercase">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredOrders.length)} de{" "}
              {filteredOrders.length}
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
                className="px-4 py-2 text-[10px] font-futuristic tracking-widest uppercase bg-black dark:bg-white text-white dark:text-black hover:opacity-80 disabled:opacity-30 disabled:hover:opacity-30 transition-opacity rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <OrderForm
          order={editingOrder}
          availableProducts={products}
          onClose={() => {
            setIsFormOpen(false);
            setEditingOrder(null);
          }}
          onSave={handleSave}
        />
      )}

      {isDeleteModalOpen && (
        <ConfirmationModal
          title="ELIMINAR ORDEN"
          message="¿Está seguro que desea eliminar esta orden permanentemente? Esta acción es irreversible."
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setOrderToDelete(null);
          }}
        />
      )}
    </>
  );
};

interface OrderFormProps {
  order: Order | null;
  availableProducts: Product[];
  onClose: () => void;
  onSave: (order: Partial<Order>) => Promise<void>;
}

const OrderForm: React.FC<OrderFormProps> = ({
  order,
  availableProducts,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Order>>(
    order
      ? {
          ...order,
          // Ensure controlled inputs don't start as undefined
          city: (order as any).city || "",
          zipCode: (order as any).zipCode || "",
          firstName: order.firstName || "",
          lastName: order.lastName || "",
          email: order.email || "",
          address: order.address || "",
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          address: "",
          city: "",
          zipCode: "",
          status: "pending",
          items: [],
        },
  );

  const [productSearch, setProductSearch] = useState("");
  const [isProductListOpen, setIsProductListOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(productSearch.toLowerCase()),
    );
  }, [availableProducts, productSearch]);

  const addItem = (product: Product) => {
    setFormData((prev) => {
      const currentItems = prev.items || [];
      // Create a snapshot item
      const newItem: SaleItem = {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        quantity: 1,
        price: product.price || (product.category === "tech" ? 999 : 399),
        note: "",
      };

      return {
        ...prev,
        items: [...currentItems, newItem],
      };
    });
    setProductSearch("");
    setIsProductListOpen(false);
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      const newItems = [...(prev.items || [])];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const updateItemQuantity = (index: number, qty: number) => {
    setFormData((prev) => {
      const newItems = [...(prev.items || [])];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], quantity: Math.max(1, qty) };
      }
      return { ...prev, items: newItems };
    });
  };

  const updateItemNote = (index: number, note: string) => {
    setFormData((prev) => {
      const newItems = [...(prev.items || [])];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], note };
      }
      return { ...prev, items: newItems };
    });
  };

  const total =
    formData.items?.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    ) || 0;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="bg-white dark:bg-[#0A0A0A] w-full max-w-4xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-8">
        {/* Left Col: Order Details */}
        <div className="flex-1 space-y-6">
          <h3 className="font-futuristic text-lg tracking-[0.2em] mb-8 uppercase dark:text-white text-black border-b border-neutral-100 dark:border-neutral-900 pb-4">
            {order ? "EDITAR ORDEN" : "NUEVA ORDEN"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Nombre
              </label>
              <input
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-black dark:focus:border-white outline-none"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Apellido
              </label>
              <input
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-black dark:focus:border-white outline-none"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Email
              </label>
              <input
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-black dark:focus:border-white outline-none"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Dirección
              </label>
              <input
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-black dark:focus:border-white outline-none"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Ciudad
              </label>
              <input
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-black dark:focus:border-white outline-none"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Estado
              </label>
              <select
                className="w-full bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-black dark:focus:border-white outline-none appearance-none"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as Order["status"],
                  })
                }
              >
                <option value="pending">PENDING</option>
                <option value="processed">PROCESSED</option>
                <option value="shipped">SHIPPED</option>
                <option value="delivered">DELIVERED</option>
                <option value="cancelled">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Col: Items & Product Selector */}
        <div className="flex-1 space-y-6 flex flex-col">
          <h3 className="font-futuristic text-lg tracking-[0.2em] mb-4 uppercase dark:text-white text-black border-b border-neutral-100 dark:border-neutral-900 pb-4">
            ITEMS DEL PEDIDO
          </h3>

          {/* Product Autocomplete */}
          <div className="relative">
            <input
              placeholder="Buscar producto..."
              className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 text-sm outline-none focus:border-black dark:focus:border-white"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setIsProductListOpen(true);
              }}
              onFocus={() => setIsProductListOpen(true)}
            />
            {isProductListOpen && productSearch && (
              <div className="absolute top-full left-0 right-0 max-h-[300px] overflow-y-auto bg-white dark:bg-neutral-900 border border-t-0 border-neutral-200 dark:border-neutral-800 shadow-xl z-20">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => addItem(product)}
                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                  >
                    <img
                      src={product.image}
                      className="w-8 h-8 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{product.name}</div>
                      <div className="text-[10px] text-neutral-500">
                        {product.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items List */}
          <div className="flex-1 overflow-y-auto border border-neutral-100 dark:border-neutral-800 rounded p-2 space-y-2 min-h-[200px]">
            {formData.items?.map((item, idx) => (
              <div
                key={`${item.product_id || "new"}-${idx}`}
                className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded flex gap-3 items-start group relative"
              >
                <img
                  src={item.product_image}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">
                      {item.product_name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      ${item.price}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] uppercase tracking-wider text-neutral-400">
                      Qty:
                    </label>
                    <input
                      type="number"
                      className="w-12 p-1 text-xs bg-transparent border-b border-neutral-200 dark:border-neutral-700 text-center focus:border-black dark:focus:border-white outline-none transition-colors"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItemQuantity(idx, parseInt(e.target.value))
                      }
                      min="1"
                    />
                    <label className="text-[9px] uppercase tracking-wider text-neutral-400 ml-2">
                      Nota:
                    </label>
                    <input
                      type="text"
                      className="flex-1 p-1 text-xs bg-transparent border-b border-neutral-200 dark:border-neutral-700 focus:border-black dark:focus:border-white outline-none transition-colors placeholder-neutral-400"
                      placeholder="Opcional..."
                      value={item.note || ""}
                      onChange={(e) => updateItemNote(idx, e.target.value)}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                  title="Eliminar"
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
              </div>
            ))}
          </div>

          <div className="flex justify-between items-end pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <div className="text-right w-full">
              <span className="text-[10px] font-futuristic tracking-widest uppercase mr-4">
                Total Estimado
              </span>
              <span className="text-2xl font-light">
                ${total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-[10px] font-futuristic tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors border border-transparent hover:border-neutral-200 rounded"
            >
              CANCELAR
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-8 py-3 text-[10px] font-futuristic tracking-widest bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity rounded"
            >
              GUARDAR ORDEN
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
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onCancel}
      />
      <div className="bg-white dark:bg-[#0A0A0A] w-full max-w-md p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative z-10">
        <h3 className="font-futuristic text-lg tracking-[0.2em] mb-4 uppercase text-red-600 dark:text-red-500">
          {title}
        </h3>
        <p className="text-sm font-light text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-[10px] font-futuristic tracking-widest text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
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
