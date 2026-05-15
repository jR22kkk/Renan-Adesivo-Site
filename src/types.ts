export interface ProductVariant {
  name: string;
  price: number;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  featured: boolean;
  variants?: ProductVariant[];
  createdAt: any;
  updatedAt: any;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  status: 'PENDENTE' | 'FINALIZADO';
  address: {
    street: string;
    number: string;
    neighborhood: string;
    zipCode: string;
  };
  createdAt: any;
}

export interface HeroConfig {
  title: string;
  subtitle: string;
  imageUrl: string;
}

export type PaymentMethod = 'PIX' | 'CARTAO' | 'DINHEIRO';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface AdminSettings {
  siteName: string;
  contactEmail: string;
  whatsappNumber: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
