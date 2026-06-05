export type OrderStatus = 'pending' | 'confirmed' | 'delivering' | 'done' | 'paid' | 'cancelled';
export type PaymentMethod = 'cod' | 'bank';
export type ProductTag = 'none' | 'new' | 'best_seller' | 'rare' | 'premium';
export type NotificationType = 'general' | 'new_product' | 'price_change';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  username: string | null;
  email: string | null;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price_at_time: number;
  product_id: string;
  products: { name: string; unit: string; price: number | null } | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  note: string | null;
  created_at: string;
  profiles: Profile | null;
  order_items: OrderItem[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  unit: string;
  image_url: string | null;
  in_stock: boolean;
  category: string;
  tag: ProductTag;
  note: string | null;
  total_sold?: number;
  created_at: string;
}

export interface Feedback {
  id: string;
  title: string | null;
  content: string;
  rating: number | null;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  created_at: string;
}
