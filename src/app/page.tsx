"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreVertical,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { AlertToaster } from "@/components/ui/alert-toaster";
import { type AlertType, useAlertStore } from "@/lib/alerts";
import { cn, currency, today } from "@/lib/utils";
import { Movement, Product, type SaleUpdateInput, useStockStore } from "@/lib/store";

type View = "dashboard" | "stock" | "carga" | "ventas" | "precios" | "mayorista";
type LocationName = "Buenos Aires" | "Villa Maria";
type LocationFilter = "todos" | LocationName;
type SaleStatus = "entregado" | "encargado";
type SaleFilter = "todos" | SaleStatus;
type SalePaymentStatus = "pagado" | "no_pagado";
type SalePaymentFilter = "todos" | SalePaymentStatus;
type SaleLineItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  unitPriceInput: string;
  lineTotalInput: string;
  unitCostInput: string;
};
type Notify = (alert: { type: AlertType; title: string; message?: string; persistent?: boolean }) => void;

const LOW_STOCK_LIMIT = 5;
const LOCATIONS: LocationName[] = ["Buenos Aires", "Villa Maria"];
const VENDORS = ["Julian", "Santiago", "Agustina"] as const;
const PAYMENT_METHODS = ["Mercado Pago", "Efectivo", "Transferencia", "Tarjeta", "A definir"] as const;
const SALE_STATUSES: { id: SaleStatus; label: string }[] = [
  { id: "entregado", label: "Entregado" },
  { id: "encargado", label: "Encargado" },
];
const SALE_PAYMENT_STATUSES: { id: SalePaymentStatus; label: string }[] = [
  { id: "pagado", label: "Pagado" },
  { id: "no_pagado", label: "No pagado" },
];

const navItems: { id: View; label: string; short: string; icon: typeof Boxes }[] = [
  { id: "dashboard", label: "Inicio", short: "Inicio", icon: LayoutDashboard },
  { id: "ventas", label: "Ventas", short: "Ventas", icon: ShoppingBag },
  { id: "stock", label: "Stock", short: "Stock", icon: Boxes },
  { id: "carga", label: "Carga", short: "Carga", icon: PackagePlus },
  { id: "precios", label: "Precios", short: "PDF", icon: Download },
  { id: "mayorista", label: "Mayorista", short: "Mayor", icon: Users },
];

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const hydrate = useStockStore((state) => state.hydrate);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (active) setSignedIn(Boolean(payload.authenticated));
      })
      .catch(() => {
        if (active) setSignedIn(false);
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (signedIn) void hydrate();
  }, [hydrate, signedIn]);

  if (!sessionReady) {
    return (
      <>
        <AlertToaster />
        <div className="min-h-screen bg-slate-50" />
      </>
    );
  }

  if (!signedIn) {
    return (
      <>
        <AlertToaster />
        <LoginScreen onLogin={() => setSignedIn(true)} />
      </>
    );
  }

  return (
    <>
      <AlertToaster />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <AppShell view={view} setView={setView} onLogout={() => setSignedIn(false)}>
          {view === "dashboard" && <DashboardView setView={setView} />}
          {view === "stock" && <StockView setView={setView} />}
          {view === "ventas" && <SalesView />}
          {view === "carga" && <PurchasesView />}
          {view === "precios" && <PricesView />}
          {view === "mayorista" && <WholesaleView />}
        </AppShell>
      </main>
    </>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "No se pudo iniciar sesion");
      }

      onLogin();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Mates x Vos</h1>
        <p className="mt-1 text-sm text-slate-500">Stock, ventas y precios.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Input
            label="Clave"
            type="password"
            autoComplete="current-password"
            placeholder="Clave de acceso"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <ErrorMessage text={error} /> : null}
          <Button disabled={loading}>
            <CheckCircle2 className="h-4 w-4" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}

function AppShell({
  view,
  setView,
  onLogout,
  children,
}: {
  view: View;
  setView: (view: View) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const loading = useStockStore((state) => state.loading);
  const storeError = useStockStore((state) => state.error);
  const notify = useAlertStore((state) => state.notify);

  useEffect(() => {
    if (!loading && storeError) {
      notify({ type: "warning", title: "Base de datos no conectada", message: storeError });
    }
  }, [loading, notify, storeError]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    notify({ type: "info", title: "Sesión cerrada" });
    onLogout();
  }

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
      <aside className="hidden w-64 shrink-0 border-r border-teal-950/20 bg-gradient-to-b from-teal-950 via-cyan-950 to-slate-950 p-4 text-white shadow-2xl lg:block">
        <Brand inverse />
        <nav className="mt-6 grid gap-2">
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => navigate(item.id)} />
          ))}
        </nav>
        <Button
          className="mt-6 w-full justify-start border border-white/10 bg-white/5 text-teal-50 hover:bg-white/10 hover:text-white"
          variant="ghost"
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/20" type="button" aria-label="Cerrar menu" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-[82vw] max-w-xs bg-gradient-to-b from-teal-950 via-cyan-950 to-slate-950 p-4 text-white shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <Brand inverse />
              <Button
                variant="ghost"
                size="icon"
                className="text-teal-50 hover:bg-white/10 hover:text-white"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="mt-6 grid gap-2">
              {navItems.map((item) => (
                <NavButton key={item.id} item={item} active={view === item.id} onClick={() => navigate(item.id)} />
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="lg:hidden">
                <Brand compact />
              </div>
              <p className="hidden text-sm text-slate-500 lg:block">Sistema de stock y ventas</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </header>
        <div className="grid gap-4 px-4 py-5 sm:px-6 lg:py-6">
          {!loading && storeError ? <ConnectionMessage text={storeError} /> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

function Brand({ compact, inverse }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "truncate font-semibold tracking-tight",
          compact ? "text-base" : "text-lg",
          inverse ? "text-white" : "text-slate-950",
        )}
      >
        Mates x Vos
      </p>
      {!compact ? (
        <p className={cn("text-xs", inverse ? "text-teal-100/80" : "text-slate-500")}>
          Inventario por sucursal
        </p>
      ) : null}
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: View; label: string; icon: typeof Boxes };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
        active
          ? "bg-white text-teal-950 shadow-lg shadow-black/20"
          : "border border-transparent text-teal-50/80 hover:border-white/10 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </button>
  );
}

function DashboardView({ setView }: { setView: (view: View) => void }) {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const metrics = useMemo(() => getMetrics(products, movements), [products, movements]);
  const stockByLocation = LOCATIONS.map((location) => ({
    location,
    stock: products
      .filter((product) => productLocation(product) === location)
      .reduce((sum, product) => sum + product.stock, 0),
  }));
  const lowProducts = products.filter((product) => product.stock <= LOW_STOCK_LIMIT);
  const recent = movements.slice(0, 6);

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Inicio"
        description="Resumen rapido del negocio."
        action={
          <Button onClick={() => setView("ventas")}>
            <Plus className="h-4 w-4" />
            Nueva venta
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Productos" value={String(products.length)} />
        <SummaryCard label="Buenos Aires" value={`${stockByLocation[0]?.stock ?? 0} u.`} />
        <SummaryCard label="Villa Maria" value={`${stockByLocation[1]?.stock ?? 0} u.`} />
        <SummaryCard label="Ventas" value={currency(metrics.sales)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel title="Stock bajo" subtitle="Productos para revisar">
          <div className="divide-y divide-slate-100">
            {lowProducts.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-slate-500">{productLocation(product)}</p>
                </div>
                <StockPill product={product} />
              </div>
            ))}
            {!lowProducts.length ? <EmptyState title="Todo bien" text="No hay productos con stock bajo." /> : null}
          </div>
        </Panel>

        <Panel title="Actividad reciente" subtitle="Ultimos movimientos">
          <ActivityList movements={recent} />
        </Panel>
      </div>
    </section>
  );
}

function StockView({ setView }: { setView: (view: View) => void }) {
  const products = useStockStore((state) => state.products);
  const addProduct = useStockStore((state) => state.addProduct);
  const updateProduct = useStockStore((state) => state.updateProduct);
  const deleteProduct = useStockStore((state) => state.deleteProduct);
  const updateStock = useStockStore((state) => state.updateStock);
  const notify = useAlertStore((state) => state.notify);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("todos");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("todos");
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = products
    .filter((product) => {
      const query = `${product.name} ${product.brand} ${productLocation(product)}`.toLowerCase();
      const matches = query.includes(search.toLowerCase());
      const locationOk = locationMatches(product, locationFilter);
      const statusOk =
        stockFilter === "todos" ||
        (stockFilter === "bajo" && product.stock <= LOW_STOCK_LIMIT) ||
        (stockFilter === "ok" && product.stock > LOW_STOCK_LIMIT);
      return matches && locationOk && statusOk;
    })
    .sort(compareProductsByLocation);

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Stock"
        description="Productos, precios y ubicacion."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Producto
          </Button>
        }
      />

      <Panel>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto" />
          <LocationFilterSelect value={locationFilter} onChange={setLocationFilter} label="Todas" />
          <Select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filtro de stock">
            <option value="todos">Todos</option>
            <option value="ok">Stock OK</option>
            <option value="bajo">Stock bajo</option>
          </Select>
          <Button variant="secondary" onClick={() => setView("carga")}>
            <PackagePlus className="h-4 w-4" />
            Cargar stock
          </Button>
        </div>
      </Panel>

      <StockLocationReference />

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Foto</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Ubicacion</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Costo</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Mayorista</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((product) => (
              <tr key={product.id} className={stockLocationRowClass(productLocation(product))}>
                <td className="px-4 py-3"><ProductThumb product={product} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    <LocationBadge location={productLocation(product)} />
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{product.brand}</td>
                <td className="px-4 py-3"><LocationBadge location={productLocation(product)} /></td>
                <td className="px-4 py-3">
                  <StockEditor product={product} onSave={(stock) => void saveStock(product, stock, updateStock, notify)} />
                </td>
                <td className="px-4 py-3 font-medium">{currency(product.cost)}</td>
                <td className="px-4 py-3 font-medium">{currency(product.price)}</td>
                <td className="px-4 py-3 font-medium">{product.wholesalePrice ? currency(product.wholesalePrice) : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="icon" onClick={() => { setEditing(product); setModalOpen(true); }} aria-label="Editar producto">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void confirmDelete(product, deleteProduct, notify)} aria-label="Eliminar producto">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <EmptyState title="Sin productos" text="Agrega productos para empezar." /> : null}
      </div>

      <div className="grid gap-3 md:hidden">
        {filtered.map((product) => (
          <article key={product.id} className={cn("rounded-xl border p-4 shadow-sm", stockLocationCardClass(productLocation(product)))}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <ProductThumb product={product} />
                <div className="min-w-0">
                  <p className="break-words font-medium">{product.name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-slate-500">{product.brand}</p>
                    <LocationBadge location={productLocation(product)} />
                  </div>
                </div>
              </div>
              <StockPill product={product} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Info label="Costo" value={currency(product.cost)} />
              <Info label="Precio" value={currency(product.price)} />
              <Info label="Mayorista" value={product.wholesalePrice ? currency(product.wholesalePrice) : "-"} />
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
              <StockEditor product={product} onSave={(stock) => void saveStock(product, stock, updateStock, notify)} />
              <Button variant="secondary" size="icon" onClick={() => { setEditing(product); setModalOpen(true); }} aria-label="Editar producto">
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void confirmDelete(product, deleteProduct, notify)} aria-label="Eliminar producto">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </article>
        ))}
        {!filtered.length ? <EmptyState title="Sin productos" text="Agrega productos para empezar." /> : null}
      </div>

      <ProductModal
        open={modalOpen}
        product={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={async (values) => {
          if (editing) {
            await updateProduct(editing.id, values);
            notify({ type: "success", title: "Producto actualizado", message: values.name });
          } else {
            await addProduct(values);
            notify({ type: "success", title: "Producto creado", message: values.name });
          }
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </section>
  );
}

function SalesView() {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const registerSale = useStockStore((state) => state.registerSale);
  const updateSale = useStockStore((state) => state.updateSale);
  const updateSaleStatus = useStockStore((state) => state.updateSaleStatus);
  const updateSalePaymentStatus = useStockStore((state) => state.updateSalePaymentStatus);
  const deleteMovement = useStockStore((state) => state.deleteMovement);
  const notify = useAlertStore((state) => state.notify);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Movement | null>(null);
  const [actionMenuId, setActionMenuId] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleFilter>("todos");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<SalePaymentFilter>("todos");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("todos");
  const [saleLocation, setSaleLocation] = useState<LocationName>("Buenos Aires");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [salePrice, setSalePrice] = useState("");
  const [seller, setSeller] = useState<(typeof VENDORS)[number]>("Julian");
  const [payment, setPayment] = useState("Mercado Pago");
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState<SaleStatus>("entregado");
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>("pagado");
  const [date, setDate] = useState(today());
  const [cart, setCart] = useState<SaleLineItem[]>([]);
  const selected = products.find((product) => product.id === productId);
  const selectedId = selected?.id;
  const selectedPrice = selected?.price;
  const saleProducts = useMemo(
    () => products.filter((product) => productLocation(product) === saleLocation),
    [products, saleLocation],
  );
  const quantityValue = toPositiveInteger(quantity);
  const parsedSalePrice = parseOptionalPrice(salePrice);
  const effectiveUnitPrice = parsedSalePrice ?? selected?.price ?? 0;
  const lineTotal = effectiveUnitPrice * quantityValue;
  const cartTotal = cart.reduce((sum, item) => {
    const unitPrice = parseOptionalPrice(item.unitPriceInput) ?? item.unitPrice;
    return sum + item.quantity * unitPrice;
  }, 0);
  const cartProfit = cart.reduce((sum, item) => {
    const unitPrice = parseOptionalPrice(item.unitPriceInput) ?? item.unitPrice;
    const unitCost = parseOptionalPrice(item.unitCostInput) ?? item.unitCost;
    return sum + (unitPrice - unitCost) * item.quantity;
  }, 0);
  const sales = movements.filter((movement) => movement.type === "venta");
  const visibleSales = sales.filter((sale) => {
    const statusOk = statusFilter === "todos" || saleStatus(sale) === statusFilter;
    const paymentStatusOk = paymentStatusFilter === "todos" || salePaymentStatus(sale) === paymentStatusFilter;
    const locationOk = movementMatchesLocation(sale, products, locationFilter);
    return statusOk && paymentStatusOk && locationOk;
  });

  useEffect(() => {
    if (saleProducts.some((product) => product.id === productId)) return;
    setProductId(saleProducts[0]?.id ?? "");
  }, [productId, saleProducts]);

  useEffect(() => {
    setSalePrice(selectedPrice ? String(selectedPrice) : "");
  }, [selectedId, selectedPrice]);

  function resetSaleForm() {
    setCart([]);
    setQuantity("1");
    setSalePrice(selectedPrice ? String(selectedPrice) : "");
    setCustomer("");
    setStatus("entregado");
    setPaymentStatus("pagado");
  }

  function addLineToCart() {
    if (!selected) return;
    const parsedPrice = parseOptionalPrice(salePrice);
    if (!parsedPrice) {
      notify({ type: "warning", title: "Ingresá un precio de venta válido" });
      return;
    }
    if (quantityValue <= 0) {
      notify({ type: "warning", title: "Ingresá una cantidad válida" });
      return;
    }

    setCart((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        productId,
        quantity: quantityValue,
        unitPrice: parsedPrice,
        unitCost: selected.cost,
        unitPriceInput: salePrice,
        lineTotalInput: String(Math.round(parsedPrice * quantityValue)),
        unitCostInput: String(selected.cost),
      },
    ]);
    setQuantity("1");
  }

  function removeLineFromCart(lineId: string) {
    setCart((items) => items.filter((item) => item.id !== lineId));
  }

  function updateCartLineUnitPrice(lineId: string, value: string) {
    setCart((items) =>
      items.map((item) => {
        if (item.id !== lineId) return item;
        const parsed = parseOptionalPrice(value);
        return {
          ...item,
          unitPriceInput: value,
          unitPrice: parsed ?? item.unitPrice,
          lineTotalInput: parsed ? String(Math.round(parsed * item.quantity)) : item.lineTotalInput,
        };
      }),
    );
  }

  function updateCartLineTotal(lineId: string, value: string) {
    setCart((items) =>
      items.map((item) => {
        if (item.id !== lineId) return item;
        const parsed = parseOptionalPrice(value);
        const unitPrice = parsed && item.quantity > 0 ? parsed / item.quantity : item.unitPrice;
        return {
          ...item,
          lineTotalInput: value,
          unitPrice,
          unitPriceInput: parsed && item.quantity > 0 ? String(Math.round(unitPrice)) : item.unitPriceInput,
        };
      }),
    );
  }

  function updateCartLineUnitCost(lineId: string, value: string) {
    setCart((items) =>
      items.map((item) => {
        if (item.id !== lineId) return item;
        const parsed = parseOptionalPrice(value);
        return {
          ...item,
          unitCostInput: value,
          unitCost: parsed ?? item.unitCost,
        };
      }),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!cart.length) {
      notify({ type: "warning", title: "Agregá al menos un producto a la venta" });
      return;
    }

    const saleMeta = {
      seller,
      payment,
      customer: customer.trim() || undefined,
      date,
      status,
      paymentStatus,
    };

    for (const item of cart) {
      const product = products.find((entry) => entry.id === item.productId);
      const unitPrice = parseOptionalPrice(item.unitPriceInput);
      const unitCost = parseOptionalPrice(item.unitCostInput);
      if (!unitPrice || !unitCost) {
        notify({ type: "warning", title: "Revisá precios y costos", message: product?.name });
        return;
      }

      const ok = await registerSale({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        ...saleMeta,
      });
      if (!ok) {
        notify({ type: "warning", title: "No hay stock suficiente", message: product?.name });
        return;
      }
    }

    const productNames = cart
      .map((item) => products.find((entry) => entry.id === item.productId)?.name)
      .filter(Boolean)
      .join(", ");
    notify({
      type: "success",
      title: status === "encargado" ? "Encargo registrado" : "Venta registrada",
      message: productNames,
    });
    setModalOpen(false);
    resetSaleForm();
  }

  async function changeSaleStatus(sale: Movement, nextStatus: SaleStatus) {
    await updateSaleStatus(sale.id, nextStatus);
    notify({ type: "success", title: "Estado actualizado", message: nextStatus === "encargado" ? "Encargado" : "Entregado" });
  }

  async function changeSalePaymentStatus(sale: Movement, nextPaymentStatus: SalePaymentStatus) {
    await updateSalePaymentStatus(sale.id, nextPaymentStatus);
    notify({
      type: "success",
      title: "Pago actualizado",
      message: nextPaymentStatus === "pagado" ? "Pagado" : "No pagado",
    });
  }

  async function saveSaleEdit(sale: Movement, input: SaleUpdateInput) {
    const ok = await updateSale(sale.id, input);
    if (!ok) {
      notify({
        type: "error",
        title: "No se pudo guardar la venta",
        message: "Revisá que esté aplicado el SQL de cliente en Supabase.",
      });
      return;
    }
    notify({
      type: "success",
      title: "Venta actualizada",
      message: `${input.customer?.trim() || "Sin cliente"} - ${saleProductLabel(sale, products)}`,
    });
    setEditingSale(null);
  }

  function openSaleEdit(sale: Movement) {
    setEditingSale(sale);
    setActionMenuId("");
  }

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Ventas"
        description="Ventas y encargos."
        action={
          <Button onClick={() => setModalOpen(true)} disabled={!products.length}>
            <Plus className="h-4 w-4" />
            Venta
          </Button>
        }
      />

      <Panel>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px] lg:items-center">
          <div className="flex flex-wrap gap-2">
            <SummaryPill label="Total" value={String(visibleSales.length)} />
            <SummaryPill label="Encargos" value={String(sales.filter((sale) => saleStatus(sale) === "encargado").length)} />
            <SummaryPill label="Pagadas" value={String(sales.filter((sale) => salePaymentStatus(sale) === "pagado").length)} />
            <SummaryPill label="Vendido" value={currency(visibleSales.reduce((sum, sale) => sum + sale.amount, 0))} />
          </div>
          <LocationFilterSelect value={locationFilter} onChange={setLocationFilter} label="Todas" />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SaleFilter)} aria-label="Filtrar ventas">
            <option value="todos">Todos</option>
            {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </Select>
          <Select
            value={paymentStatusFilter}
            onChange={(event) => setPaymentStatusFilter(event.target.value as SalePaymentFilter)}
            aria-label="Filtrar por pago"
          >
            <option value="todos">Todos los pagos</option>
            {SALE_PAYMENT_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </Select>
        </div>
      </Panel>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Venta</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Cobro</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleSales.map((sale) => (
              <tr
                key={sale.id}
                className={cn(
                  "transition",
                  salePaymentStatus(sale) === "pagado" ? "bg-emerald-50/70 hover:bg-emerald-50" : "hover:bg-slate-50",
                )}
              >
                <td className="px-4 py-3">
                  <SaleSummary sale={sale} products={products} />
                </td>
                <td className="px-4 py-3 text-slate-600">{sale.date}</td>
                <td className="px-4 py-3 text-slate-600">{sale.payment ?? "-"}</td>
                <td className="px-4 py-3">
                  <SalePaymentStatusSelect
                    value={salePaymentStatus(sale)}
                    onChange={(nextPaymentStatus) => void changeSalePaymentStatus(sale, nextPaymentStatus)}
                  />
                </td>
                <td className="px-4 py-3">
                  <SaleStatusSelect value={saleStatus(sale)} onChange={(nextStatus) => void changeSaleStatus(sale, nextStatus)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-medium">{currency(sale.amount)}</p>
                  <p className="mt-0.5 text-xs font-semibold text-emerald-700">+{currency(sale.profit)}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <SaleActionMenu
                      open={actionMenuId === sale.id}
                      onToggle={() => setActionMenuId(actionMenuId === sale.id ? "" : sale.id)}
                      onEdit={() => openSaleEdit(sale)}
                      onDelete={() => {
                        setActionMenuId("");
                        void removeSale(sale, deleteMovement, notify);
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleSales.length ? <EmptyState title="Sin ventas" text="Registra una venta nueva." /> : null}
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleSales.map((sale) => (
          <SaleCard
            key={sale.id}
            sale={sale}
            products={products}
            location={movementLocation(sale, products)}
            actionMenuOpen={actionMenuId === sale.id}
            onActionMenuToggle={() => setActionMenuId(actionMenuId === sale.id ? "" : sale.id)}
            onEdit={() => openSaleEdit(sale)}
            onDelete={() => {
              setActionMenuId("");
              void removeSale(sale, deleteMovement, notify);
            }}
            onStatusChange={(nextStatus) => void changeSaleStatus(sale, nextStatus)}
            onPaymentStatusChange={(nextPaymentStatus) => void changeSalePaymentStatus(sale, nextPaymentStatus)}
          />
        ))}
        {!visibleSales.length ? <EmptyState title="Sin ventas" text="Registra una venta nueva." /> : null}
      </div>

      <Button className="fixed bottom-6 right-4 z-30 rounded-full shadow-lg md:hidden" onClick={() => setModalOpen(true)} disabled={!products.length}>
        <Plus className="h-5 w-5" />
        Venta
      </Button>

      <Modal
        open={modalOpen}
        title="Agregar venta"
        subtitle="Formulario rapido"
        onClose={() => {
          setModalOpen(false);
          resetSaleForm();
        }}
      >
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
          <Select label="Ubicacion" value={saleLocation} onChange={(event) => setSaleLocation(event.target.value as LocationName)}>
            {LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}
          </Select>
          <Select label="Producto" value={productId} required onChange={(event) => setProductId(event.target.value)}>
            {saleProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - {product.stock} u.</option>)}
          </Select>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Input label="Precio venta" required type="number" min={1} step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} />
            <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Disponible</span>
              <span className="font-medium">{selected?.stock ?? 0} u.</span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-slate-500">Precio lista</span>
              <span className="font-medium">{currency(selected?.price ?? 0)}</span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">{currency(lineTotal)}</span>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={addLineToCart} disabled={!saleProducts.length}>
            <Plus className="h-4 w-4" />
            Agregar producto
          </Button>
          {cart.length ? (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Productos en la venta</p>
              {cart.map((item) => {
                const product = products.find((entry) => entry.id === item.productId);
                const unitPrice = parseOptionalPrice(item.unitPriceInput) ?? item.unitPrice;
                const unitCost = parseOptionalPrice(item.unitCostInput) ?? item.unitCost;
                const lineTotalAmount = item.quantity * unitPrice;
                const lineProfit = (unitPrice - unitCost) * item.quantity;
                return (
                  <div key={item.id} className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{product?.name ?? "Producto"}</p>
                        <p className="text-slate-500">{item.quantity} u.</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLineFromCart(item.id)} aria-label="Quitar producto">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        label="Precio unitario"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPriceInput}
                        onChange={(event) => updateCartLineUnitPrice(item.id, event.target.value)}
                      />
                      <Input
                        label="Precio final"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.lineTotalInput}
                        onChange={(event) => updateCartLineTotal(item.id, event.target.value)}
                      />
                      <Input
                        label="Costo unitario"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitCostInput}
                        onChange={(event) => updateCartLineUnitCost(item.id, event.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">Subtotal {currency(lineTotalAmount)}</span>
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                        Ganancia {currency(lineProfit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Estado"
              value={status}
              className={saleStatusSelectClass(status)}
              onChange={(event) => setStatus(event.target.value as SaleStatus)}
            >
              {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </Select>
            <Select label="Pago" value={payment} onChange={(event) => setPayment(event.target.value)}>
              {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
            </Select>
            <Select
              label="Estado de pago"
              value={paymentStatus}
              className={salePaymentStatusSelectClass(paymentStatus)}
              onChange={(event) => setPaymentStatus(event.target.value as SalePaymentStatus)}
            >
              {SALE_PAYMENT_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </Select>
          </div>
          <Select label="Vendedor" value={seller} onChange={(event) => setSeller(event.target.value as (typeof VENDORS)[number])}>
            {VENDORS.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </Select>
          <Input
            label="Cliente (opcional)"
            placeholder="Nombre del cliente"
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Total venta</span>
              <span className="font-medium">{currency(cartTotal)}</span>
            </div>
            <div className="mt-2 flex justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="font-medium text-emerald-800">Ganancia estimada</span>
              <span className="font-semibold text-emerald-700">{currency(cartProfit)}</span>
            </div>
          </div>
          <Button disabled={!cart.length}>
            <ShoppingBag className="h-4 w-4" />
            Guardar venta
          </Button>
        </form>
      </Modal>

      <SaleEditModal
        sale={editingSale}
        products={products}
        onClose={() => setEditingSale(null)}
        onInvalid={(message) => notify({ type: "warning", title: message })}
        onSubmit={(input) => {
          if (editingSale) void saveSaleEdit(editingSale, input);
        }}
      />
    </section>
  );
}

function PurchasesView() {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const registerPurchase = useStockStore((state) => state.registerPurchase);
  const notify = useAlertStore((state) => state.notify);
  const [stockLocation, setStockLocation] = useState<LocationName>("Buenos Aires");
  const locationProducts = useMemo(
    () => products.filter((product) => productLocation(product) === stockLocation),
    [products, stockLocation],
  );
  const [productId, setProductId] = useState(locationProducts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(locationProducts[0] ? String(locationProducts[0].cost) : "");
  const [date, setDate] = useState(today());
  const selected = locationProducts.find((product) => product.id === productId);
  const purchases = movements
    .filter((movement) => movement.type === "compra" && movementMatchesLocation(movement, products, stockLocation))
    .slice(0, 8);

  useEffect(() => {
    if (locationProducts.some((product) => product.id === productId)) return;
    const nextProduct = locationProducts[0];
    setProductId(nextProduct?.id ?? "");
    setUnitCost(nextProduct ? String(nextProduct.cost) : "");
  }, [productId, locationProducts]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const quantityValue = toPositiveInteger(quantity);
    const costValue = toPositiveNumber(unitCost);
    await registerPurchase({ productId, quantity: quantityValue, unitCost: costValue, date });
    notify({ type: "success", title: "Stock actualizado", message: selected?.name });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-5">
        <PageHeader title="Carga" description="Ingreso rapido de mercaderia." />
        <Panel title="Agregar stock">
          <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
            <Select label="Ubicacion" value={stockLocation} onChange={(event) => setStockLocation(event.target.value as LocationName)}>
              {LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}
            </Select>
            <Select label="Producto" value={productId} required onChange={(event) => { const product = locationProducts.find((item) => item.id === event.target.value); setProductId(event.target.value); setUnitCost(product ? String(product.cost) : ""); }}>
              {locationProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </Select>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              <Input label="Costo unitario" required type="number" min={1} value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
            </div>
            <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Producto</span>
                <span className="font-medium">{selected?.name ?? "-"}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Stock actual</span>
                <span className="font-medium">{selected?.stock ?? 0} u.</span>
              </div>
            </div>
            <Button disabled={!locationProducts.length}>
              <PackagePlus className="h-4 w-4" />
              Guardar carga
            </Button>
          </form>
        </Panel>
      </div>

      <Panel title="Historial de compras" subtitle="Ultimos ingresos">
        <ActivityList movements={purchases} />
      </Panel>
    </section>
  );
}

function PricesView() {
  const products = useStockStore((state) => state.products);
  const notify = useAlertStore((state) => state.notify);
  const [generating, setGenerating] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("todos");
  const availableProducts = products
    .filter((product) => product.stock > 0 && locationMatches(product, locationFilter))
    .sort(compareProductsByLocation);

  async function handleDownload() {
    setGenerating(true);
    try {
      await downloadPricePdf(availableProducts, "retail");
      notify({ type: "success", title: "PDF generado", message: `${availableProducts.length} productos` });
    } catch {
      notify({ type: "error", title: "No pudimos generar el PDF", message: "Intentá de nuevo en unos segundos" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid gap-5">
        <PageHeader title="Precios" description="Lista simple para clientes." />
        <Panel title="PDF">
          <div className="mb-3">
            <LocationFilterSelect value={locationFilter} onChange={setLocationFilter} label="Todas" />
          </div>
          <Button className="w-full" disabled={!availableProducts.length || generating} onClick={() => void handleDownload()}>
            <Download className="h-4 w-4" />
            {generating ? "Generando..." : "Descargar PDF"}
          </Button>
        </Panel>
      </div>

      <Panel title="Vista previa" subtitle={`${availableProducts.length} productos disponibles`}>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {availableProducts.map((product) => (
            <div key={product.id} className="grid gap-3 p-3 sm:grid-cols-[48px_1fr_auto] sm:items-center">
              <ProductThumb product={product} />
              <div className="min-w-0">
                <p className="font-medium">{product.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-500">{product.brand}</p>
                  <LocationBadge location={productLocation(product)} />
                </div>
              </div>
              <p className="font-medium">{currency(product.price)}</p>
            </div>
          ))}
          {!availableProducts.length ? <EmptyState title="Sin productos" text="Carga stock para crear la lista." /> : null}
        </div>
      </Panel>
    </section>
  );
}

function WholesaleView() {
  const products = useStockStore((state) => state.products);
  const notify = useAlertStore((state) => state.notify);
  const [generating, setGenerating] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("todos");
  
  // Tabs: "lista" | "presupuestador"
  const [activeTab, setActiveTab] = useState<"lista" | "presupuestador">("lista");
  
  // Quote Builder States
  const [clientName, setClientName] = useState("");
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  
  // Form states for adding items
  const [selectedProductId, setSelectedProductId] = useState<string>("custom");
  const [customItemName, setCustomItemName] = useState("");
  const [addItemQty, setAddItemQty] = useState("1");
  const [addItemPrice, setAddItemPrice] = useState("");

  const wholesaleProducts = products
    .filter((product) => product.stock > 0 && product.wholesalePrice && locationMatches(product, locationFilter))
    .sort(compareProductsByLocation);
  const missingPrice = products.filter((product) => product.stock > 0 && !product.wholesalePrice).length;

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProduct) {
      setAddItemPrice(String(selectedProduct.wholesalePrice ?? selectedProduct.price));
      setCustomItemName("");
    } else if (selectedProductId === "custom") {
      setAddItemPrice("");
      setCustomItemName("");
    }
  }, [selectedProductId, selectedProduct]);

  function handleAddItem(event: FormEvent) {
    event.preventDefault();
    const qty = toPositiveInteger(addItemQty);

    if (selectedProductId === "custom") {
      if (!customItemName.trim()) {
        notify({ type: "error", title: "Error", message: "Escribí el nombre del ítem personalizado." });
        return;
      }
      const priceVal = toPositiveNumber(addItemPrice);
      if (priceVal <= 0) {
        notify({ type: "error", title: "Error", message: "Ingresá un precio válido." });
        return;
      }
      setQuoteItems((current) => [
        ...current,
        {
          id: `custom-${crypto.randomUUID()}`,
          name: customItemName.trim(),
          brand: "Personalizado",
          location: "N/A",
          quantity: qty,
          price: priceVal,
          priceInput: addItemPrice,
          imageUrl: undefined,
        },
      ]);
      setCustomItemName("");
      setAddItemQty("1");
      setAddItemPrice("");
    } else {
      if (!selectedProduct) return;
      const priceVal = toPositiveNumber(addItemPrice);
      if (priceVal <= 0) {
        notify({ type: "error", title: "Error", message: "Ingresá un precio válido." });
        return;
      }

      const existsIndex = quoteItems.findIndex((item) => item.productId === selectedProduct.id);
      if (existsIndex > -1) {
        setQuoteItems((current) => {
          const updated = [...current];
          updated[existsIndex].quantity += qty;
          updated[existsIndex].price = priceVal;
          updated[existsIndex].priceInput = addItemPrice;
          return updated;
        });
      } else {
        setQuoteItems((current) => [
          ...current,
          {
            id: selectedProduct.id,
            productId: selectedProduct.id,
            name: selectedProduct.name,
            brand: selectedProduct.brand,
            location: selectedProduct.location,
            quantity: qty,
            price: priceVal,
            priceInput: addItemPrice,
            imageUrl: selectedProduct.imageUrl,
          },
        ]);
      }
      setSelectedProductId("custom");
      setAddItemQty("1");
      setAddItemPrice("");
    }
    notify({ type: "success", title: "Agregado al presupuesto", message: "El producto se sumó correctamente." });
  }

  function updateItemQty(itemId: string, newQtyStr: string) {
    const qty = toPositiveInteger(newQtyStr);
    setQuoteItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, quantity: qty } : item))
    );
  }

  function updateItemPrice(itemId: string, newPriceStr: string) {
    setQuoteItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const parsed = parseOptionalPrice(newPriceStr);
        return {
          ...item,
          priceInput: newPriceStr,
          price: parsed ?? item.price,
        };
      }),
    );
  }

  function removeItem(itemId: string) {
    setQuoteItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function handleDownload() {
    setGenerating(true);
    try {
      await downloadPricePdf(wholesaleProducts, "wholesale");
      notify({ type: "success", title: "PDF mayorista generado", message: `${wholesaleProducts.length} productos` });
    } catch {
      notify({ type: "error", title: "No pudimos generar el PDF", message: "Revisá las imágenes o intentá de nuevo" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadQuote() {
    if (!quoteItems.length) return;
    setGenerating(true);
    try {
      const formattedItems = quoteItems.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        location: item.location,
        imageUrl: item.imageUrl,
        price: item.price,
        wholesalePrice: item.price,
        quantity: item.quantity,
        cost: 0,
        stock: 9999,
        minStock: 0,
        sold: 0,
      }));

      await downloadPricePdf(formattedItems, "quote", clientName.trim() || "Cliente Mayorista");
      notify({ type: "success", title: "Presupuesto generado", message: `${quoteItems.length} ítems cargados` });
    } catch {
      notify({ type: "error", title: "No pudimos generar el PDF", message: "Revisá las imágenes o intentá de nuevo" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <PageHeader title="Módulo Mayorista" description="Gestión de catálogo y presupuestador para clientes." />
        <div className="flex gap-2 rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              activeTab === "lista" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => setActiveTab("lista")}
          >
            Lista de Precios
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              activeTab === "presupuestador" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => setActiveTab("presupuestador")}
          >
            Armar Presupuesto
          </button>
        </div>
      </div>

      {activeTab === "lista" ? (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-5">
            <Panel title="PDF mayorista" subtitle={missingPrice ? `${missingPrice} productos sin precio mayorista` : "Lista lista para compartir"}>
              <div className="mb-3">
                <LocationFilterSelect value={locationFilter} onChange={setLocationFilter} label="Todas" />
              </div>
              <Button className="w-full" disabled={!wholesaleProducts.length || generating} onClick={() => void handleDownload()}>
                <Download className="h-4 w-4" />
                {generating ? "Generando..." : "Descargar PDF"}
              </Button>
            </Panel>
          </div>

          <Panel title="Lista mayorista" subtitle={`${wholesaleProducts.length} productos disponibles`}>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
              {wholesaleProducts.map((product) => (
                <div key={product.id} className="grid gap-3 p-3 sm:grid-cols-[48px_1fr_auto] sm:items-center">
                  <ProductThumb product={product} />
                  <div className="min-w-0">
                    <p className="font-medium">{product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-slate-500">{product.brand}</p>
                      <LocationBadge location={productLocation(product)} />
                      <p className="text-sm text-slate-500">{product.stock} u.</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-medium">{currency(product.wholesalePrice ?? product.price)}</p>
                    <p className="text-xs text-slate-500">Minorista {currency(product.price)}</p>
                  </div>
                </div>
              ))}
              {!wholesaleProducts.length ? <EmptyState title="Sin productos mayoristas" text="Agrega precio mayorista en cada producto." /> : null}
            </div>
          </Panel>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-5 self-start">
            <Panel title="Detalles del Cliente" subtitle="Cargá los datos del presupuesto.">
              <Input
                label="Cliente / Razón Social"
                placeholder="Ej. Juan Pérez - Distribuidora Sur"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </Panel>

            <Panel title="Agregar Ítem" subtitle="Sumá un producto o un detalle libre.">
              <form onSubmit={handleAddItem} className="grid gap-4">
                <Select
                  label="Producto"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="custom">— Ítem personalizado —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({productLocation(p)}) - ${p.wholesalePrice ?? p.price} - Stock: {p.stock}
                    </option>
                  ))}
                </Select>

                {selectedProductId === "custom" && (
                  <Input
                    label="Descripción del ítem"
                    required
                    placeholder="Ej. Caja 20 kilos de Baldo"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Cantidad"
                    type="number"
                    min="1"
                    required
                    value={addItemQty}
                    onChange={(e) => setAddItemQty(e.target.value)}
                  />
                  <Input
                    label="Precio Unitario"
                    type="number"
                    min="1"
                    required
                    placeholder="Ej. 100000"
                    value={addItemPrice}
                    onChange={(e) => setAddItemPrice(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" />
                  Agregar al Presupuesto
                </Button>
              </form>
            </Panel>
          </div>

          <Panel
            title="Presupuesto Actual"
            subtitle={clientName ? `Para: ${clientName}` : "Agregá ítems para calcular el total"}
          >
            <div className="grid gap-4">
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/50">
                {quoteItems.map((item) => (
                  <div key={item.id} className="grid gap-3 p-3 sm:grid-cols-[48px_1fr_auto_auto] sm:items-center">
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-full w-full object-cover" src={item.imageUrl} alt={item.name} />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.brand} - {item.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="grid w-20">
                        <label className="text-[10px] uppercase text-slate-400 font-semibold mb-0.5">Cant.</label>
                        <input
                          type="number"
                          min="1"
                          className="h-8 w-full rounded border border-slate-200 bg-white px-1.5 text-sm text-center outline-none focus:border-slate-400"
                          value={item.quantity}
                          onChange={(e) => updateItemQty(item.id, e.target.value)}
                          aria-label={`Cantidad para ${item.name}`}
                        />
                      </div>
                      <div className="grid w-24">
                        <label className="text-[10px] uppercase text-slate-400 font-semibold mb-0.5">Unitario ($)</label>
                        <input
                          type="number"
                          min="1"
                          className="h-8 w-full rounded border border-slate-200 bg-white px-1.5 text-sm outline-none focus:border-slate-400"
                          value={item.priceInput ?? String(item.price)}
                          onChange={(e) => updateItemPrice(item.id, e.target.value)}
                          aria-label={`Precio unitario para ${item.name}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right min-w-[70px]">
                        <p className="text-[10px] uppercase text-slate-400 font-semibold">Total</p>
                        <p className="font-semibold text-slate-900">{currency(item.price * item.quantity)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Eliminar item ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {quoteItems.length === 0 && (
                  <EmptyState
                    title="Presupuesto vacío"
                    text="Cargá ítems usando el formulario de la izquierda."
                  />
                )}
              </div>

              {quoteItems.length > 0 && (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50/50 p-4">
                    <div>
                      <p className="text-sm text-teal-800 font-medium">Total Presupuestado</p>
                      <p className="text-xs text-slate-500 mt-0.5">{quoteItems.length} ítems en total</p>
                    </div>
                    <p className="text-2xl font-bold text-teal-950">
                      {currency(quoteItems.reduce((acc, item) => acc + item.price * item.quantity, 0))}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="w-1/3"
                      onClick={() => {
                        if (confirm("¿Estás seguro de que querés limpiar el presupuesto actual?")) {
                          setQuoteItems([]);
                        }
                      }}
                    >
                      Limpiar
                    </Button>
                    <Button
                      className="w-2/3"
                      disabled={generating}
                      onClick={() => void handleDownloadQuote()}
                    >
                      <Download className="h-4 w-4" />
                      {generating ? "Generando..." : "Descargar Presupuesto PDF"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}
    </section>
  );
}

function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0">{action}</div> : null}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {title ? (
        <div className="mb-4">
          <h2 className="font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warning" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight", tone === "warning" && "text-amber-700", tone === "ok" && "text-emerald-700")}>{value}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input className="pl-9" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function LocationFilterSelect({
  value,
  onChange,
  label,
}: {
  value: LocationFilter;
  onChange: (value: LocationFilter) => void;
  label: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as LocationFilter)} aria-label="Filtrar por ubicacion">
      <option value="todos">{label}</option>
      {LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}
    </Select>
  );
}

function StockLocationReference() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
      {LOCATIONS.map((location) => (
        <LocationBadge key={location} location={location} />
      ))}
    </div>
  );
}

function LocationBadge({ location }: { location: LocationName }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", locationBadgeClass(location))}>
      {location}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}

function ProductThumb({ product }: { product: Product }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="h-full w-full object-cover" src={product.imageUrl} alt={product.name} />
      ) : (
        <ImageIcon className="h-5 w-5 text-slate-400" />
      )}
    </div>
  );
}

function stockLocationRowClass(location: LocationName) {
  return location === "Villa Maria"
    ? "bg-amber-50/90 hover:bg-amber-100"
    : "bg-sky-50/90 hover:bg-sky-100";
}

function stockLocationCardClass(location: LocationName) {
  return location === "Villa Maria"
    ? "border-amber-200 bg-amber-50/90"
    : "border-sky-200 bg-sky-50/90";
}

function locationBadgeClass(location: LocationName) {
  return location === "Villa Maria"
    ? "border-amber-300 bg-amber-100 text-amber-900"
    : "border-sky-300 bg-sky-100 text-sky-900";
}

function StockPill({ product }: { product: Product }) {
  const low = product.stock <= LOW_STOCK_LIMIT;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", low ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
      {product.stock} u.
    </span>
  );
}

function StockEditor({ product, onSave }: { product: Product; onSave: (stock: number) => void }) {
  const [value, setValue] = useState(String(product.stock));

  useEffect(() => {
    setValue(String(product.stock));
  }, [product.stock]);

  function commitStock() {
    const nextStock = toNonNegativeInteger(value);
    setValue(String(nextStock));
    if (nextStock !== product.stock) onSave(nextStock);
  }

  return (
    <input
      className="h-9 w-full max-w-[96px] rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      type="number"
      min={0}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commitStock}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      aria-label={`Stock de ${product.name}`}
    />
  );
}

function SaleCard({
  sale,
  products,
  location,
  actionMenuOpen,
  onActionMenuToggle,
  onEdit,
  onDelete,
  onStatusChange,
  onPaymentStatusChange,
}: {
  sale: Movement;
  products: Product[];
  location: string;
  actionMenuOpen: boolean;
  onActionMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: SaleStatus) => void;
  onPaymentStatusChange: (paymentStatus: SalePaymentStatus) => void;
}) {
  const status = saleStatus(sale);
  const paymentStatus = salePaymentStatus(sale);

  return (
    <article
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        paymentStatus === "pagado" ? "border-emerald-200 bg-emerald-50/80" : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <SalePaymentStatusBadge status={paymentStatus} />
            <SaleStatusBadge status={status} />
          </div>
          <div className="mt-2">
            <SaleSummary sale={sale} products={products} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{sale.date} - {sale.seller ?? "Sin vendedor"} - {location}</p>
        </div>
        <div className="grid justify-items-end gap-2">
          <div className="text-right">
            <p className="shrink-0 font-semibold">{currency(sale.amount)}</p>
            <p className="text-xs font-semibold text-emerald-700">Ganancia {currency(sale.profit)}</p>
          </div>
          <SaleActionMenu open={actionMenuOpen} onToggle={onActionMenuToggle} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SalePaymentStatusSelect value={paymentStatus} onChange={onPaymentStatusChange} />
        <SaleStatusSelect value={status} onChange={onStatusChange} />
      </div>
    </article>
  );
}

function SaleActionMenu({
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="icon" onClick={onToggle} aria-label="Acciones de venta">
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
          >
            <Edit3 className="h-4 w-4" />
            Editar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SaleSummary({ sale, products }: { sale: Movement; products: Product[] }) {
  const unitPrice = saleUnitPrice(sale);
  const product = sale.productId ? products.find((item) => item.id === sale.productId) : undefined;
  const unitCost = saleUnitCost(sale, product);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex max-w-full rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
          <span className="truncate">{sale.customer ? sale.customer : "Sin cliente"}</span>
        </span>
        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Ganancia {currency(sale.profit)}
        </span>
      </div>
      <p className="mt-0.5 break-words text-sm font-medium text-slate-700">
        Producto: {saleProductLabel(sale, products)}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {sale.detail} · Precio final {currency(sale.amount)}
        {sale.quantity && sale.quantity > 1 ? ` (${currency(unitPrice)} c/u)` : ""}
        {" · "}Costo {currency(unitCost)} c/u
      </p>
    </div>
  );
}

function SaleEditModal({
  sale,
  products,
  onClose,
  onSubmit,
  onInvalid,
}: {
  sale: Movement | null;
  products: Product[];
  onClose: () => void;
  onSubmit: (input: SaleUpdateInput) => void;
  onInvalid: (message: string) => void;
}) {
  const [seller, setSeller] = useState<(typeof VENDORS)[number]>("Julian");
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]>("Mercado Pago");
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<SaleStatus>("entregado");
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>("pagado");
  const [unitPrice, setUnitPrice] = useState("");
  const [lineTotal, setLineTotal] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const product = sale?.productId ? products.find((item) => item.id === sale.productId) : undefined;
  const quantity = sale?.quantity ?? 1;
  const parsedUnitPrice = parseOptionalPrice(unitPrice);
  const parsedLineTotal = parseOptionalPrice(lineTotal);
  const parsedUnitCost = parseOptionalPrice(unitCost);
  const effectiveUnitPrice = parsedUnitPrice ?? (sale ? saleUnitPrice(sale) : 0);
  const effectiveLineTotal = parsedLineTotal ?? effectiveUnitPrice * quantity;
  const effectiveUnitCost = parsedUnitCost ?? (sale ? saleUnitCost(sale, product) : product?.cost ?? 0);
  const estimatedProfit = (effectiveUnitPrice - effectiveUnitCost) * quantity;

  useEffect(() => {
    if (!sale) return;
    setSeller(VENDORS.includes(sale.seller as (typeof VENDORS)[number]) ? (sale.seller as (typeof VENDORS)[number]) : "Julian");
    setPayment(
      PAYMENT_METHODS.includes(sale.payment as (typeof PAYMENT_METHODS)[number])
        ? (sale.payment as (typeof PAYMENT_METHODS)[number])
        : "A definir",
    );
    setCustomer(sale.customer ?? "");
    setDate(sale.date);
    setStatus(saleStatus(sale));
    setPaymentStatus(salePaymentStatus(sale));
    const currentUnitPrice = saleUnitPrice(sale);
    const currentUnitCost = saleUnitCost(sale, product);
    setUnitPrice(String(Math.round(currentUnitPrice)));
    setLineTotal(String(Math.round(sale.amount)));
    setUnitCost(String(Math.round(currentUnitCost)));
  }, [sale, product]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!parsedUnitPrice) {
      onInvalid("Ingresá un precio de venta válido");
      return;
    }
    if (!parsedUnitCost) {
      onInvalid("Ingresá un costo válido");
      return;
    }
    onSubmit({
      seller,
      payment,
      customer: customer.trim(),
      date,
      status,
      paymentStatus,
      unitPrice: parsedUnitPrice,
      unitCost: parsedUnitCost,
    });
  }

  return (
    <Modal open={Boolean(sale)} title="Editar venta" subtitle={sale?.detail} onClose={onClose}>
      <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
        <Input label="Cliente (opcional)" value={customer} onChange={(event) => setCustomer(event.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Select label="Vendedor" value={seller} onChange={(event) => setSeller(event.target.value as (typeof VENDORS)[number])}>
            {VENDORS.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </Select>
        </div>
        {sale?.productId ? (
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">{saleProductLabel(sale, products)}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Precio unitario"
                required
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(event) => {
                  const nextUnitPrice = event.target.value;
                  setUnitPrice(nextUnitPrice);
                  const parsed = parseOptionalPrice(nextUnitPrice);
                  if (parsed !== null && quantity > 0) setLineTotal(String(Math.round(parsed * quantity)));
                }}
              />
              <Input
                label="Precio final"
                required
                type="number"
                min={0}
                step="0.01"
                value={lineTotal}
                onChange={(event) => {
                  const nextLineTotal = event.target.value;
                  setLineTotal(nextLineTotal);
                  const parsed = parseOptionalPrice(nextLineTotal);
                  if (parsed !== null && quantity > 0) setUnitPrice(String(Math.round(parsed / quantity)));
                }}
              />
              <Input
                label="Costo unitario"
                required
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Total {currency(effectiveLineTotal)}</span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Ganancia {currency(estimatedProfit)}
              </span>
            </div>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Pago" value={payment} onChange={(event) => setPayment(event.target.value as (typeof PAYMENT_METHODS)[number])}>
            {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
          </Select>
          <Select
            label="Cobro"
            value={paymentStatus}
            className={salePaymentStatusSelectClass(paymentStatus)}
            onChange={(event) => setPaymentStatus(event.target.value as SalePaymentStatus)}
          >
            {SALE_PAYMENT_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </Select>
          <Select
            label="Estado"
            value={status}
            className={saleStatusSelectClass(status)}
            onChange={(event) => setStatus(event.target.value as SaleStatus)}
          >
            {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </Modal>
  );
}

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const styles: Record<SaleStatus, string> = {
    entregado: "bg-emerald-50 text-emerald-700",
    encargado: "bg-sky-50 text-sky-700",
  };
  const label = SALE_STATUSES.find((entry) => entry.id === status)?.label ?? "Entregado";
  const badgeStyle = styles[status] || styles["encargado"];
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", badgeStyle)}>{label}</span>;
}

function SalePaymentStatusBadge({ status }: { status: SalePaymentStatus }) {
  const styles: Record<SalePaymentStatus, string> = {
    pagado: "bg-emerald-600 text-white",
    no_pagado: "bg-amber-50 text-amber-700",
  };
  const label = SALE_PAYMENT_STATUSES.find((entry) => entry.id === status)?.label ?? "Pagado";
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", styles[status])}>{label}</span>;
}

function SaleStatusSelect({ value, onChange }: { value: SaleStatus; onChange: (status: SaleStatus) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as SaleStatus)}
      className={cn(
        "h-10 w-full rounded-lg border px-3 text-sm font-medium outline-none transition",
        saleStatusSelectClass(value),
      )}
      aria-label="Cambiar estado"
    >
      {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
    </select>
  );
}

function saleStatusSelectClass(status: SaleStatus) {
  return status === "entregado"
    ? "border-emerald-700 bg-emerald-600 text-white focus:border-emerald-800 focus:ring-2 focus:ring-emerald-200"
    : "border-sky-700 bg-sky-600 text-white focus:border-sky-800 focus:ring-2 focus:ring-sky-200";
}

function SalePaymentStatusSelect({
  value,
  onChange,
}: {
  value: SalePaymentStatus;
  onChange: (status: SalePaymentStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as SalePaymentStatus)}
      className={cn(
        "h-10 w-full rounded-lg border px-3 text-sm font-medium outline-none transition",
        salePaymentStatusSelectClass(value),
      )}
      aria-label="Cambiar estado de pago"
    >
      {SALE_PAYMENT_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
    </select>
  );
}

function salePaymentStatusSelectClass(status: SalePaymentStatus) {
  return status === "pagado"
    ? "border-emerald-700 bg-emerald-600 text-white focus:border-emerald-800 focus:ring-2 focus:ring-emerald-200"
    : "border-slate-300 bg-white text-slate-950 focus:border-slate-500 focus:ring-2 focus:ring-slate-100";
}

function ActivityList({ movements }: { movements: Movement[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {movements.map((movement) => (
        <div key={movement.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{movement.title}</p>
              <p className="mt-1 break-words text-sm text-slate-500">{movement.detail}</p>
            </div>
            <p className="shrink-0 text-sm text-slate-500">{movement.date}</p>
          </div>
        </div>
      ))}
      {!movements.length ? <EmptyState title="Sin movimientos" text="Todavia no hay actividad." /> : null}
    </div>
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
  onSubmit: (values: Omit<Product, "id" | "sold">) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    location: "",
    imageUrl: "",
    cost: "",
    price: "",
    wholesalePrice: "",
    stock: "",
  });
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    setForm({
      name: product?.name ?? "",
      brand: product?.brand ?? "",
      location: normalizeLocation(product?.location),
      imageUrl: product?.imageUrl ?? "",
      cost: product ? String(product.cost) : "",
      price: product ? String(product.price) : "",
      wholesalePrice: product?.wholesalePrice ? String(product.wholesalePrice) : "",
      stock: product ? String(product.stock) : "",
    });
    setImageError("");
  }, [product, open]);

  async function handleImageFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Elegí un archivo de imagen.");
      return;
    }
    if (file.size > 150000) {
      setImageError("La imagen debe pesar menos de 150 KB.");
      return;
    }

    const imageUrl = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, imageUrl }));
    setImageError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      brand: form.brand.trim(),
      location: normalizeLocation(form.location),
      imageUrl: form.imageUrl.trim() || undefined,
      cost: toPositiveNumber(form.cost),
      price: toPositiveNumber(form.price),
      wholesalePrice: product?.wholesalePrice ?? null,
      stock: toNonNegativeInteger(form.stock),
      minStock: product?.minStock ?? LOW_STOCK_LIMIT,
    });
  }

  return (
    <Modal open={open} title={product ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
        <Input label="Producto" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Proveedor / marca" required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          <Select label="Ubicacion" required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })}>
            {LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Costo" required type="number" min={1} value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} />
          <Input label="Precio" required type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <Input label="Stock" required type="number" min={0} value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[80px_1fr] sm:items-end">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="h-full w-full object-cover" src={form.imageUrl} alt="Vista previa" />
            ) : (
              <ImageIcon className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div className="grid gap-3">
            <Input label="Imagen URL" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <Input label="Subir imagen" type="file" accept="image/*" onChange={(event) => void handleImageFile(event.target.files?.[0])} />
              <Button type="button" variant="secondary" onClick={() => setForm({ ...form, imageUrl: "" })}>
                Limpiar
              </Button>
            </div>
            {imageError ? <p className="text-sm text-red-600">{imageError}</p> : null}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{product ? "Guardar" : "Crear"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SuccessMessage({ text }: { text: string }) {
  return <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{text}</p>;
}

function ErrorMessage({ text }: { text: string }) {
  return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{text}</p>;
}

function ConnectionMessage({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Base de datos no conectada</p>
        <p className="mt-1 text-amber-700">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

async function saveStock(
  product: Product,
  stock: number,
  updateStock: (id: string, stock: number) => Promise<void>,
  notify: Notify,
) {
  await updateStock(product.id, stock);
  notify({ type: "success", title: "Stock actualizado", message: product.name });
}

async function confirmDelete(product: Product, deleteProduct: (id: string) => Promise<void>, notify: Notify) {
  const ok = window.confirm(`Eliminar ${product.name}?`);
  if (!ok) return;
  await deleteProduct(product.id);
  notify({ type: "success", title: "Producto eliminado", message: product.name });
}

async function removeSale(sale: Movement, deleteMovement: (id: string) => Promise<void>, notify: Notify) {
  const ok = window.confirm("Eliminar esta venta? El stock se devuelve automaticamente.");
  if (!ok) return;
  await deleteMovement(sale.id);
  notify({ type: "success", title: "Venta eliminada", message: "El stock fue devuelto" });
}

function saleStatus(movement: Movement): SaleStatus {
  const status = movement.status as string;
  if (status === "encargado" || status === "pendiente") return "encargado";
  return "entregado";
}

function salePaymentStatus(movement: Movement): SalePaymentStatus {
  return movement.paymentStatus === "no_pagado" ? "no_pagado" : "pagado";
}

function saleProductLabel(movement: Movement, products: Product[]) {
  const product = products.find((item) => item.id === movement.productId);
  if (product) return `${movement.quantity ? `${movement.quantity} ` : ""}${product.name}`;

  return movement.detail.replace(/\s+por\s+.+$/i, "");
}

function saleUnitPrice(movement: Movement) {
  if (movement.quantity && movement.quantity > 0) return movement.amount / movement.quantity;
  return movement.amount;
}

function saleUnitCost(movement: Movement, product?: Product) {
  if (movement.unitCost !== undefined) return movement.unitCost;
  if (movement.quantity && movement.quantity > 0) {
    return saleUnitPrice(movement) - movement.profit / movement.quantity;
  }
  return product?.cost ?? 0;
}

function parseOptionalPrice(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function locationMatches(product: Product, filter: LocationFilter) {
  return filter === "todos" || productLocation(product) === filter;
}

function movementMatchesLocation(movement: Movement, products: Product[], filter: LocationFilter) {
  return filter === "todos" || movementLocation(movement, products) === filter;
}

function movementLocation(movement: Movement, products: Product[]) {
  const product = products.find((item) => item.id === movement.productId);
  return product ? productLocation(product) : LOCATIONS[0];
}

function productLocation(product: Product) {
  return normalizeLocation(product.location);
}

function normalizeLocation(location?: string): LocationName {
  const value = (location ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

  if (value === "villa maria" || value === "villamaria") return "Villa Maria";
  if (value === "bsas" || value === "buenos aires" || value === "buenosaires") return "Buenos Aires";
  return LOCATIONS.find((option) => option.toLowerCase() === location?.toLowerCase()) ?? LOCATIONS[0];
}

function compareProductsByLocation(a: Product, b: Product) {
  return (
    LOCATIONS.indexOf(productLocation(a)) - LOCATIONS.indexOf(productLocation(b)) ||
    a.name.localeCompare(b.name) ||
    a.brand.localeCompare(b.brand)
  );
}

function toPositiveInteger(value: string) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function toNonNegativeInteger(value: string) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function toPositiveNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function toOptionalPositiveNumber(value: string) {
  const number = Number(value);
  return value.trim() && Number.isFinite(number) && number > 0 ? number : null;
}

function handleFormKeyboardNavigation(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter") return;
  const target = event.target as HTMLElement;
  if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
  event.preventDefault();
  const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("input, select, button"));
  const index = fields.indexOf(target);
  const next = fields[index + 1];
  if (next) next.focus();
  else event.currentTarget.requestSubmit();
}

function getMetrics(products: Product[], movements: Movement[]) {
  const sales = movements.filter((movement) => movement.type === "venta");
  return {
    stock: products.reduce((sum, product) => sum + product.stock, 0),
    sales: sales.reduce((sum, movement) => sum + movement.amount, 0),
  };
}

type PricePdfMode = "retail" | "wholesale" | "quote";
type PdfImage = {
  dataUrl: string;
  format: "JPEG" | "PNG" | "WEBP";
};

async function downloadPricePdf(products: (Product & { quantity?: number })[], mode: PricePdfMode, clientName?: string) {
  if (!products.length) return;

  const pdfProducts = mode === "quote" ? products : [...products].sort(compareProductsByLocation);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imageMap = await loadProductImages(pdfProducts);
  const isWholesale = mode === "wholesale";
  const isQuote = mode === "quote";

  // Top header color accent bar (Teal)
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageWidth, 6, "F");

  // Logo / Business name
  doc.setTextColor(15, 23, 42); // slate 900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Mates x Vos", 40, 48);

  // Business Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate 500
  doc.text("Mates, bombillas y accesorios premium", 40, 62);

  // Business Contact Info (Right side)
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate 600
  doc.text("Instagram: @matesxvos", pageWidth - 180, 38);
  doc.text("WhatsApp: +54 9 353 479-6992", pageWidth - 180, 50);
  doc.text("Ubicación: Bs. As. / Villa María", pageWidth - 180, 62);

  // Thin separator line
  doc.setDrawColor(226, 232, 240); // slate 200
  doc.setLineWidth(1);
  doc.line(40, 76, pageWidth - 40, 76);

  // Title block / Document info
  doc.setTextColor(15, 23, 42);
  if (isQuote) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PRESUPUESTO", 40, 98);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Cliente: ${clientName || "Cliente Mayorista"}`, 40, 113);
    doc.text(`Fecha: ${today()}`, pageWidth - 180, 98);
    doc.text("Validez: 15 días corridos", pageWidth - 180, 113);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(isWholesale ? "CATÁLOGO MAYORISTA" : "LISTA DE PRECIOS", 40, 98);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`${pdfProducts.length} productos disponibles`, 40, 113);
    doc.text(`Fecha de emisión: ${today()}`, pageWidth - 180, 98);
    doc.text("Precios sujetos a variación", pageWidth - 180, 113);
  }

  const startY = 130;
  const headers = isQuote
    ? [["Foto", "Producto", "Cant.", "P. Unitario", "Total"]]
    : [["Foto", "Producto", "Ubicación", "Precio"]];

  const bodyData = pdfProducts.map((product) => {
    if (isQuote) {
      return [
        product.id,
        product.name,
        String(product.quantity ?? 1),
        currency(product.wholesalePrice ?? product.price),
        currency((product.wholesalePrice ?? product.price) * (product.quantity ?? 1)),
      ];
    } else {
      return [
        product.id,
        product.name,
        productLocation(product),
        currency(isWholesale ? product.wholesalePrice ?? product.price : product.price),
      ];
    }
  });

  autoTable(doc, {
    startY,
    head: headers,
    body: bodyData,
    margin: { left: 40, right: 40 },
    theme: "striped",
    styles: {
      cellPadding: 8,
      font: "helvetica",
      fontSize: 9.5,
      lineColor: [241, 245, 249],
      lineWidth: 0.5,
      textColor: [51, 65, 85], // slate 700
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate 900
      fontStyle: "bold",
      textColor: [255, 255, 255],
      fontSize: 10,
    },
    columnStyles: isQuote
      ? {
          0: { cellWidth: 60, minCellHeight: 52 }, // Foto
          1: { cellWidth: "auto" }, // Producto
          2: { cellWidth: 50, halign: "center" }, // Cantidad
          3: { cellWidth: 90, halign: "right" }, // P. Unitario
          4: { cellWidth: 90, halign: "right", fontStyle: "bold", textColor: [13, 148, 136] }, // Total
        }
      : {
          0: { cellWidth: 60, minCellHeight: 52 }, // Foto
          1: { cellWidth: "auto" }, // Producto
          2: { cellWidth: 100, halign: "center" }, // Ubicacion
          3: { cellWidth: 100, halign: "right", fontStyle: "bold" }, // Precio
        },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 0) {
        data.cell.text = [""];
      }
    },
    didDrawCell: (data: any) => {
      if (data.section !== "body" || data.column.index !== 0) return;
      const productId = String(data.row.raw[0]);
      const image = imageMap.get(productId);

      const size = 40;
      const x = data.cell.x + (data.cell.width - size) / 2;
      const y = data.cell.y + (data.cell.height - size) / 2;

      if (image) {
        // Draw elegant image border box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.rect(x - 2, y - 2, size + 4, size + 4, "FD");
        doc.addImage(image.dataUrl, image.format, x, y, size, size);
      } else {
        // Draw elegant image placeholder with label
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.rect(x - 2, y - 2, size + 4, size + 4, "FD");

        doc.setTextColor(148, 163, 184); // slate 400
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("Foto", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 3, { align: "center" });
      }
    },
    didDrawPage: (data: any) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      const text = isQuote
        ? "Presupuesto válido por 15 días. Sujeto a disponibilidad."
        : "Precios sujetos a variación sin previo aviso.";

      doc.text(text, 40, pageHeight - 25);
      doc.text(`Página ${data.pageNumber}`, pageWidth - 70, pageHeight - 25);
    },
  });

  if (isQuote) {
    const finalY = (doc as any).lastAutoTable.finalY || startY;
    const total = pdfProducts.reduce((sum, item) => sum + (item.wholesalePrice ?? item.price) * (item.quantity ?? 1), 0);

    // Draw total block at the bottom right
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(204, 251, 241); // Teal border
    doc.rect(pageWidth - 220, finalY + 15, 180, 40, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL PRESUPUESTO:", pageWidth - 210, finalY + 28);
    doc.setTextColor(13, 148, 136); // Teal text
    doc.setFontSize(13);
    doc.text(currency(total), pageWidth - 210, finalY + 45);

    doc.save(`mates-x-vos-presupuesto-${(clientName || "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${today()}.pdf`);
  } else {
    doc.save(`mates-x-vos-${isWholesale ? "mayorista" : "precios"}-${today()}.pdf`);
  }
}

async function loadProductImages(products: (Product & { quantity?: number })[]) {
  const entries = await Promise.all(
    products.map(async (product) => {
      if (!product.imageUrl) return null;
      const image = await imageToPdfData(product.imageUrl).catch(() => null);
      return image ? ([product.id, image] as const) : null;
    }),
  );

  return new Map(entries.filter((entry): entry is readonly [string, PdfImage] => Boolean(entry)));
}

async function imageToPdfData(source: string): Promise<PdfImage> {
  const dataUrl = source.startsWith("data:image/")
    ? source
    : await fetchImageAsDataUrl(source);
  return {
    dataUrl,
    format: imageFormatFromDataUrl(dataUrl),
  };
}

async function fetchImageAsDataUrl(source: string) {
  const response = await fetch(source);
  if (!response.ok) throw new Error("No se pudo cargar la imagen");
  const blob = await response.blob();
  return readFileAsDataUrl(blob);
}

function imageFormatFromDataUrl(dataUrl: string): PdfImage["format"] {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}
