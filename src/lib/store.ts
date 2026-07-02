"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type Movement,
  type Product,
  type ProductInput,
  type PurchaseInput,
  type SaleBatchInput,
  type SaleUpdateInput,
  seedMovements,
  seedProducts,
} from "@/lib/domain";
import { today } from "@/lib/utils";

export type { Movement, Product, ProductInput, PurchaseInput, SaleBatchInput, SaleLineInput, SaleUpdateInput } from "@/lib/domain";

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
  registerSale: (input: SaleBatchInput) => Promise<boolean>;
  updateSale: (id: string | string[], input: SaleUpdateInput) => Promise<boolean>;
  updateSaleStatus: (id: string | string[], status: NonNullable<Movement["status"]>) => Promise<void>;
  updateSalePaymentStatus: (id: string | string[], paymentStatus: NonNullable<Movement["paymentStatus"]>) => Promise<void>;
  deleteMovement: (id: string | string[]) => Promise<void>;
};

const LOCAL_MODE_ENABLED = process.env.NODE_ENV !== "production";
const DATABASE_CONNECTION_ERROR = "No se pudo conectar a la base de datos.";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function remoteError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes("no autorizado")) {
    return "La sesion vencio. Volve a entrar.";
  }
  if (!LOCAL_MODE_ENABLED && error instanceof Error) return `${DATABASE_CONNECTION_ERROR} ${error.message}`;
  if (!LOCAL_MODE_ENABLED) return `${DATABASE_CONNECTION_ERROR} Revisá las variables de Supabase en Vercel.`;
  return error instanceof Error ? error.message : "No se pudo conectar con Supabase";
}

function payloadErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback;

  const error = (payload as { error: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "fieldErrors" in error) {
    const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
    const messages = Object.entries(fieldErrors).flatMap(([field, errors]) =>
      errors.map((message) => `${field}: ${message}`),
    );
    if (messages.length) return messages.join(". ");
  }

  return fallback;
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
    throw new Error(payloadErrorMessage(payload, `Request failed: ${response.status}`));
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
        productId,
        quantity,
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

function localRegisterSale(
  { items, seller, payment, customer, date, status, paymentStatus }: SaleBatchInput,
  state: StockState,
) {
  if (!items.length) return null;

  const products = items.map((item) => state.products.find((entry) => entry.id === item.productId));
  if (products.some((product, index) => !product || product.stock < items[index].quantity)) return null;

  const groupId = items.length > 1 ? id("g") : undefined;
  let nextProducts = state.products;
  const newMovements: Movement[] = [];

  items.forEach((item, index) => {
    const product = products[index]!;
    const salePrice = item.unitPrice > 0 ? item.unitPrice : product.price;
    const saleCost = item.unitCost !== undefined && item.unitCost > 0 ? item.unitCost : product.cost;
    const amount = salePrice * item.quantity;
    const profit = (salePrice - saleCost) * item.quantity;

    nextProducts = nextProducts.map((entry) =>
      entry.id === item.productId
        ? { ...entry, stock: entry.stock - item.quantity, sold: entry.sold + item.quantity }
        : entry,
    );

    newMovements.push({
      id: id("m"),
      type: "venta",
      productId: item.productId,
      quantity: item.quantity,
      title: "Venta registrada",
      detail: `${item.quantity} ${product.name} por ${payment}`,
      amount,
      profit,
      unitCost: saleCost,
      date,
      seller,
      payment,
      customer: customer?.trim() || undefined,
      status,
      paymentStatus,
      groupId,
    });
  });

  return {
    products: nextProducts,
    movements: [...newMovements, ...state.movements],
  };
}

function localUpdateSaleStatus(movementId: string, status: NonNullable<Movement["status"]>, state: StockState) {
  return {
    movements: state.movements.map((movement) =>
      movement.id === movementId && movement.type === "venta" ? { ...movement, status } : movement,
    ),
  };
}

function localUpdateSale(movementId: string, input: SaleUpdateInput, state: StockState) {
  return {
    movements: state.movements.map((movement) => {
      if (movement.id !== movementId || movement.type !== "venta") return movement;

      const next = {
        ...movement,
        seller: input.seller,
        payment: input.payment,
        customer: input.customer?.trim() || undefined,
        date: input.date,
        status: input.status,
        paymentStatus: input.paymentStatus,
      };

      if (input.unitPrice !== undefined || input.unitCost !== undefined) {
        const product = state.products.find((item) => item.id === movement.productId);
        const quantity = movement.quantity ?? 1;
        const unitPrice = input.unitPrice ?? movement.amount / quantity;
        const unitCost = input.unitCost ?? movement.unitCost ?? product?.cost ?? 0;
        const amount = unitPrice * quantity;
        const profit = (unitPrice - unitCost) * quantity;
        return { ...next, amount, profit, unitCost };
      }

      return next;
    }),
  };
}

function localUpdateSalePaymentStatus(
  movementId: string,
  paymentStatus: NonNullable<Movement["paymentStatus"]>,
  state: StockState,
) {
  return {
    movements: state.movements.map((movement) =>
      movement.id === movementId && movement.type === "venta" ? { ...movement, paymentStatus } : movement,
    ),
  };
}

function localDeleteMovement(movementId: string, state: StockState) {
  const movement = state.movements.find((item) => item.id === movementId);
  const saleData = movement?.type === "venta" ? saleProductAndQuantity(movement, state.products) : null;

  return {
    products: saleData
      ? state.products.map((product) =>
          product.id === saleData.productId
            ? {
                ...product,
                stock: product.stock + saleData.quantity,
                sold: Math.max(0, product.sold - saleData.quantity),
              }
            : product,
        )
      : state.products,
    movements: state.movements.filter((movementItem) => movementItem.id !== movementId),
  };
}

function saleProductAndQuantity(movement: Movement, products: Product[]) {
  if (movement.productId && movement.quantity && movement.quantity > 0) {
    return { productId: movement.productId, quantity: movement.quantity };
  }

  const match = movement.detail.match(/^(\d+)\s+(.+?)\s+por\s+/i);
  if (!match) return null;

  const quantity = Number(match[1]);
  const productName = match[2];
  const matchingProducts = products.filter((item) => item.name.toLowerCase() === productName.toLowerCase());
  const product = matchingProducts.length === 1 ? matchingProducts[0] : null;

  if (!product || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { productId: product.id, quantity };
}

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      products: LOCAL_MODE_ENABLED ? seedProducts : [],
      movements: LOCAL_MODE_ENABLED ? seedMovements : [],
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
            products: LOCAL_MODE_ENABLED ? get().products : [],
            movements: LOCAL_MODE_ENABLED ? get().movements : [],
            loading: false,
            remote: false,
            error: remoteError(error),
          });
        }
      },
      addProduct: async (product) => {
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
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
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({ ...localAddProduct(product, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      updateProduct: async (productId, product) => {
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
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
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({ ...localUpdateProduct(productId, product, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      deleteProduct: async (productId) => {
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
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
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({
            products: state.products.filter((item) => item.id !== productId),
            error: error instanceof Error ? error.message : "",
          }));
        }
      },
      updateStock: async (productId, stock) => {
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
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
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({ ...localUpdateStock(productId, stock, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      registerPurchase: async (input) => {
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
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
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({ ...localRegisterPurchase(input, state), error: error instanceof Error ? error.message : "" }));
        }
      },
      registerSale: async (input) => {
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return false;
          }
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

          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return false;
          }

          const next = localRegisterSale(input, get());
          if (!next) return false;
          set({ ...next, error: error instanceof Error ? error.message : "" });
          return true;
        }
      },
      updateSale: async (movementIds, input) => {
        const ids = Array.isArray(movementIds) ? movementIds : [movementIds];
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return false;
          }
          set((state) => ids.reduce((acc, movementId) => ({ ...acc, ...localUpdateSale(movementId, input, acc) }), state));
          return true;
        }

        try {
          await Promise.all(
            ids.map((movementId) =>
              apiRequest<{ ok: boolean }>(`/api/movements/${movementId}`, {
                method: "PATCH",
                body: JSON.stringify(input),
              }),
            ),
          );
          await get().hydrate();
          return true;
        } catch (error) {
          set({ error: remoteError(error) });
          return false;
        }
      },
      updateSaleStatus: async (movementIds, status) => {
        const ids = Array.isArray(movementIds) ? movementIds : [movementIds];
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
          set((state) => ids.reduce((acc, movementId) => ({ ...acc, ...localUpdateSaleStatus(movementId, status, acc) }), state));
          return;
        }

        try {
          await Promise.all(
            ids.map((movementId) =>
              apiRequest<{ ok: boolean }>(`/api/movements/${movementId}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
              }),
            ),
          );
          await get().hydrate();
        } catch (error) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({
            ...ids.reduce((acc, movementId) => ({ ...acc, ...localUpdateSaleStatus(movementId, status, acc) }), state),
            error: error instanceof Error ? error.message : "",
          }));
        }
      },
      updateSalePaymentStatus: async (movementIds, paymentStatus) => {
        const ids = Array.isArray(movementIds) ? movementIds : [movementIds];
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
          set((state) =>
            ids.reduce((acc, movementId) => ({ ...acc, ...localUpdateSalePaymentStatus(movementId, paymentStatus, acc) }), state),
          );
          return;
        }

        try {
          await Promise.all(
            ids.map((movementId) =>
              apiRequest<{ ok: boolean }>(`/api/movements/${movementId}`, {
                method: "PATCH",
                body: JSON.stringify({ paymentStatus }),
              }),
            ),
          );
          await get().hydrate();
        } catch (error) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({
            ...ids.reduce((acc, movementId) => ({ ...acc, ...localUpdateSalePaymentStatus(movementId, paymentStatus, acc) }), state),
            error: error instanceof Error ? error.message : "",
          }));
        }
      },
      deleteMovement: async (movementIds) => {
        const ids = Array.isArray(movementIds) ? movementIds : [movementIds];
        if (!get().remote) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: DATABASE_CONNECTION_ERROR });
            return;
          }
          set((state) => ids.reduce((acc, movementId) => ({ ...acc, ...localDeleteMovement(movementId, acc) }), state));
          return;
        }

        try {
          await Promise.all(
            ids.map((movementId) =>
              apiRequest<{ ok: boolean }>(`/api/movements/${movementId}`, {
                method: "DELETE",
              }),
            ),
          );
          await get().hydrate();
        } catch (error) {
          if (!LOCAL_MODE_ENABLED) {
            set({ error: remoteError(error) });
            return;
          }
          set((state) => ({
            ...ids.reduce((acc, movementId) => ({ ...acc, ...localDeleteMovement(movementId, acc) }), state),
            error: error instanceof Error ? error.message : "",
          }));
        }
      },
    }),
    {
      name: LOCAL_MODE_ENABLED ? "matesxvos-premium-stock" : "matesxvos-remote-stock",
      partialize: (state) => ({
        products: LOCAL_MODE_ENABLED ? state.products : [],
        movements: LOCAL_MODE_ENABLED ? state.movements : [],
      }),
    },
  ),
);
