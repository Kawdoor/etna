export interface Product {
  id: string;
  name: string;
  category: "pendant" | "floor" | "table" | "tech";
  description: string;
  longDescription: string;
  price?: number;
  sale_price?: number;
  stock?: number;
  featured?: boolean;
  visible?: boolean;
  image: string;
  gallery: string[];
  tag: string;
  specs: { label: string; value: string }[];
  created_at?: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface Consultation {
  id: string;
  customerName: string;
  productName: string;
  query: string;
  created_at?: string;
  status: "pending" | "responded";
}

export interface SaleItem {
  id?: string; // Optional (e.g. for new items before DB insert)
  product_id?: string;
  product_name: string;
  product_image: string;
  price: number;
  quantity: number;
  note?: string;
}

export interface Order {
  id: string;
  created_at: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city?: string;
  zipCode?: string;
  status: "pending" | "processed" | "shipped" | "delivered" | "cancelled";
  items?: SaleItem[];
}

export interface AppConfig {
  id?: number;
  site_name: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  opening_hours: string;
  theme?: "dark" | "light";
  theme_colors?: Record<string, { bg?: string; text?: string }>;
  ai_active: boolean;
  use_mock_data: boolean;
  hero_headline?: string;
  hero_subheadline?: string;
  hero_text?: string;
  hero_image_url?: string;
  about_headline?: string;
  about_description?: string;
  about_image_url?: string;
  about_history?: {
    year: string;
    title: string;
    description: string;
    image: string;
  }[];
  catalog_headline?: string;
  catalog_description?: string;
  catalog_headline_full?: string;
  catalog_description_full?: string;
  collection_hero_headline?: string;
  collection_hero_subheadline?: string;
  collection_hero_image_url?: string;
  contact_headline?: string;
  contact_subheadline?: string;
  contact_address?: string;
  contact_map_url?: string;
  vision_text?: string;
  vision_image_url?: string;
  ai_simulation_subtitle?: string;
  ai_simulation_title?: string;
  ai_simulation_quote?: string;
  ai_simulation_body?: string;
  ai_simulation_badge?: string;
}

export enum NavigationSection {
  Hero = "hero",
  Showcase = "showcase",
  AI = "ai",
  Contact = "contact",
}
