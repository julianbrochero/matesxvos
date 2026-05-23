"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { currency, today } from "@/lib/utils";
import { Product, useStockStore } from "@/lib/store";

type View = "stock" | "carga" | "ventas" | "precios";

const LOW_STOCK_LIMIT = 5;
const VENDORS = ["Julian", "Santiago"] as const;

const tabs: { id: View; label: string; icon: typeof Boxes }[] = [
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "carga", label: "Cargar stock", icon: PackagePlus },
  { id: "ventas", label: "Ventas / encargos", icon: ShoppingBag },
  { id: "precios", label: "PDF precios", icon: Download },
];

export default function Home() {
  const [view, setView] = useState<View>("stock");
  const hydrate = useStockStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-ink">
      <Header view={view} setView={setView} />
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-5 lg:px-8">
        {view === "stock" && <StockView onNavigate={setView} />}
        {view === "carga" && <LoadStockView />}
        {view === "ventas" && <SalesView />}
        {view === "precios" && <PricesView />}
      </div>
    </main>
  );
}

function Header({ view, setView }: { view: View; setView: (view: View) => void }) {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const remote = useStockStore((state) => state.remote);
  const metrics = useMemo(() => getMetrics(products, movements), [products, movements]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white shadow-sm">
      <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-5 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/45">Mates x Vos</p>
              <h1 className="truncate text-xl font-semibold tracking-tight">Stock simple</h1>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-black/55 lg:hidden">
              <span className={`h-2 w-2 rounded-sm ${remote ? "bg-gain" : "bg-amber"}`} />
              {remote ? "Supabase" : "Local"}
            </div>
          </div>

          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                    active ? "bg-ink text-white" : "text-black/60 hover:bg-black/[0.04] hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-black/55 lg:inline-flex">
            <span className={`h-2 w-2 rounded-sm ${remote ? "bg-gain" : "bg-amber"}`} />
            {remote ? "Guardado en Supabase" : "Modo local"}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Metric label="Productos" value={String(products.length)} />
          <Metric label="Unidades" value={String(metrics.stock)} />
          <Metric label="Ventas registradas" value={currency(metrics.sales)} />
        </div>
      </div>
    </header>
  );
}

function StockView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const products = useStockStore((state) => state.products);
  const addProduct = useStockStore((state) => state.addProduct);
  const updateProduct = useStockStore((state) => state.updateProduct);
  const deleteProduct = useStockStore((state) => state.deleteProduct);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = products.filter((product) =>
    `${product.name} ${product.brand} ${productLocation(product)}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Stock</h2>
            <p className="mt-1 text-sm text-black/50">Productos, precios, cantidades y dónde están.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => onNavigate("carga")}>
              <PackagePlus className="h-4 w-4" />
              Cargar stock
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
          <Input
            className="pl-11"
            placeholder="Buscar producto, proveedor o ubicación"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-black/[0.025] text-xs font-semibold uppercase text-black/45">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Costo</th>
                <th className="px-4 py-3">Precio cliente</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold">{product.name}</td>
                  <td className="px-4 py-3 text-black/55">{product.brand}</td>
                  <td className="px-4 py-3 text-black/55">{productLocation(product)}</td>
                  <td className="px-4 py-3">
                    <StockPill product={product} />
                  </td>
                  <td className="px-4 py-3">{currency(product.cost)}</td>
                  <td className="px-4 py-3 font-semibold">{currency(product.price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => {
                          setEditing(product);
                          setModalOpen(true);
                        }}
                        aria-label="Editar producto"
                        title="Editar producto"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void confirmDelete(product, deleteProduct)}
                        aria-label="Eliminar producto"
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line md:hidden">
          {filtered.map((product) => (
            <article key={product.id} className="grid gap-3 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="mt-1 text-sm text-black/50">{product.brand} · {productLocation(product)}</p>
                </div>
                <StockPill product={product} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Mini label="Costo" value={currency(product.cost)} />
                <Mini label="Cliente" value={currency(product.price)} />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => {
                    setEditing(product);
                    setModalOpen(true);
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => void confirmDelete(product, deleteProduct)} aria-label="Eliminar producto">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </article>
          ))}
        </div>

        {!filtered.length ? <EmptyState title="No hay productos" text="Agregá uno para empezar a vender." /> : null}
      </div>

      <ProductModal
        open={modalOpen}
        product={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={(values) => {
          if (editing) void updateProduct(editing.id, values);
          else void addProduct(values);
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </section>
  );
}

function LoadStockView() {
  const products = useStockStore((state) => state.products);
  const registerPurchase = useStockStore((state) => state.registerPurchase);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(products[0] ? String(products[0].cost) : "");
  const [date, setDate] = useState(today());
  const [done, setDone] = useState("");
  const selected = products.find((product) => product.id === productId);

  useEffect(() => {
    if (productId || !products[0]) return;
    setProductId(products[0].id);
    setUnitCost(String(products[0].cost));
  }, [productId, products]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const quantityValue = toPositiveInteger(quantity);
    const costValue = toPositiveNumber(unitCost);
    await registerPurchase({ productId, quantity: quantityValue, unitCost: costValue, date });
    setDone(`${quantityValue} unidades cargadas en ${selected?.name ?? "el producto"}.`);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-md border border-line bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold">Cargar stock</h2>
        <p className="mt-1 text-sm text-black/50">Sumá mercadería y actualizá el costo si cambió.</p>
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="mt-5 grid gap-4">
          <Select
            label="Producto"
            value={productId}
            required
            onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value);
              setProductId(event.target.value);
              setUnitCost(product ? String(product.cost) : "");
              setDone("");
            }}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <Input label="Cantidad que entra" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Input label="Costo unitario" required type="number" min={1} value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
          <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Button disabled={!products.length}>
            <PackagePlus className="h-4 w-4" />
            Guardar carga
          </Button>
        </form>
        {done ? <SuccessMessage text={done} /> : null}
      </div>

      <div className="rounded-md border border-line bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold">Vista rápida</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Metric label="Producto" value={selected?.name ?? "-"} />
          <Metric label="Stock actual" value={`${selected?.stock ?? 0} u.`} />
          <Metric label="Proveedor" value={selected?.brand ?? "-"} />
          <Metric label="Ubicación" value={selected ? productLocation(selected) : "-"} />
          <Metric label="Nuevo costo" value={currency(toPositiveNumber(unitCost))} />
        </div>
      </div>
    </section>
  );
}

function SalesView() {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const registerSale = useStockStore((state) => state.registerSale);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [seller, setSeller] = useState<(typeof VENDORS)[number]>("Julian");
  const [payment, setPayment] = useState("Mercado Pago");
  const [date, setDate] = useState(today());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = products.find((product) => product.id === productId);
  const quantityValue = toPositiveInteger(quantity);
  const total = (selected?.price ?? 0) * quantityValue;
  const sales = movements.filter((movement) => movement.type === "venta").slice(0, 8);

  useEffect(() => {
    if (productId || !products[0]) return;
    setProductId(products[0].id);
  }, [productId, products]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await registerSale({ productId, quantity: quantityValue, seller, payment, date });

    if (!ok) {
      setMessage("");
      setError("No hay stock suficiente para esa venta.");
      return;
    }

    setError("");
    setMessage(`Venta registrada: ${quantityValue} ${selected?.name ?? "producto"} por ${currency(total)}.`);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-md border border-line bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold">Registrar venta</h2>
        <p className="mt-1 text-sm text-black/50">Elegí producto, cantidad y forma de pago.</p>
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="mt-5 grid gap-4">
          <Select label="Producto" value={productId} required onChange={(event) => setProductId(event.target.value)}>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.stock} u.
              </option>
            ))}
          </Select>
          <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Select label="Vendedor" value={seller} onChange={(event) => setSeller(event.target.value as (typeof VENDORS)[number])}>
            {VENDORS.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </Select>
          <Select label="Pago" value={payment} onChange={(event) => setPayment(event.target.value)}>
            <option>Mercado Pago</option>
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta</option>
          </Select>
          <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Button disabled={!products.length}>
            <ShoppingBag className="h-4 w-4" />
            Registrar venta
          </Button>
        </form>
        {message ? <SuccessMessage text={message} /> : null}
        {error ? <ErrorMessage text={error} /> : null}
      </div>

      <div className="grid gap-4">
        <div className="rounded-md border border-line bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-semibold">Resumen</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Metric label="Producto" value={selected?.name ?? "-"} />
            <Metric label="Disponible" value={`${selected?.stock ?? 0} u.`} />
            <Metric label="Precio cliente" value={currency(selected?.price ?? 0)} />
            <Metric label="Total venta" value={currency(total)} />
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-xl font-semibold">Lista de ventas / encargos</h2>
            <p className="mt-1 text-sm text-black/50">Últimos movimientos registrados.</p>
          </div>
          <div className="divide-y divide-line">
            {sales.map((sale) => (
              <div key={sale.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="font-semibold">{sale.detail}</p>
                  <p className="mt-1 text-sm text-black/50">
                    {sale.date} · {sale.seller ?? "Sin vendedor"} · {sale.payment ?? "Sin pago"}
                  </p>
                </div>
                <p className="font-semibold">{currency(sale.amount)}</p>
              </div>
            ))}
          </div>
          {!sales.length ? <EmptyState title="Sin ventas todavía" text="Cuando registres una venta aparece acá." /> : null}
        </div>
      </div>
    </section>
  );
}

function PricesView() {
  const products = useStockStore((state) => state.products);
  const availableProducts = products.filter((product) => product.stock > 0);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="rounded-md border border-line bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold">Lista para clientes</h2>
        <p className="mt-1 text-sm text-black/50">Descarga un PDF simple con productos disponibles y precios finales.</p>
        <Button className="mt-5 w-full" disabled={!availableProducts.length} onClick={() => downloadPricePdf(availableProducts)}>
          <Download className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-semibold">Previsualización</h3>
        </div>
        <div className="divide-y divide-line">
          {availableProducts.map((product) => (
            <div key={product.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-black/50">{product.brand} · {productLocation(product)}</p>
              </div>
              <p className="font-semibold">{currency(product.price)}</p>
            </div>
          ))}
        </div>
        {!availableProducts.length ? <EmptyState title="Sin productos disponibles" text="Cargá stock para generar la lista." /> : null}
      </div>
    </section>
  );
}

function ProductModal({
  open,
  product,
  onClose,
  onSubmit,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (values: Omit<Product, "id" | "sold">) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    location: "",
    cost: "",
    price: "",
    stock: "",
  });

  useEffect(() => {
    setForm({
      name: product?.name ?? "",
      brand: product?.brand ?? "",
      location: product ? productLocation(product) : "",
      cost: product ? String(product.cost) : "",
      price: product ? String(product.price) : "",
      stock: product ? String(product.stock) : "",
    });
  }, [product, open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      brand: form.brand.trim(),
      location: form.location.trim(),
      cost: toPositiveNumber(form.cost),
      price: toPositiveNumber(form.price),
      stock: toNonNegativeInteger(form.stock),
      minStock: product?.minStock ?? LOW_STOCK_LIMIT,
    });
  }

  return (
    <Modal open={open} title={product ? "Editar producto" : "Nuevo producto"} subtitle="Datos necesarios para stock y ventas" onClose={onClose}>
      <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
        <Input label="Producto" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input
          label="Proveedor / marca"
          required
          value={form.brand}
          onChange={(event) => setForm({ ...form, brand: event.target.value })}
        />
        <Input
          label="Ubicación"
          required
          placeholder="Ej: Depósito, estante A, local"
          value={form.location}
          onChange={(event) => setForm({ ...form, location: event.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Costo" required type="number" min={1} value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} />
          <Input label="Precio cliente" required type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <Input label="Stock" required type="number" min={0} value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{product ? "Guardar" : "Crear"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-[#fbfbfa] p-3">
      <p className="text-sm text-black/45">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.035] p-2.5">
      <p className="text-xs text-black/42">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StockPill({ product }: { product: Product }) {
  const low = product.stock <= LOW_STOCK_LIMIT;

  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${low ? "bg-danger/10 text-danger" : "bg-gain/10 text-gain"}`}>
      {product.stock} u.
    </span>
  );
}

function SuccessMessage({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md bg-gain/10 px-4 py-3 text-sm font-medium text-gain">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return <p className="mt-4 rounded-md bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{text}</p>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-3 rounded-md border border-dashed border-black/15 bg-white p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-black/45">{text}</p>
    </div>
  );
}

async function confirmDelete(product: Product, deleteProduct: (id: string) => Promise<void>) {
  const ok = window.confirm(`Eliminar ${product.name}?`);
  if (!ok) return;
  await deleteProduct(product.id);
}

function handleFormKeyboardNavigation(event: KeyboardEvent<HTMLFormElement>) {
  const key = event.key;
  if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Enter"].includes(key)) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;

  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
    ),
  ).filter((control) => {
    const rect = control.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && control.tabIndex !== -1;
  });

  const currentIndex = controls.indexOf(target);
  if (currentIndex === -1) return;

  if (key === "ArrowDown" || key === "ArrowRight") {
    event.preventDefault();
    controls[Math.min(controls.length - 1, currentIndex + 1)]?.focus();
    return;
  }

  if (key === "ArrowUp" || key === "ArrowLeft") {
    event.preventDefault();
    controls[Math.max(0, currentIndex - 1)]?.focus();
    return;
  }

  if (key === "Enter" && !(target instanceof HTMLButtonElement)) {
    event.preventDefault();
    const editableControls = controls.filter(isEditableFormControl);
    const editableIndex = editableControls.findIndex((control) => control === target);

    if (editableIndex >= 0 && editableIndex < editableControls.length - 1) {
      editableControls[editableIndex + 1]?.focus();
      return;
    }

    event.currentTarget.requestSubmit();
  }
}

function isEditableFormControl(
  control: HTMLElement,
): control is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return (
    control instanceof HTMLInputElement ||
    control instanceof HTMLSelectElement ||
    control instanceof HTMLTextAreaElement
  );
}

function toPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toPositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function toNonNegativeInteger(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function getMetrics(products: Product[], movements: ReturnType<typeof useStockStore.getState>["movements"]) {
  return {
    stock: products.reduce((sum, product) => sum + product.stock, 0),
    sales: movements.filter((movement) => movement.type === "venta").reduce((sum, movement) => sum + movement.amount, 0),
  };
}

function downloadPricePdf(products: Product[]) {
  const date = today();
  const pdf = createPriceListPdf(products);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lista-precios-clientes-${date}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function createPriceListPdf(products: Product[]) {
  const generatedAt = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date());
  const visibleProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, "es")).slice(0, 28);
  const commands = [
    "1 1 1 rg 0 0 595 842 re f",
    "0.067 0.067 0.067 rg 0 760 595 82 re f",
    "0.129 0.651 0.416 rg 0 756 595 4 re f",
    pdfText("Mates x Vos", 40, 805, 22, "F2", "1 1 1"),
    pdfText("Lista de precios para clientes", 40, 782, 12, "F1", "0.90 0.90 0.88"),
    pdfText(`Actualizada: ${generatedAt}`, 388, 782, 10, "F1", "0.90 0.90 0.88"),
    "0.965 0.965 0.945 rg 40 704 515 34 re f",
    "0.82 0.82 0.78 RG 40 704 515 34 re S",
    pdfText("Producto", 54, 716, 10, "F2", "0.20 0.20 0.18"),
    pdfText("Proveedor", 246, 716, 10, "F2", "0.20 0.20 0.18"),
    pdfText("Ubicacion", 356, 716, 10, "F2", "0.20 0.20 0.18"),
    pdfText("Precio", 500, 716, 10, "F2", "0.20 0.20 0.18"),
  ];

  visibleProducts.forEach((product, index) => {
    const y = 674 - index * 24;
    if (index % 2 === 0) {
      commands.push(`0.992 0.992 0.982 rg 40 ${y - 7} 515 24 re f`);
    }
    commands.push(`0.88 0.88 0.84 RG 40 ${y - 7} 515 24 re S`);
    commands.push(pdfText(truncatePdfText(product.name, 30), 54, y, 10, "F2", "0.08 0.08 0.08"));
    commands.push(pdfText(truncatePdfText(product.brand, 16), 246, y, 9, "F1", "0.25 0.25 0.24"));
    commands.push(pdfText(truncatePdfText(productLocation(product), 18), 356, y, 9, "F1", "0.25 0.25 0.24"));
    commands.push(pdfText(formatPdfCurrency(product.price), 493, y, 10, "F2", "0.08 0.08 0.08"));
  });

  const footerY = 54;
  commands.push("0.965 0.965 0.945 rg 40 34 515 52 re f");
  commands.push("0.82 0.82 0.78 RG 40 34 515 52 re S");
  commands.push(pdfText("Precios sujetos a disponibilidad. Consultar por combos, envios y medios de pago.", 54, footerY + 12, 9, "F1", "0.25 0.25 0.24"));
  commands.push(pdfText(`Productos publicados: ${visibleProducts.length}${products.length > visibleProducts.length ? ` de ${products.length}` : ""}`, 54, footerY - 4, 9, "F2", "0.25 0.25 0.24"));

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n",
    `6 0 obj << /Length ${commands.join("\n").length} >> stream\n${commands.join("\n")}\nendstream endobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function pdfText(value: string, x: number, y: number, size: number, font: "F1" | "F2", color: string) {
  return `${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;
}

function formatPdfCurrency(value: number) {
  return `$ ${Math.round(value).toLocaleString("es-AR")}`;
}

function truncatePdfText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}.` : value;
}

function productLocation(product: Product) {
  return product.location || product.brand || "Sin ubicación";
}

function escapePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
