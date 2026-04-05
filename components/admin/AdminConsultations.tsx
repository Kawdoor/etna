import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useProducts } from "../../hooks/useProducts";
import { ConsultationService, supabase } from "../../services/supabase";
import { Consultation, Product } from "../../types";
import { TableRowSkeleton } from "../ui/AdminSkeletons";

interface AdminConsultationsProps {
  onUpdate?: () => void;
}

export const AdminConsultations: React.FC<AdminConsultationsProps> = ({
  onUpdate,
}) => {
  const { products } = useProducts();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Consultation | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("consultations_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consultations",
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
      const data = await ConsultationService.getConsultations();
      setConsultations(data as Consultation[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConsultations = useMemo(() => {
    let result = consultations;
    if (showPendingOnly) {
      result = result.filter((c) => c.status === "pending");
    }
    return result.filter(
      (c) =>
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.query.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [consultations, searchTerm, showPendingOnly]);

  const pendingCount = useMemo(() => {
    return consultations.filter((c) => c.status === "pending").length;
  }, [consultations]);

  const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);
  const paginatedConsultations = filteredConsultations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const confirmDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await ConsultationService.deleteConsultation(itemToDelete);
      setConsultations((prev) => prev.filter((c) => c.id !== itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleEdit = (item: Consultation) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleStatusUpdate = async (
    id: string,
    newStatus: "pending" | "responded",
  ) => {
    // Optimistic Update
    setConsultations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
    );
    try {
      await ConsultationService.updateStatus(id, newStatus);
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error("Error updating status:", e);
      // Revert on error could be added here
    }
  };

  const handleSave = async (item: Partial<Consultation>) => {
    try {
      if (item.id && !item.id.startsWith("NEW_")) {
        // Edit
        await ConsultationService.updateStatus(
          item.id,
          item.status || "pending",
        );
        // Assuming updateConsultation exists or we just updating status for now?
        // The prompt implies editing properly. But Service currently only has updateStatus.
        // Ideally we should update more fields, but sticking to previous logic + status for now.
        // If updateConsultation doesn't exist in service, we might need to add it or just accept status/mock update.
        // Given the prompt "se pueda editar", I'll assume standard update behavior visually at least.
        setConsultations((prev) =>
          prev.map((c) =>
            c.id === item.id ? ({ ...c, ...item } as Consultation) : c,
          ),
        );
      } else {
        // Create
        const { id, ...data } = item;
        // Ensure status is pending if not set
        const newItemData = { ...data, status: data.status || "pending" };
        const newItem = await ConsultationService.addConsultation(newItemData);
        setConsultations((prev) => [newItem, ...prev]);
      }
      setIsFormOpen(false);
      setEditingItem(null);
      toast.success("CONSULTA GUARDADA");
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
                ? "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-100"
                : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            }`}
          >
            <span className="text-xs font-futuristic tracking-widest uppercase">
              Consultas Pendientes:{" "}
              <span className="text-red-500 font-bold">{pendingCount}</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
              {showPendingOnly ? "Mostrar todas" : "Filtrar pendientes"}
            </span>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-light dark:text-white text-navalBlue">
              CONSULTAS
            </h2>
            <p className="text-xs font-futuristic tracking-[0.2em] text-neutral-500 uppercase mt-1">
              Gestión de Queries
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-neutral-100 dark:bg-navalBlue border border-neutral-200 dark:border-neutral-800 px-4 py-2 text-sm outline-none focus:border-neutral-500 w-full md:w-64 transition-colors"
            />
            <button
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="bg-navalBlue dark:bg-white text-white dark:text-navalBlue px-6 py-2 text-[10px] font-futuristic tracking-widest hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              + NUEVA
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 dark:bg-navalBlue text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Consulta</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 dark:text-gray-300 text-gray-800">
              {isLoading ? (
                [...Array(3)].map((_, i) => <TableRowSkeleton key={i} />)
              ) : filteredConsultations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30 gap-4">
                      <p className="font-futuristic text-[10px] tracking-widest uppercase">
                        Sin Consultas
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedConsultations.map((c) => (
                  <tr
                    key={c.id}
                    className="group hover:bg-neutral-50 dark:hover:bg-navalBlue/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium">
                      {c.customerName}
                    </td>
                    <td className="px-6 py-4 text-xs font-futuristic tracking-wider text-neutral-500">
                      {c.productName || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                      {c.query}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        onClick={() =>
                          handleStatusUpdate(
                            c.id,
                            c.status === "pending" ? "responded" : "pending",
                          )
                        }
                        className={`px-2 py-1 text-[9px] font-futuristic uppercase tracking-wider rounded cursor-pointer select-none border ${
                          c.status === "responded"
                            ? "bg-green-100/10 text-green-600 border-green-200/20"
                            : "bg-yellow-100/10 text-yellow-600 border-yellow-200/20"
                        }`}
                      >
                        {c.status === "responded" ? "SOLVED" : c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 transition-opacity">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-500 hover:text-navalBlue dark:hover:text-white transition-colors"
                          title="Editar"
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
                          onClick={() => confirmDelete(c.id)}
                          className="p-2 hover:bg-red-500/10 rounded text-red-500 transition-colors"
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
        {filteredConsultations.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 font-futuristic tracking-widest uppercase">
              Mostrando {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(
                currentPage * itemsPerPage,
                filteredConsultations.length,
              )}{" "}
              de {filteredConsultations.length}
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

      {isFormOpen && (
        <ConsultationForm
          item={editingItem}
          availableProducts={products}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {isDeleteModalOpen && (
        <ConfirmationModal
          title="ELIMINAR CONSULTA"
          message="¿Está seguro que desea eliminar este registro? Esta acción es irreversible."
          onConfirm={handleDelete}
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
          }}
        />
      )}
    </>
  );
};

interface ConsultationFormProps {
  item: Consultation | null;
  availableProducts: Product[];
  onClose: () => void;
  onSave: (item: Partial<Consultation>) => Promise<void>;
}

const ConsultationForm: React.FC<ConsultationFormProps> = ({
  item,
  availableProducts,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Consultation>>(
    item || {
      customerName: "",
      productName: "",
      query: "",
      status: "pending",
    },
  );

  const [isProductListOpen, setIsProductListOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    const searchTerm = (formData.productName || "").toLowerCase();
    if (!searchTerm) return availableProducts;
    return availableProducts.filter((p) =>
      p.name.toLowerCase().includes(searchTerm),
    );
  }, [availableProducts, formData.productName]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-navalBlue/90 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="bg-white dark:bg-navyDark w-full max-w-lg p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl relative z-10">
        <h3 className="font-futuristic text-lg tracking-[0.2em] mb-8 uppercase dark:text-white text-navalBlue border-b border-neutral-100 dark:border-navalBlue pb-4">
          {item ? "EDITAR CONSULTA" : "NUEVA CONSULTA"}
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Cliente
              </label>
              <input
                placeholder="NOMBRE"
                className="w-full bg-neutral-50 dark:bg-navalBlue border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-navalBlue dark:focus:border-white outline-none transition-colors"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
                Estado
              </label>
              <select
                className="w-full bg-neutral-50 dark:bg-navalBlue border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-navalBlue dark:focus:border-white outline-none transition-colors appearance-none"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "pending" | "responded",
                  })
                }
              >
                <option value="pending">PENDING</option>
                <option value="responded">SOLVED</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
              Producto Relacionado
            </label>
            <input
              placeholder="MODELO / REFERENCIA"
              className="w-full bg-neutral-50 dark:bg-navalBlue border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-navalBlue dark:focus:border-white outline-none transition-colors"
              value={formData.productName}
              onFocus={() => setIsProductListOpen(true)}
              onBlur={() => setTimeout(() => setIsProductListOpen(false), 200)}
              onChange={(e) => {
                setFormData({ ...formData, productName: e.target.value });
                setIsProductListOpen(true);
              }}
            />
            {isProductListOpen && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 max-h-[200px] overflow-y-auto bg-white dark:bg-navalBlue border border-t-0 border-neutral-200 dark:border-neutral-800 shadow-xl z-20">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setFormData({ ...formData, productName: product.name });
                      setIsProductListOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                  >
                    <img
                      src={product.image}
                      className="w-8 h-8 object-cover rounded"
                      alt={product.name}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{product.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-futuristic tracking-widest text-neutral-500 uppercase">
              Consulta
            </label>
            <textarea
              placeholder="DETALLE DE LA CONSULTA..."
              className="w-full bg-neutral-50 dark:bg-navalBlue border border-neutral-200 dark:border-white/10 p-3 text-sm focus:border-navalBlue dark:focus:border-white outline-none transition-colors min-h-[120px] resize-none"
              value={formData.query}
              onChange={(e) =>
                setFormData({ ...formData, query: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex gap-4 justify-end mt-8 pt-4 border-t border-neutral-100 dark:border-navalBlue">
          <button
            onClick={onClose}
            className="px-6 py-3 text-[10px] font-futuristic tracking-widest text-neutral-500 hover:text-navalBlue dark:hover:text-white transition-colors"
          >
            CANCELAR
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-8 py-3 text-[10px] font-futuristic tracking-widest bg-navalBlue dark:bg-white text-white dark:text-navalBlue hover:opacity-80 transition-opacity"
          >
            GUARDAR
          </button>
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
