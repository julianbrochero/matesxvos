import { today } from "@/lib/utils";

export type Product = {
  id: string;
  name: string;
  brand: string;
  location: string;
  imageUrl?: string;
  cost: number;
  price: number;
  wholesalePrice?: number | null;
  stock: number;
  minStock: number;
  sold: number;
};

export type Movement = {
  id: string;
  type: "compra" | "venta" | "stock" | "producto";
  productId?: string;
  quantity?: number;
  status?: "entregado" | "encargado";
  paymentStatus?: "pagado" | "no_pagado";
  title: string;
  detail: string;
  amount: number;
  profit: number;
  date: string;
  seller?: string;
  payment?: string;
  customer?: string;
  unitCost?: number;
  location?: string;
};

export type PurchaseInput = {
  productId: string;
  quantity: number;
  unitCost: number;
  date: string;
};

export type SaleInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  seller: string;
  payment: string;
  customer?: string;
  date: string;
  status: "entregado" | "encargado";
  paymentStatus: "pagado" | "no_pagado";
};

export type SaleUpdateInput = {
  seller: string;
  payment: string;
  customer?: string;
  date: string;
  status: "entregado" | "encargado";
  paymentStatus: "pagado" | "no_pagado";
  unitPrice?: number;
  unitCost?: number;
};

export type ProductInput = Omit<Product, "id" | "sold">;

export const seedProducts: Product[] = [
  { id: "p1", name: "Baldo 1kg", brand: "Baldo", location: "Buenos Aires", cost: 12000, price: 17000, wholesalePrice: 15500, stock: 34, minStock: 8, sold: 42 },
  { id: "p2", name: "Canarias Serena 1kg", brand: "Canarias", location: "Villa Maria", cost: 10800, price: 15800, wholesalePrice: 14500, stock: 18, minStock: 10, sold: 31 },
  { id: "p3", name: "Playadito 1kg", brand: "Playadito", location: "Buenos Aires", cost: 7200, price: 11200, wholesalePrice: 10100, stock: 46, minStock: 12, sold: 55 },
  { id: "p4", name: "La Merced Campo 500g", brand: "La Merced", location: "Villa Maria", cost: 5400, price: 8200, wholesalePrice: 7500, stock: 12, minStock: 8, sold: 18 },
  { id: "p5", name: "Sara Tradicional 1kg", brand: "Sara", location: "Buenos Aires", cost: 9800, price: 14500, wholesalePrice: 13200, stock: 7, minStock: 9, sold: 22 },
  { id: "p6", name: "Rei Verde Export 1kg", brand: "Rei Verde", location: "Villa Maria", cost: 11500, price: 16900, wholesalePrice: 15400, stock: 15, minStock: 6, sold: 15 },
];

export const seedMovements: Movement[] = [
  {
    id: "m1",
    type: "venta",
    productId: "p1",
    quantity: 3,
    title: "Venta registrada",
    detail: "3 Baldo 1kg por Mercado Pago",
    amount: 51000,
    profit: 15000,
    date: today(),
    seller: "Julian",
    payment: "Mercado Pago",
    customer: "Cliente mostrador",
    status: "entregado",
    paymentStatus: "pagado",
    location: "Buenos Aires",
  },
  {
    id: "m2",
    type: "compra",
    productId: "p3",
    quantity: 20,
    title: "Ingreso de mercadería",
    detail: "20 Playadito 1kg al stock",
    amount: 144000,
    profit: 0,
    date: "2026-05-17",
    location: "Buenos Aires",
  },
  {
    id: "m3",
    type: "venta",
    productId: "p2",
    quantity: 2,
    title: "Venta registrada",
    detail: "2 Canarias Serena 1kg en efectivo",
    amount: 31600,
    profit: 10000,
    date: "2026-05-16",
    seller: "Santiago",
    payment: "Efectivo",
    customer: "Martina",
    status: "entregado",
    paymentStatus: "no_pagado",
    location: "Villa Maria",
  },
];
