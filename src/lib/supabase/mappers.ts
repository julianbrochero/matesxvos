import type { Movement, Product } from "@/lib/domain";

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  location?: string | null;
  image_url?: string | null;
  cost: number | string;
  price: number | string;
  wholesale_price?: number | string | null;
  stock: number;
  min_stock: number;
  sold: number;
};

type MovementRow = {
  id: string;
  type: Movement["type"];
  product_id: string | null;
  quantity: number | null;
  status: Movement["status"] | null;
  title: string;
  detail: string;
  amount: number | string;
  profit: number | string;
  date: string;
  seller: string | null;
  payment: string | null;
  customer?: string | null;
  paid?: boolean | null;
  location?: string | null;
};

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    location: row.location || row.brand,
    imageUrl: row.image_url ?? undefined,
    cost: Number(row.cost),
    price: Number(row.price),
    wholesalePrice: row.wholesale_price === null || row.wholesale_price === undefined ? null : Number(row.wholesale_price),
    stock: Number(row.stock),
    minStock: Number(row.min_stock),
    sold: Number(row.sold),
  };
}

export function mapMovement(row: MovementRow): Movement {
  return {
    id: row.id,
    type: row.type,
    productId: row.product_id ?? undefined,
    quantity: row.quantity ?? undefined,
    status: row.status ?? undefined,
    title: row.title,
    detail: row.detail,
    amount: Number(row.amount),
    profit: Number(row.profit),
    date: row.date,
    seller: row.seller ?? undefined,
    payment: row.payment ?? undefined,
    customer: row.customer ?? undefined,
    paymentStatus: row.paid === false ? "no_pagado" : "pagado",
    location: row.location ?? undefined,
  };
}

export function toProductRow(product: {
  name: string;
  brand: string;
  location: string;
  imageUrl?: string | null;
  cost: number;
  price: number;
  wholesalePrice?: number | null;
  stock: number;
  minStock: number;
}) {
  return {
    name: product.name,
    brand: product.brand,
    location: product.location,
    image_url: product.imageUrl?.trim() || null,
    cost: product.cost,
    price: product.price,
    wholesale_price: product.wholesalePrice && product.wholesalePrice > 0 ? product.wholesalePrice : null,
    stock: product.stock,
    min_stock: product.minStock,
  };
}
