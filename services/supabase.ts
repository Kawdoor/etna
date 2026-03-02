import { createClient } from "@supabase/supabase-js";
import { AppConfig, Product } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

export const isSupabaseConfigured = () => {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    supabaseUrl !== "undefined" &&
    supabaseAnonKey !== "undefined"
  );
};

if (!isSupabaseConfigured()) {
  console.warn(
    "Missing Supabase environment variables. Backend features will be disabled.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);

// Helper for proxy calls removed as we are using direct calls with upsert

export const InventoryService = {
  async getProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Product[];
  },

  async addProduct(product: Omit<Product, "id">) {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    // First get the current product to merge with updates
    const { data: currentProduct, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Merge updates with current data
    const updatedProduct = { ...currentProduct, ...updates };

    // Use upsert instead of update to avoid CORS PATCH issues
    const { data, error } = await supabase
      .from("products")
      .upsert(updatedProduct, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw error;
  },

  async uploadImage(file: File) {
    const fileName = `${Math.random().toString(36).substring(2)}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("products")
      .upload(fileName, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(fileName);

    return publicUrl;
  },

  async deleteImage(url: string) {
    const path = url.split("/products/").pop();
    if (!path) return;

    const { error } = await supabase.storage.from("products").remove([path]);

    if (error) console.error("Error deleting image:", error);
  },
};

export const ConsultationService = {
  async getConsultations() {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as any[];
  },

  async addConsultation(consultation: any) {
    const { data, error } = await supabase
      .from("consultations")
      .insert([consultation])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string) {
    // Fetch, merge, upsert pattern
    const { data: current, error: fetchError } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const updated = { ...current, status };

    const { data, error } = await supabase
      .from("consultations")
      .upsert(updated, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteConsultation(id: string) {
    const { error } = await supabase
      .from("consultations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};

export const OrderService = {
  async getOrders() {
    // We also select sale_items and related product data if needed.
    // Supabase JS allows nested select if valid relations exist.
    // For now we just get orders. Fetching items might require a separate query or join.
    // Assuming simple structure for now.
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, sale_items(quantity, price, product_id, products(name, image, category))",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform to match frontend types if needed
    return data.map((order: any) => ({
      ...order,
      items: order.sale_items?.map((item: any) => ({
        // Map backend structure to SaleItem
        product_id: item.product_id,
        product_name: item.products?.name || "Producto desconocido",
        product_image: item.products?.image || "",
        quantity: item.quantity,
        price: item.price,
      })),
    }));
  },

  async addOrder(order: any, items: any[]) {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert([order])
      .select()
      .single();

    if (orderError) throw orderError;
    if (!orderData) throw new Error("Order creation failed");

    // 2. Create Sale Items
    const saleItems = items.map((item) => {
      // Validate if product_id is a UUID. If not, send null.
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.product_id,
        );

      return {
        order_id: orderData.id,
        product_id: isUuid ? item.product_id : null,
        quantity: item.quantity,
        price: item.price,
      };
    });

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);

    if (itemsError) throw itemsError;

    return orderData;
  },

  async updateStatus(id: string, status: string) {
    // Fetch, merge, upsert pattern
    const { data: current, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    const updated = { ...current, status };

    const { data, error } = await supabase
      .from("orders")
      .upsert(updated, { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async deleteOrder(id: string) {
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) throw error;
  },
};

export const ConfigService = {
  async getConfig() {
    // Try to get the first row
    const { data, error } = await supabase
      .from("config")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      // If table doesn't exist or empty, return default
      console.warn("Error fetching config, returning default:", error);
      return null;
    }
    return data as AppConfig;
  },

  async updateConfig(updates: Partial<AppConfig>) {
    // Check if we have a config row first
    const existing = await this.getConfig();

    if (existing && existing.id) {
      // Merge updates with current data
      const updatedConfig = { ...existing, ...updates };

      const { data, error } = await supabase
        .from("config")
        .upsert(updatedConfig, { onConflict: "id" })
        .select()
        .single();

      if (error) throw error;
      return data as AppConfig;
    } else {
      const { data, error } = await supabase
        .from("config")
        .insert([updates]) // id will be auto generated
        .select()
        .single();

      if (error) throw error;
      return data as AppConfig;
    }
  },
};
