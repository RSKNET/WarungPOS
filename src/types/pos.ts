export interface Product {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  skus: string[];
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  wholesaleMinQty: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  priceType: "retail" | "wholesale";
  subtotal: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  payment: number;
  change: number;
  createdAt: string;
  customerName?: string;
  paymentType?: "cash" | "debt";
  customerId?: string;
}

export type ProductFormData = {
  name: string;
  category: string;
  variants: {
    id?: string;
    name: string;
    sku: string;
    costPrice: number;
    retailPrice: number;
    wholesalePrice: number;
    wholesaleMinQty: number;
    stock: number;
  }[];
};

