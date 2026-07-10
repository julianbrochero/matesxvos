"use client";

import { useEffect, useMemo, useState } from "react";
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
    <div className="min-h-screen bg-[#f6f5f1] pb-28 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-base font-bold text-white shadow-sm">
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600"
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

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-12 rounded-2xl pl-10"
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

      {cartCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-md sm:p-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{cartCount} {cartCount === 1 ? "producto" : "productos"}</p>
              <p className="text-lg font-semibold tracking-tight">{currency(cartTotal)}</p>
            </div>
            <Button onClick={() => setCartOpen(true)}>
              <ShoppingBag className="h-4 w-4" />
              Ver pedido
            </Button>
          </div>
        </div>
      ) : null}

      <Modal open={cartOpen} title="Tu pedido" subtitle={`Retiro / entrega en ${location}`} onClose={() => setCartOpen(false)}>
        <div className="grid gap-4">
          {cart.length ? (
            <div className="grid gap-3">
              {cart.map((item) => (
                <div key={item.productId} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-full w-full object-cover" src={item.imageUrl} alt={item.name} />
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
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeFromCart(item.productId)}
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="secondary" size="icon" className="h-8 w-8" onClick={() => decrementCart(item.productId)} aria-label="Restar">
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
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
                <Input label="Tu nombre (opcional)" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="¿Cómo te llamamos?" />
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Nota (opcional)</span>
                  <textarea
                    className="min-h-[72px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500/60 focus:ring-4 focus:ring-teal-500/10"
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
                  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700",
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
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card">
      <div className="grid aspect-square place-items-center overflow-hidden bg-slate-50">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="h-full w-full object-cover" src={product.imageUrl} alt={product.name} loading="lazy" />
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
          <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-2 py-1.5">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDecrement} aria-label="Restar">
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-semibold text-teal-800">{quantity}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onIncrement}
              disabled={quantity >= product.stock}
              aria-label="Sumar"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" className="w-full" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>
    </article>
  );
}
