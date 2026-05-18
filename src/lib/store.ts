"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type Movement,
  type Product,
  type ProductInput,
  type PurchaseInput,
  type SaleInput,
  seedMovements,
  seedProducts,
} from "@/lib/domain";
import { today } from "@/lib/utils";

export type { Movement, Product, ProductInput, PurchaseInput, SaleInput } from "@/lib/domain";

type BootstrapPayload = {
  products: Product[];
  movements: Movement[];
};

type StockState = {
  products: Product[];
  movements: Movement[];
  loading: boolean;
  remote: boolean;
  error: string;
  hydrate: () => Promise<void>;
  addProduct: (product: ProductInput) => Promise<void>;
  updateProduct: (id: string, product: ProductInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateStock: (id: string, stock: number) => Promise<void>;
  registerPurchase: (input: PurchaseInput) => Promise<void>;
  registerSale: (input: SaleInput) => Promise<boolean>;
};

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function localAddProduct(product: ProductInput, state: StockState) {
  return {
    products: [{ ...product, id: id("p"), sold: 0 }, ...state.products],
    movements: [
      {
        id: id("m"),
        type: "producto" as const,
        title: "Producto creado",
        detail: `${product.name} quedó disponible con ${product.stock} unidades`,
        amount: 0,
        profit: 0,
        date: today(),
      },
      ...state.movements,
    ],
  };
}

function localUpdateProduct(productId: string, product: ProductInput, state: StockState) {
  return {
    products: state.products.map((item) => (item.id === productId ? { ...item, ...product } : item)),
    movements: [
      {
        id: id("m"),
        type: "producto" as const,
        title: "Producto actualizado",
        detail: `${product.name} recibió nuevos datos de precio o stock`,
        amount: 0,
        profit: 0,
        date: today(),
      },
      ...state.movements,
    ],
  };
}

function localUpdateStock(productId: string, stock: number, state: StockState) {
  return {
    products: state.products.map((item) => (item.id === productId ? { ...item, stock } : item)),
    movements: [
      {
        id: id("m"),
        type: "stock" as const,
        title: "Stock ajustado",
        detail: `Nuevo stock manual: ${stock} unidades`,
        amount: 0,
        profit: 0,
        date: today(),
      },
      ...state.movements,
    ],
  };
}

function localRegisterPurchase({ productId, quantity, unitCost, date }: PurchaseInput, state: StockState) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return state;
  const total = quantity * unitCost;

  return {
    products: state.products.map((item) =>
      item.id === productId ? { ...item, cost: unitCost, stock: item.stock + quantity } : item,
    ),
    movements: [
      {
        id: id("m"),
        type: "compra" as const,
        title: "Compra registrada",
        detail: `${quantity} ${product.name} ingresaron al stock`,
        amount: total,
        profit: 0,
        date,
      },
      ...state.movements,
    ],
  };
}

function localRegisterSale({ productId, quantity, seller, payment, date }: SaleInput, state: StockState) {
  const product = state.products.find((item) => item.id === productId);
  if (!product || product.stock < quantity) return null;

  const amount = product.price * quantity;
  const profit = (product.price - product.cost) * quantity;

  return {
    products: state.products.map((item) =>
      item.id === productId
        ? { ...item, stock: item.stock - quantity, sold: item.sold + quantity }
        : item,
    ),
    movements: [
      {
        id: id("m"),
        type: "venta" as const,
        title: "Venta registrada",
        detail: `${quantity} ${product.name} por ${payment}`,
        amount,
        profit,
        date,
        seller,
        payment,
      },
      ...state.movements,
    ],
  };
}

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      products: seedProducts,
      movements: seedMovements,
      loading: false,
      remote: false,
      error: "",
      hydrate: async () => {
        set({ loading: true, error: "" });
        try {
          const payload = await apiRequest<BootstrapPayload>("/api/bootstrap", {
            cache: "no-store",
          });
          set({
            products: payload.products,
            movements: payload.movements,
            loading: false,
            remote: true,
            error: "",
          });
        } catch (error) {
          set({
            loading: false,
            remote: false,
            error: error instanceof Error ? error.message : "No se pudo conectar con Supabase",
          });
        }
      },
      addProduct: async (product) => {
        if (!get().remote) {
          set((state) => localAddProduct(product, state));
          return;
        }

        try {
          await apiRequest<Product>("/api/products", {
            method: "POST",
            body: JSON.stringify(product),
          });
          await get().hydrate();
        } catch (error) {
          set((state) => ({ ...localAddProduct(product, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      updateProduct: async (productId, product) => {
        if (!get().remote) {
          set((state) => localUpdateProduct(productId, product, state));
          return;
        }

        try {
          await apiRequest<Product>(`/api/products/${productId}`, {
            method: "PATCH",
            body: JSON.stringify(product),
          });
          await get().hydrate();
        } catch (error) {
          set((state) => ({ ...localUpdateProduct(productId, product, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      deleteProduct: async (productId) => {
        if (!get().remote) {
          set((state) => ({
            products: state.products.filter((item) => item.id !== productId),
          }));
          return;
        }

        try {
          await apiRequest<{ ok: boolean }>(`/api/products/${productId}`, {
            method: "DELETE",
          });
          await get().hydrate();
        } catch (error) {
          set((state) => ({
            products: state.products.filter((item) => item.id !== productId),
            error: error instanceof Error ? error.message : "",
          }));
        }
      },
      updateStock: async (productId, stock) => {
        if (!get().remote) {
          set((state) => localUpdateStock(productId, stock, state));
          return;
        }

        try {
          await apiRequest<Product>(`/api/products/${productId}`, {
            method: "PATCH",
            body: JSON.stringify({ stock }),
          });
          await get().hydrate();
        } catch (error) {
          set((state) => ({ ...localUpdateStock(productId, stock, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      registerPurchase: async (input) => {
        if (!get().remote) {
          set((state) => localRegisterPurchase(input, state));
          return;
        }

        try {
          await apiRequest<{ ok: boolean }>("/api/purchases", {
            method: "POST",
            body: JSON.stringify(input),
          });
          await get().hydrate();
        } catch (error) {
          set((state) => ({ ...localRegisterPurchase(input, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      registerSale: async (input) => {
        if (!get().remote) {
          const next = localRegisterSale(input, get());
          if (!next) return false;
          set(next);
          return true;
        }

        try {
          await apiRequest<{ ok: boolean }>("/api/sales", {
            method: "POST",
            body: JSON.stringify(input),
          });
          await get().hydrate();
          return true;
        } catch (error) {
          if (error instanceof Error && error.message.toLowerCase().includes("stock insuficiente")) {
            set({ error: error.message });
            return false;
          }

          const next = localRegisterSale(input, get());
          if (!next) return false;
          set({ ...next, error: error instanceof Error ? error.message : "" });
          return true;
        }
      },
    }),
    {
      name: "matesxvos-premium-stock",
      partialize: (state) => ({
        products: state.products,
        movements: state.movements,
      }),
    },
  ),
);
