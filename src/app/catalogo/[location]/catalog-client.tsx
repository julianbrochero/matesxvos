"use client";

import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, Loader2, Minus, MessageCircle, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn, currency } from "@/lib/utils";
import type { PublicCatalogProduct } from "@/app/api/public/catalog/route";

const WHATSAPP_NUMBER = "5493534796992";
const WHATSAPP_DISPLAY = "+54 9 353 479-6992";
const INSTAGRAM_HANDLE = "@matesxvos";
const LOW_STOCK_LIMIT = 5;

type LocationName = "Buenos Aires" | "Villa Maria";

type CartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  maxStock: number;
};

export function CatalogClient({ location }: { location: LocationName }) {
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/public/catalog?location=${encodeURIComponent(location)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        if (payload?.error) {
          setError(payload.error);
          return;
        }
        setProducts(payload.products ?? []);
      })
      .catch(() => {
        if (active) setError("No pudimos cargar el catálogo. Probá de nuevo en unos segundos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [location]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => `${product.name} ${product.brand}`.toLowerCase().includes(query));
  }, [products, search]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  function quantityInCart(productId: string) {
    return cart.find((item) => item.productId === productId)?.quantity ?? 0;
  }

  function addToCart(product: PublicCatalogProduct) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return current;
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        { productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: 1, maxStock: product.stock },
      ];
    });
  }

  function decrementCart(productId: string) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  const whatsappOrderUrl = useMemo(() => {
    if (!cart.length) return null;
    const lines = cart.map((item) => `• ${item.quantity}x ${item.name} — ${currency(item.price * item.quantity)}`);
    const parts = [
      "¡Hola! Quiero hacer un pedido 🧉",
      "",
      ...lines,
      "",
      `Total: ${currency(cartTotal)}`,
      `Sucursal: ${location}`,
    ];
    if (customerName.trim()) parts.push(`Nombre: ${customerName.trim()}`);
    if (note.trim()) parts.push(`Nota: ${note.trim()}`);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(parts.join("\n"))}`;
  }, [cart, cartTotal, customerName, note, location]);

  const contactUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`¡Hola! Te escribo desde el catálogo de ${location} 🧉`)}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f6f5f1] pb-28 text-slate-950">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-blue-400/35 blur-2xl will-change-transform" />
        <div className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-violet-400/25 blur-2xl will-change-transform" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-400/25 blur-2xl will-change-transform" />
      </div>

      <header className="liquid-glass liquid-glass-strong sticky top-0 z-30 rounded-none">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-rose-500 text-base font-bold text-white shadow-sm">
              M
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight">Mates x Vos</p>
              <p className="truncate text-sm text-slate-500">Catálogo · {location}</p>
            </div>
          </div>
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="liquid-glass-btn-accent grid h-11 w-11 shrink-0 place-items-center rounded-full"
            aria-label="Contactar por WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <p className="text-sm text-slate-600">
          Mates, bombillas, yerbas y accesorios premium. Armá tu pedido y te contestamos por WhatsApp.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Instagram {INSTAGRAM_HANDLE} · WhatsApp {WHATSAPP_DISPLAY}
        </p>

        <div className="liquid-glass relative mt-5 rounded-2xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="h-12 rounded-2xl border-transparent bg-transparent pl-10 shadow-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            placeholder="Buscar producto..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="grid place-items-center py-24 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{error}</div>
        ) : !filtered.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="font-medium">Sin productos disponibles</p>
            <p className="mt-1 text-sm text-slate-500">
              {search ? "No encontramos productos con ese nombre." : "Todavía no hay stock cargado para esta sucursal."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={quantityInCart(product.id)}
                onAdd={() => addToCart(product)}
                onIncrement={() => addToCart(product)}
                onDecrement={() => decrementCart(product.id)}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-center text-xs text-slate-400 sm:px-6">
        Catálogo de Mates x Vos · {location}
      </footer>

      <div className="liquid-glass liquid-glass-strong fixed inset-x-0 bottom-0 z-30 rounded-none p-3 sm:p-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <AnimatePresence mode="wait" initial={false}>
            {cartCount > 0 ? (
              <motion.div
                key="filled"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                <p className="text-xs text-slate-500">{cartCount} {cartCount === 1 ? "producto" : "productos"}</p>
                <p className="text-lg font-semibold tracking-tight">{currency(cartTotal)}</p>
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="text-sm text-slate-500"
              >
                Agregá productos para armar tu pedido
              </motion.p>
            )}
          </AnimatePresence>
          <Button variant="glassAccent" className="rounded-full" disabled={cartCount === 0} onClick={() => setCartOpen(true)}>
            <ShoppingBag className="h-4 w-4" />
            Ver pedido
          </Button>
        </div>
      </div>

      <Modal
        open={cartOpen}
        title="Tu pedido"
        subtitle={`Retiro / entrega en ${location}`}
        onClose={() => setCartOpen(false)}
        panelClassName="liquid-glass liquid-glass-strong border-white/40"
      >
        <div className="grid gap-4">
          {cart.length ? (
            <div className="grid gap-3">
              {cart.map((item) => (
                <div key={item.productId} className="rounded-xl border border-slate-200/70 bg-white/50 p-3">
                  <div className="flex items-start gap-3">
                    <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {item.imageUrl ? (
                        <NextImage src={item.imageUrl} alt={item.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-slate-500">{currency(item.price)} c/u</p>
                    </div>
                    <Button
                      type="button"
                      variant="glass"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full"
                      onClick={() => removeFromCart(item.productId)}
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="glass" size="icon" className="h-8 w-8 rounded-full" onClick={() => decrementCart(item.productId)} aria-label="Restar">
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="glass"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setCart((current) => current.map((line) => line.productId === item.productId && line.quantity < line.maxStock ? { ...line, quantity: line.quantity + 1 } : line))}
                        aria-label="Sumar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold">{currency(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">Todavía no agregaste productos.</p>
          )}

          {cart.length ? (
            <>
              <div className="grid gap-3 border-t border-slate-200 pt-4">
                <Input
                  className="focus:border-blue-500/60 focus:ring-blue-500/10"
                  label="Tu nombre (opcional)"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="¿Cómo te llamamos?"
                />
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Nota (opcional)</span>
                  <textarea
                    className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Horario de entrega, forma de pago, etc."
                  />
                </label>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold">
                <span>Total</span>
                <span>{currency(cartTotal)}</span>
              </div>

              <a
                href={whatsappOrderUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "liquid-glass-btn-accent inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold",
                )}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar pedido por WhatsApp
              </a>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function ProductCard({
  product,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  product: PublicCatalogProduct;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const lowStock = product.stock <= LOW_STOCK_LIMIT;

  return (
    <article className="liquid-glass liquid-glass-shine flex flex-col overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative grid aspect-square place-items-center overflow-hidden bg-slate-50/60">
        {product.imageUrl ? (
          <NextImage
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-300" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-tight">{product.name}</p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{currency(product.price)}</p>
          {lowStock ? <span className="text-[11px] font-medium text-amber-600">¡Últimas {product.stock}!</span> : null}
        </div>
        {quantity > 0 ? (
          <div className="liquid-glass flex items-center justify-between rounded-full px-1.5 py-1">
            <Button type="button" variant="glass" size="icon" className="h-7 w-7 rounded-full" onClick={onDecrement} aria-label="Restar">
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-semibold text-blue-700">{quantity}</span>
            <Button
              type="button"
              variant="glass"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={onIncrement}
              disabled={quantity >= product.stock}
              aria-label="Sumar"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="glassAccent" size="sm" className="w-full rounded-full" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>
    </article>
  );
}
