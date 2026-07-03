"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MoreVertical,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { AlertToaster } from "@/components/ui/alert-toaster";
import { type AlertType, useAlertStore } from "@/lib/alerts";
import { cn, currency, today } from "@/lib/utils";
import { Movement, Product, type SaleLineInput, type SaleUpdateInput, useStockStore } from "@/lib/store";
import { LOCATIONS, type LocationFilter, type LocationName, useLocationFilterStore } from "@/lib/location";

type View = "dashboard" | "stock" | "ventas" | "listas";
type SaleStatus = "entregado" | "encargado";
type SaleFilter = "todos" | SaleStatus;
type SalePaymentStatus = "pagado" | "no_pagado";
type SalePaymentFilter = "todos" | SalePaymentStatus;
type SaleLineItem = {
  id: string;
  productId?: string;
  customName?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  unitPriceInput: string;
  lineTotalInput: string;
  unitCostInput: string;
};
type SaleGroup = {
  id: string;
  ids: string[];
  movements: Movement[];
  date: string;
  seller?: string;
  payment?: string;
  customer?: string;
  status: SaleStatus;
  paymentStatus: SalePaymentStatus;
  amount: number;
  profit: number;
};
type Notify = (alert: { type: AlertType; title: string; message?: string; persistent?: boolean }) => void;

const LOW_STOCK_LIMIT = 5;
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

type NavAccent = "sky" | "emerald" | "amber" | "violet";

const navItems: { id: View; label: string; short: string; icon: typeof Boxes; accent: NavAccent }[] = [
  { id: "dashboard", label: "Inicio", short: "Inicio", icon: LayoutDashboard, accent: "sky" },
  { id: "ventas", label: "Ventas", short: "Ventas", icon: ShoppingBag, accent: "emerald" },
  { id: "stock", label: "Stock", short: "Stock", icon: Boxes, accent: "amber" },
  { id: "listas", label: "Listas", short: "Listas", icon: Download, accent: "violet" },
];

const NAV_ACCENTS: Record<NavAccent, { soft: string; text: string }> = {
  sky: { soft: "bg-sky-50", text: "text-sky-700" },
  emerald: { soft: "bg-emerald-50", text: "text-emerald-700" },
  amber: { soft: "bg-amber-50", text: "text-amber-700" },
  violet: { soft: "bg-violet-50", text: "text-violet-700" },
};

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
          {view === "stock" && <StockView />}
          {view === "ventas" && <SalesView />}
          {view === "listas" && <ListasView />}
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
      const isConnectionIssue = storeError.toLowerCase().startsWith("no se pudo conectar");
      notify({ type: "warning", title: isConnectionIssue ? "Base de datos no conectada" : "Atención", message: storeError });
    }
  }, [loading, notify, storeError]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    notify({ type: "info", title: "Sesión cerrada" });
    onLogout();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] bg-slate-50">
      <aside className="hidden w-64 shrink-0 p-3 lg:block">
        <div className="sticky top-3 flex h-[calc(100vh-1.5rem)] flex-col rounded-[28px] border border-slate-200/60 bg-white/90 p-4 shadow-premium backdrop-blur-xl">
          <Brand />
          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-200/70 pt-3">
            <Button
              className="w-full justify-start text-slate-500 hover:bg-red-50 hover:text-red-600"
              variant="ghost"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Brand compact />
              </div>
              <p className="hidden text-sm text-slate-500 lg:block">Sistema de stock y ventas</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:block">
                <LocationSwitcher />
              </div>
              <Button variant="ghost" size="sm" className="hidden lg:inline-flex" onClick={() => void logout()}>
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        <div className="grid gap-4 px-4 py-5 sm:px-6 lg:py-6">
          {!loading && storeError ? <ConnectionMessage text={storeError} /> : null}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <MobileMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        view={view}
        setView={setView}
        onLogout={() => void logout()}
      />
    </div>
  );
}

function LocationSwitcher({ fullWidth }: { fullWidth?: boolean }) {
  const locationFilter = useLocationFilterStore((state) => state.locationFilter);
  const setLocationFilter = useLocationFilterStore((state) => state.setLocationFilter);
  const options: { value: LocationFilter; label: string }[] = [
    { value: "todos", label: "Ambas" },
    ...LOCATIONS.map((location) => ({ value: location, label: location })),
  ];

  return (
    <div className={cn("flex gap-1 rounded-xl bg-slate-100 p-1", fullWidth && "w-full")}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLocationFilter(option.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 sm:text-sm",
            fullWidth && "flex-1",
            locationFilter === option.value ? cn("bg-white shadow-card", locationFilterAccentText(option.value)) : "text-slate-600 hover:text-slate-900",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-bold text-white shadow-card">
        M
      </div>
      <div className="min-w-0">
        <p className={cn("truncate font-semibold tracking-tight text-slate-950", compact ? "text-base" : "text-[15px]")}>
          Mates x Vos
        </p>
        {!compact ? <p className="truncate text-xs text-slate-500">Inventario por sucursal</p> : null}
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: View; label: string; icon: typeof Boxes; accent: NavAccent };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const accent = NAV_ACCENTS[item.accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-all duration-150",
        active ? cn(accent.soft, accent.text, "shadow-sm") : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </button>
  );
}

function MobileMenuSheet({
  open,
  onClose,
  view,
  setView,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  view: View;
  setView: (view: View) => void;
  onLogout: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.button
            type="button"
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
            aria-label="Cerrar menu"
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 rounded-t-[32px] border-t border-slate-200/70 bg-white p-4 shadow-premium"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between gap-3 pb-3">
              <Brand />
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar menu">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                const accent = NAV_ACCENTS[item.accent];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setView(item.id);
                      onClose();
                    }}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition-colors duration-150",
                      active ? cn(accent.soft, accent.text) : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="my-3 border-t border-slate-200/70" />
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">Ciudad</p>
            <LocationSwitcher fullWidth />

            <div className="my-3 border-t border-slate-200/70" />
            <button
              type="button"
              onClick={onLogout}
              className="flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-[15px] font-medium text-red-600 transition-colors duration-150 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              Salir
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DashboardView({ setView }: { setView: (view: View) => void }) {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const locationFilter = useLocationFilterStore((state) => state.locationFilter);
  const filteredProducts = useMemo(
    () => products.filter((product) => locationMatches(product, locationFilter)),
    [products, locationFilter],
  );
  const filteredMovements = useMemo(
    () => movements.filter((movement) => movementMatchesLocation(movement, products, locationFilter)),
    [movements, products, locationFilter],
  );
  const metrics = useMemo(() => getMetrics(filteredProducts, filteredMovements), [filteredProducts, filteredMovements]);
  const stockByLocation = LOCATIONS.map((location) => ({
    location,
    stock: products
      .filter((product) => productLocation(product) === location)
      .reduce((sum, product) => sum + product.stock, 0),
  }));
  const lowProducts = filteredProducts.filter((product) => product.stock <= LOW_STOCK_LIMIT);
  const recent = filteredMovements.slice(0, 6);

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Inicio"
        description={locationFilter === "todos" ? "Resumen rapido del negocio." : `Resumen rapido de ${locationFilter}.`}
        action={
          <Button onClick={() => setView("ventas")}>
            <Plus className="h-4 w-4" />
            Nueva venta
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="Productos" value={String(filteredProducts.length)} />
        {locationFilter === "todos" ? (
          <>
            <SummaryCard label="Buenos Aires" value={`${stockByLocation[0]?.stock ?? 0} u.`} />
            <SummaryCard label="Villa Maria" value={`${stockByLocation[1]?.stock ?? 0} u.`} />
          </>
        ) : (
          <SummaryCard label={`Stock ${locationFilter}`} value={`${metrics.stock} u.`} />
        )}
        <SummaryCard label="Ventas" value={currency(metrics.sales)} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SummaryCard label="Ganancia de hoy" value={currency(metrics.profitToday)} tone="ok" />
        <SummaryCard label="Ganancia del mes" value={currency(metrics.profitMonth)} tone="ok" />
        <SummaryCard label="Plata en stock" value={currency(metrics.stockValue)} />
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

function StockView() {
  const products = useStockStore((state) => state.products);
  const addProduct = useStockStore((state) => state.addProduct);
  const updateProduct = useStockStore((state) => state.updateProduct);
  const deleteProduct = useStockStore((state) => state.deleteProduct);
  const updateStock = useStockStore((state) => state.updateStock);
  const notify = useAlertStore((state) => state.notify);
  const locationFilter = useLocationFilterStore((state) => state.locationFilter);
  const [activeTab, setActiveTab] = useState<"inventario" | "carga" | "importar">("inventario");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("todos");
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
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <PageHeader title="Stock" description="Productos, precios, ubicacion y carga de mercaderia." />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                activeTab === "inventario" ? "bg-white text-teal-700 shadow-card" : "text-slate-600 hover:text-slate-900",
              )}
              onClick={() => setActiveTab("inventario")}
            >
              Inventario
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                activeTab === "carga" ? "bg-white text-teal-700 shadow-card" : "text-slate-600 hover:text-slate-900",
              )}
              onClick={() => setActiveTab("carga")}
            >
              Cargar stock
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                activeTab === "importar" ? "bg-white text-teal-700 shadow-card" : "text-slate-600 hover:text-slate-900",
              )}
              onClick={() => setActiveTab("importar")}
            >
              Importar
            </button>
          </div>
          {activeTab === "inventario" ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Producto
            </Button>
          ) : null}
        </div>
      </div>

      {activeTab === "carga" ? (
        <StockLoadTab />
      ) : activeTab === "importar" ? (
        <ImportProductsTab />
      ) : (
        <>
      <Panel>
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto" />
          <Select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filtro de stock">
            <option value="todos">Todos</option>
            <option value="ok">Stock OK</option>
            <option value="bajo">Stock bajo</option>
          </Select>
        </div>
      </Panel>

      <StockLocationReference />

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
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
              <tr key={product.id} className={cn("transition-colors duration-150", stockLocationRowClass(productLocation(product)))}>
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
                  <StockEditor product={product} onSave={(stock) => saveStock(product, stock, updateStock, notify)} />
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
              <StockEditor product={product} onSave={(stock) => saveStock(product, stock, updateStock, notify)} />
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
        </>
      )}

      <ProductModal
        open={modalOpen}
        product={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={async (values) => {
          const ok = editing ? await updateProduct(editing.id, values) : await addProduct(values);
          if (!ok) {
            notify({ type: "error", title: editing ? "No se pudo actualizar el producto" : "No se pudo crear el producto", message: values.name });
            return;
          }
          notify({ type: "success", title: editing ? "Producto actualizado" : "Producto creado", message: values.name });
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
  const [editingSale, setEditingSale] = useState<SaleGroup | null>(null);
  const [actionMenuId, setActionMenuId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState<SaleFilter>("todos");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<SalePaymentFilter>("todos");
  const locationFilter = useLocationFilterStore((state) => state.locationFilter);
  const [saleLocation, setSaleLocation] = useState<LocationName>(locationFilter === "todos" ? LOCATIONS[0] : locationFilter);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [customName, setCustomName] = useState("");
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
  const saleGroups = useMemo(() => buildSaleGroups(sales), [sales]);
  const visibleSaleGroups = saleGroups.filter((sale) => {
    const statusOk = statusFilter === "todos" || sale.status === statusFilter;
    const paymentStatusOk = paymentStatusFilter === "todos" || sale.paymentStatus === paymentStatusFilter;
    const locationOk = movementMatchesLocation(sale.movements[0], products, locationFilter);
    return statusOk && paymentStatusOk && locationOk;
  });

  useEffect(() => {
    if (locationFilter !== "todos") setSaleLocation(locationFilter);
  }, [locationFilter]);

  useEffect(() => {
    if (productId === "custom" || saleProducts.some((product) => product.id === productId)) return;
    setProductId(saleProducts[0]?.id ?? "");
  }, [productId, saleProducts]);

  useEffect(() => {
    setSalePrice(selectedPrice ? String(selectedPrice) : "");
  }, [selectedId, selectedPrice]);

  function resetSaleForm() {
    setCart([]);
    setQuantity("1");
    setSalePrice(selectedPrice ? String(selectedPrice) : "");
    setCustomName("");
    setCustomer("");
    setStatus("entregado");
    setPaymentStatus("pagado");
  }

  function addLineToCart() {
    const isCustom = productId === "custom";
    if (!isCustom && !selected) return;

    const parsedPrice = parseOptionalPrice(salePrice);
    if (!parsedPrice) {
      notify({ type: "warning", title: "Ingresá un precio de venta válido" });
      return;
    }
    if (quantityValue <= 0) {
      notify({ type: "warning", title: "Ingresá una cantidad válida" });
      return;
    }
    if (isCustom && !customName.trim()) {
      notify({ type: "warning", title: "Escribí el nombre del producto personalizado" });
      return;
    }

    setCart((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        productId: isCustom ? undefined : productId,
        customName: isCustom ? customName.trim() : undefined,
        quantity: quantityValue,
        unitPrice: parsedPrice,
        unitCost: isCustom ? 0 : selected!.cost,
        unitPriceInput: salePrice,
        lineTotalInput: String(Math.round(parsedPrice * quantityValue)),
        unitCostInput: isCustom ? "" : String(selected!.cost),
      },
    ]);
    setQuantity("1");
    if (isCustom) setCustomName("");
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

    if (submittingRef.current) return;

    const items: SaleLineInput[] = [];
    for (const item of cart) {
      const product = item.productId ? products.find((entry) => entry.id === item.productId) : undefined;
      const displayName = product?.name ?? item.customName;
      const unitPrice = parseOptionalPrice(item.unitPriceInput);
      const unitCost = parseOptionalPrice(item.unitCostInput);
      if (!unitPrice || !unitCost) {
        notify({ type: "warning", title: "Revisá precios y costos", message: displayName });
        return;
      }
      items.push({ productId: item.productId, customName: item.customName, quantity: item.quantity, unitPrice, unitCost });
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const ok = await registerSale({
        items,
        seller,
        payment,
        customer: customer.trim() || undefined,
        date,
        status,
        paymentStatus,
      });
      if (!ok) {
        const detail = useStockStore.getState().error;
        notify({ type: "warning", title: "No se pudo completar la venta", message: detail || "Revisá el stock disponible." });
        return;
      }

      const productNames = cart
        .map((item) => (item.productId ? products.find((entry) => entry.id === item.productId)?.name : item.customName))
        .filter(Boolean)
        .join(", ");
      notify({
        type: "success",
        title: status === "encargado" ? "Encargo registrado" : "Venta registrada",
        message: productNames,
      });
      setModalOpen(false);
      resetSaleForm();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function changeSaleStatus(sale: SaleGroup, nextStatus: SaleStatus) {
    const ok = await updateSaleStatus(sale.ids, nextStatus);
    if (!ok) {
      notify({ type: "error", title: "No se pudo actualizar el estado" });
      return;
    }
    notify({ type: "success", title: "Estado actualizado", message: nextStatus === "encargado" ? "Encargado" : "Entregado" });
  }

  async function changeSalePaymentStatus(sale: SaleGroup, nextPaymentStatus: SalePaymentStatus) {
    const ok = await updateSalePaymentStatus(sale.ids, nextPaymentStatus);
    if (!ok) {
      notify({ type: "error", title: "No se pudo actualizar el cobro" });
      return;
    }
    notify({
      type: "success",
      title: "Pago actualizado",
      message: nextPaymentStatus === "pagado" ? "Pagado" : "No pagado",
    });
  }

  async function saveSaleEdit(sale: SaleGroup, input: SaleUpdateInput) {
    const ok = await updateSale(sale.ids, input);
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
      message: `${input.customer?.trim() || "Sin cliente"} - ${saleGroupProductLabel(sale, products)}`,
    });
    setEditingSale(null);
  }

  function openSaleEdit(sale: SaleGroup) {
    setEditingSale(sale);
    setActionMenuId("");
  }

  async function downloadReceipt(sale: SaleGroup) {
    setActionMenuId("");
    try {
      await downloadSaleReceiptPdf(sale, products, movementLocation(sale.movements[0], products));
    } catch {
      notify({ type: "error", title: "No pudimos generar el recibo", message: "Intentá de nuevo en unos segundos" });
    }
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
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px] lg:items-center">
          <div className="flex flex-wrap gap-2">
            <SummaryPill label="Total" value={String(visibleSaleGroups.length)} />
            <SummaryPill label="Encargos" value={String(saleGroups.filter((sale) => sale.status === "encargado").length)} />
            <SummaryPill label="Pagadas" value={String(saleGroups.filter((sale) => sale.paymentStatus === "pagado").length)} />
            <SummaryPill label="Vendido" value={currency(visibleSaleGroups.reduce((sum, sale) => sum + sale.amount, 0))} />
          </div>
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

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-card md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
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
            {visibleSaleGroups.map((sale) => (
              <tr
                key={sale.id}
                className={cn(
                  "transition-colors duration-150",
                  sale.paymentStatus === "pagado" ? "bg-emerald-50/70 hover:bg-emerald-50" : "hover:bg-slate-50",
                )}
              >
                <td className="px-4 py-3">
                  <SaleSummary sale={sale} products={products} />
                </td>
                <td className="px-4 py-3 text-slate-600">{sale.date}</td>
                <td className="px-4 py-3 text-slate-600">{sale.payment ?? "-"}</td>
                <td className="px-4 py-3">
                  <SalePaymentStatusSelect
                    value={sale.paymentStatus}
                    onChange={(nextPaymentStatus) => void changeSalePaymentStatus(sale, nextPaymentStatus)}
                  />
                </td>
                <td className="px-4 py-3">
                  <SaleStatusSelect value={sale.status} onChange={(nextStatus) => void changeSaleStatus(sale, nextStatus)} />
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
                      onDownloadReceipt={() => void downloadReceipt(sale)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleSaleGroups.length ? <EmptyState title="Sin ventas" text="Registra una venta nueva." /> : null}
      </div>

      <div className="grid gap-3 md:hidden">
        {visibleSaleGroups.map((sale) => (
          <SaleCard
            key={sale.id}
            sale={sale}
            products={products}
            location={movementLocation(sale.movements[0], products)}
            actionMenuOpen={actionMenuId === sale.id}
            onActionMenuToggle={() => setActionMenuId(actionMenuId === sale.id ? "" : sale.id)}
            onEdit={() => openSaleEdit(sale)}
            onDelete={() => {
              setActionMenuId("");
              void removeSale(sale, deleteMovement, notify);
            }}
            onDownloadReceipt={() => void downloadReceipt(sale)}
            onStatusChange={(nextStatus) => void changeSaleStatus(sale, nextStatus)}
            onPaymentStatusChange={(nextPaymentStatus) => void changeSalePaymentStatus(sale, nextPaymentStatus)}
          />
        ))}
        {!visibleSaleGroups.length ? <EmptyState title="Sin ventas" text="Registra una venta nueva." /> : null}
      </div>

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
            <option value="custom">— Producto personalizado —</option>
            {saleProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - {product.stock} u.</option>)}
          </Select>
          {productId === "custom" ? (
            <Input
              label="Nombre del producto"
              placeholder="Ej. Combo especial"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Input label="Precio venta" required type="number" min={1} step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} />
            <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            {productId === "custom" ? (
              <p className="text-slate-500">Este producto es solo para esta venta: no se guarda en el catálogo de Stock.</p>
            ) : (
              <>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Disponible</span>
                  <span className="font-medium">{selected?.stock ?? 0} u.</span>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span className="text-slate-500">Precio lista</span>
                  <span className="font-medium">{currency(selected?.price ?? 0)}</span>
                </div>
              </>
            )}
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">{currency(lineTotal)}</span>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={addLineToCart} disabled={productId !== "custom" && !saleProducts.length}>
            <Plus className="h-4 w-4" />
            Agregar producto
          </Button>
          {cart.length ? (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Productos en la venta</p>
              {cart.map((item) => {
                const product = item.productId ? products.find((entry) => entry.id === item.productId) : undefined;
                const unitPrice = parseOptionalPrice(item.unitPriceInput) ?? item.unitPrice;
                const unitCost = parseOptionalPrice(item.unitCostInput) ?? item.unitCost;
                const lineTotalAmount = item.quantity * unitPrice;
                const lineProfit = (unitPrice - unitCost) * item.quantity;
                return (
                  <div key={item.id} className="grid gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {product?.name ?? item.customName ?? "Producto"}
                          {!product ? (
                            <span className="ml-2 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                              Personalizado
                            </span>
                          ) : null}
                        </p>
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
          <Button disabled={!cart.length || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
            {submitting ? "Guardando..." : "Guardar venta"}
          </Button>
        </form>
      </Modal>

      <SaleEditModal
        sale={editingSale}
        products={products}
        onClose={() => setEditingSale(null)}
        onInvalid={(message) => notify({ type: "warning", title: message })}
        onSubmit={(input) => (editingSale ? saveSaleEdit(editingSale, input) : undefined)}
      />
    </section>
  );
}

function StockLoadTab() {
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
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const quantityValue = toPositiveInteger(quantity);
      const costValue = toPositiveNumber(unitCost);
      const ok = await registerPurchase({ productId, quantity: quantityValue, unitCost: costValue, date });
      if (!ok) {
        notify({ type: "error", title: "No se pudo cargar el stock", message: selected?.name });
        return;
      }
      notify({ type: "success", title: "Stock actualizado", message: selected?.name });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-5">
        <Panel title="Agregar stock" subtitle="Ingreso rapido de mercaderia.">
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
            <Button disabled={!locationProducts.length || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
              {submitting ? "Guardando..." : "Guardar carga"}
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

type ImportedProductRow = {
  name: string;
  brand: string;
  cost: number;
  price: number;
  stock: number;
  imageUrl?: string;
  include: boolean;
};

const IMPORT_FIELD_ALIASES: Record<"name" | "brand" | "cost" | "price" | "promoPrice" | "stock" | "imageUrl", string[]> = {
  name: ["nombre", "nombre del producto", "producto", "name", "title", "titulo"],
  brand: ["marca", "proveedor", "categorias", "categoria", "brand"],
  cost: ["costo", "cost"],
  price: ["precio", "price"],
  promoPrice: ["precio promocional", "precio de oferta", "precio comparativo", "precio final", "promotional price", "compare at price"],
  stock: ["stock", "cantidad", "cantidades", "existencias", "quantity"],
  imageUrl: ["imagen 1", "imagen", "imagen url", "imagen url 1", "imagen src", "foto", "image", "image 1", "image src"],
};

function normalizeHeaderText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parseDelimitedText(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

function parsePriceValue(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let normalized = trimmed.replace(/[^0-9.,-]/g, "");
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function parseTiendaNubeCsv(text: string): { rows: ImportedProductRow[]; skipped: number } {
  const table = parseDelimitedText(text);
  if (table.length < 2) return { rows: [], skipped: 0 };

  const headers = table[0].map(normalizeHeaderText);
  const columnIndex: Partial<Record<keyof typeof IMPORT_FIELD_ALIASES, number>> = {};

  (Object.keys(IMPORT_FIELD_ALIASES) as (keyof typeof IMPORT_FIELD_ALIASES)[]).forEach((field) => {
    const aliases = IMPORT_FIELD_ALIASES[field];
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index !== -1) columnIndex[field] = index;
  });

  const rows: ImportedProductRow[] = [];
  let skipped = 0;

  for (const cells of table.slice(1)) {
    const cell = (field: keyof typeof IMPORT_FIELD_ALIASES) => {
      const index = columnIndex[field];
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };

    const name = cell("name");
    const price = parsePriceValue(cell("price"));
    if (!name || price <= 0) {
      if (name || price) skipped++;
      continue;
    }

    const promoPrice = parsePriceValue(cell("promoPrice"));
    const cost = parsePriceValue(cell("cost"));
    const stock = Math.max(0, Math.round(parsePriceValue(cell("stock"))));
    const brand = cell("brand") || name;
    const imageUrl = cell("imageUrl");

    rows.push({
      name,
      brand,
      cost: cost > 0 ? cost : Math.round(price * 0.6),
      price: promoPrice > 0 ? promoPrice : price,
      stock,
      imageUrl: imageUrl || undefined,
      include: true,
    });
  }

  return { rows, skipped };
}

function ImportProductsTab() {
  const addProduct = useStockStore((state) => state.addProduct);
  const notify = useAlertStore((state) => state.notify);
  const [location, setLocation] = useState<LocationName>("Buenos Aires");
  const [rows, setRows] = useState<ImportedProductRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseTiendaNubeCsv(text);
    setRows(parsed.rows);
    setSkipped(parsed.skipped);
    setFileName(file.name);

    if (!parsed.rows.length) {
      notify({
        type: "warning",
        title: "No se encontraron productos",
        message: "Revisá que el CSV tenga columnas de Nombre y Precio.",
      });
    }
  }

  function toggleRow(index: number) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, include: !row.include } : row)));
  }

  function updateRowField(index: number, field: "cost" | "price" | "stock", value: string) {
    const parsed = Number(value);
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: Number.isFinite(parsed) ? parsed : 0 } : row)),
    );
  }

  async function confirmImport() {
    const selected = rows.filter((row) => row.include);
    if (!selected.length) {
      notify({ type: "warning", title: "Seleccioná al menos un producto para importar" });
      return;
    }

    setImporting(true);
    let created = 0;
    try {
      for (const row of selected) {
        await addProduct({
          name: row.name,
          brand: row.brand,
          location,
          imageUrl: row.imageUrl,
          cost: row.cost > 0 ? row.cost : 1,
          price: row.price,
          wholesalePrice: null,
          stock: row.stock,
          minStock: LOW_STOCK_LIMIT,
        });
        created++;
      }
      notify({ type: "success", title: "Importación completa", message: `${created} productos creados en ${location}` });
      setRows([]);
      setFileName("");
      setSkipped(0);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Panel title="Importar desde Tienda Nube" subtitle="Subí el CSV exportado desde tu panel de Tienda Nube.">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Input label="Archivo CSV" type="file" accept=".csv,text/csv" onChange={(event) => void handleFile(event.target.files?.[0])} />
          <Select label="Ubicacion para lo importado" value={location} onChange={(event) => setLocation(event.target.value as LocationName)}>
            {LOCATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </Select>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Reconoce las columnas Nombre, Costo, Precio, Precio promocional, Stock e Imagen. Si hay precio promocional, se usa como precio final de venta.
        </p>
      </Panel>

      {rows.length ? (
        <Panel
          title={`Vista previa · ${fileName}`}
          subtitle={`${rows.filter((row) => row.include).length} de ${rows.length} productos seleccionados${skipped ? ` · ${skipped} filas omitidas por falta de nombre o precio` : ""}`}
        >
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2">Foto</th>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Costo</th>
                  <th className="px-3 py-2">Precio final</th>
                  <th className="px-3 py-2">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={`${row.name}-${index}`} className={cn(!row.include && "opacity-40")}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={() => toggleRow(index)}
                        aria-label={`Incluir ${row.name}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="h-full w-full object-cover" src={row.imageUrl} alt="" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.cost}
                        onChange={(event) => updateRowField(index, "cost", event.target.value)}
                        className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500/60"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.price}
                        onChange={(event) => updateRowField(index, "price", event.target.value)}
                        className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500/60"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={row.stock}
                        onChange={(event) => updateRowField(index, "stock", event.target.value)}
                        className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-teal-500/60"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => void confirmImport()} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? "Importando..." : `Importar ${rows.filter((row) => row.include).length} productos`}
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function RetailPriceList() {
  const products = useStockStore((state) => state.products);
  const notify = useAlertStore((state) => state.notify);
  const locationFilter = useLocationFilterStore((state) => state.locationFilter);
  const [generating, setGenerating] = useState(false);
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
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid gap-5">
        <Panel title="PDF minorista" subtitle="Lista simple para clientes.">
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
    </div>
  );
}

function ListasView() {
  const [activeTab, setActiveTab] = useState<"minorista" | "mayorista" | "presupuestador">("minorista");

  return (
    <section className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <PageHeader title="Listas" description="Precios minoristas, catálogo mayorista y presupuestador." />
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
              activeTab === "minorista" ? "bg-white text-teal-700 shadow-card" : "text-slate-600 hover:text-slate-900",
            )}
            onClick={() => setActiveTab("minorista")}
          >
            Minorista
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
              activeTab === "mayorista" ? "bg-white text-teal-700 shadow-card" : "text-slate-600 hover:text-slate-900",
            )}
            onClick={() => setActiveTab("mayorista")}
          >
            Mayorista
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
              activeTab === "presupuestador" ? "bg-white text-teal-700 shadow-card" : "text-slate-600 hover:text-slate-900",
            )}
            onClick={() => setActiveTab("presupuestador")}
          >
            Armar Presupuesto
          </button>
        </div>
      </div>

      {activeTab === "minorista" && <RetailPriceList />}
      {activeTab === "mayorista" && <WholesalePriceList />}
      {activeTab === "presupuestador" && <QuoteBuilder />}
    </section>
  );
}

function WholesalePriceList() {
  const products = useStockStore((state) => state.products);
  const notify = useAlertStore((state) => state.notify);
  const locationFilter = useLocationFilterStore((state) => state.locationFilter);
  const [generating, setGenerating] = useState(false);

  const wholesaleProducts = products
    .filter((product) => product.stock > 0 && product.wholesalePrice && locationMatches(product, locationFilter))
    .sort(compareProductsByLocation);
  const missingPrice = products.filter((product) => product.stock > 0 && !product.wholesalePrice).length;

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

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid gap-5">
        <Panel title="PDF mayorista" subtitle={missingPrice ? `${missingPrice} productos sin precio mayorista` : "Lista lista para compartir"}>
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
  );
}

function QuoteBuilder() {
  const products = useStockStore((state) => state.products);
  const notify = useAlertStore((state) => state.notify);
  const [generating, setGenerating] = useState(false);

  // Quote Builder States
  const [clientName, setClientName] = useState("");
  const [quoteItems, setQuoteItems] = useState<any[]>([]);

  // Form states for adding items
  const [selectedProductId, setSelectedProductId] = useState<string>("custom");
  const [customItemName, setCustomItemName] = useState("");
  const [addItemQty, setAddItemQty] = useState("1");
  const [addItemPrice, setAddItemPrice] = useState("");

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
  );
}

function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0">{action}</div> : null}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-5">
      {title ? (
        <div className="mb-4">
          <h2 className="font-semibold tracking-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warning" }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight", tone === "warning" && "text-amber-700", tone === "ok" && "text-emerald-700")}>{value}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2 shadow-card">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        className="border-transparent bg-slate-50 pl-10 focus:border-teal-500/60 focus:bg-white"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
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

function locationFilterAccentText(filter: LocationFilter) {
  if (filter === "Villa Maria") return "text-amber-700";
  if (filter === "Buenos Aires") return "text-sky-700";
  return "text-teal-700";
}

function StockPill({ product }: { product: Product }) {
  const low = product.stock <= LOW_STOCK_LIMIT;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", low ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
      {product.stock} u.
    </span>
  );
}

function StockEditor({ product, onSave }: { product: Product; onSave: (stock: number) => Promise<boolean> }) {
  const [value, setValue] = useState(String(product.stock));

  useEffect(() => {
    setValue(String(product.stock));
  }, [product.stock]);

  async function commitStock() {
    const nextStock = toNonNegativeInteger(value);
    setValue(String(nextStock));
    if (nextStock === product.stock) return;
    const ok = await onSave(nextStock);
    if (!ok) setValue(String(product.stock));
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
  onDownloadReceipt,
  onStatusChange,
  onPaymentStatusChange,
}: {
  sale: SaleGroup;
  products: Product[];
  location: string;
  actionMenuOpen: boolean;
  onActionMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadReceipt: () => void;
  onStatusChange: (status: SaleStatus) => void;
  onPaymentStatusChange: (paymentStatus: SalePaymentStatus) => void;
}) {
  const status = sale.status;
  const paymentStatus = sale.paymentStatus;

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
          <SaleActionMenu
            open={actionMenuOpen}
            onToggle={onActionMenuToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onDownloadReceipt={onDownloadReceipt}
          />
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
  onDownloadReceipt,
}: {
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadReceipt: () => void;
}) {
  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="icon" onClick={onToggle} aria-label="Acciones de venta">
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={onDownloadReceipt}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Descargar recibo
          </button>
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

function SaleSummary({ sale, products }: { sale: SaleGroup; products: Product[] }) {
  const isSingle = sale.movements.length === 1;
  const singleMovement = sale.movements[0];
  const product = singleMovement.productId ? products.find((item) => item.id === singleMovement.productId) : undefined;
  const unitPrice = saleUnitPrice(singleMovement);
  const unitCost = saleUnitCost(singleMovement, product);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex max-w-full rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
          <span className="truncate">{sale.customer ? sale.customer : "Sin cliente"}</span>
        </span>
        {!isSingle ? (
          <span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
            {sale.movements.length} productos
          </span>
        ) : null}
        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Ganancia {currency(sale.profit)}
        </span>
      </div>
      {isSingle ? (
        <>
          <p className="mt-0.5 break-words text-sm font-medium text-slate-700">
            Producto: {saleProductLabel(singleMovement, products)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {singleMovement.detail} · Precio final {currency(sale.amount)}
            {singleMovement.quantity && singleMovement.quantity > 1 ? ` (${currency(unitPrice)} c/u)` : ""}
            {" · "}Costo {currency(unitCost)} c/u
          </p>
        </>
      ) : (
        <div className="mt-1 grid gap-0.5">
          {sale.movements.map((movement) => (
            <p key={movement.id} className="break-words text-xs text-slate-600">
              {saleProductLabel(movement, products)} · {currency(movement.amount)}
            </p>
          ))}
        </div>
      )}
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
  sale: SaleGroup | null;
  products: Product[];
  onClose: () => void;
  onSubmit: (input: SaleUpdateInput) => Promise<void> | void;
  onInvalid: (message: string) => void;
}) {
  const isGroup = (sale?.movements.length ?? 0) > 1;
  const singleMovement = !isGroup ? sale?.movements[0] : undefined;
  const [seller, setSeller] = useState<(typeof VENDORS)[number]>("Julian");
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]>("Mercado Pago");
  const [customer, setCustomer] = useState("");
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<SaleStatus>("entregado");
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>("pagado");
  const [unitPrice, setUnitPrice] = useState("");
  const [lineTotal, setLineTotal] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const product = singleMovement?.productId ? products.find((item) => item.id === singleMovement.productId) : undefined;
  const quantity = singleMovement?.quantity ?? 1;
  const parsedUnitPrice = parseOptionalPrice(unitPrice);
  const parsedLineTotal = parseOptionalPrice(lineTotal);
  const parsedUnitCost = parseOptionalPrice(unitCost);
  const effectiveUnitPrice = parsedUnitPrice ?? (singleMovement ? saleUnitPrice(singleMovement) : 0);
  const effectiveLineTotal = parsedLineTotal ?? effectiveUnitPrice * quantity;
  const effectiveUnitCost = parsedUnitCost ?? (singleMovement ? saleUnitCost(singleMovement, product) : product?.cost ?? 0);
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
    setStatus(sale.status);
    setPaymentStatus(sale.paymentStatus);
    submittingRef.current = false;
    setSubmitting(false);
    if (singleMovement) {
      const currentUnitPrice = saleUnitPrice(singleMovement);
      const currentUnitCost = saleUnitCost(singleMovement, product);
      setUnitPrice(String(Math.round(currentUnitPrice)));
      setLineTotal(String(Math.round(singleMovement.amount)));
      setUnitCost(String(Math.round(currentUnitCost)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!isGroup) {
      if (!parsedUnitPrice) {
        onInvalid("Ingresá un precio de venta válido");
        return;
      }
      if (!parsedUnitCost) {
        onInvalid("Ingresá un costo válido");
        return;
      }
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit({
        seller,
        payment,
        customer: customer.trim(),
        date,
        status,
        paymentStatus,
        ...(isGroup ? {} : { unitPrice: parsedUnitPrice ?? undefined, unitCost: parsedUnitCost ?? undefined }),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={Boolean(sale)}
      title="Editar venta"
      subtitle={isGroup ? `${sale?.movements.length} productos` : singleMovement?.detail}
      onClose={onClose}
    >
      <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
        <Input label="Cliente (opcional)" value={customer} onChange={(event) => setCustomer(event.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Select label="Vendedor" value={seller} onChange={(event) => setSeller(event.target.value as (typeof VENDORS)[number])}>
            {VENDORS.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </Select>
        </div>
        {isGroup ? (
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Productos de esta venta</p>
            {sale?.movements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{saleProductLabel(movement, products)}</span>
                <span className="font-medium">{currency(movement.amount)}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Para cambiar el precio de un producto puntual, eliminá esta venta y volvé a cargarla.
            </p>
          </div>
        ) : singleMovement ? (
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">{saleProductLabel(singleMovement, products)}</p>
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
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
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

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
    submittingRef.current = false;
    setSubmitting(false);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit({
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
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Guardando..." : product ? "Guardar" : "Crear"}
          </Button>
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
  const isConnectionIssue = text.toLowerCase().startsWith("no se pudo conectar");
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">{isConnectionIssue ? "Base de datos no conectada" : "Atención"}</p>
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
  updateStock: (id: string, stock: number) => Promise<boolean>,
  notify: Notify,
) {
  const ok = await updateStock(product.id, stock);
  if (!ok) {
    notify({ type: "error", title: "No se pudo actualizar el stock", message: product.name });
    return false;
  }
  notify({ type: "success", title: "Stock actualizado", message: product.name });
  return true;
}

async function confirmDelete(product: Product, deleteProduct: (id: string) => Promise<boolean>, notify: Notify) {
  const ok = window.confirm(`Eliminar ${product.name}?`);
  if (!ok) return;
  const deleted = await deleteProduct(product.id);
  if (!deleted) {
    notify({ type: "error", title: "No se pudo eliminar el producto", message: product.name });
    return;
  }
  notify({ type: "success", title: "Producto eliminado", message: product.name });
}

async function removeSale(sale: SaleGroup, deleteMovement: (ids: string[]) => Promise<boolean>, notify: Notify) {
  const confirmMessage =
    sale.ids.length > 1
      ? "Eliminar esta venta con varios productos? El stock se devuelve automaticamente."
      : "Eliminar esta venta? El stock se devuelve automaticamente.";
  const ok = window.confirm(confirmMessage);
  if (!ok) return;
  const deleted = await deleteMovement(sale.ids);
  if (!deleted) {
    notify({ type: "error", title: "No se pudo eliminar la venta" });
    return;
  }
  notify({ type: "success", title: "Venta eliminada", message: "El stock fue devuelto" });
}

function buildSaleGroups(sales: Movement[]): SaleGroup[] {
  const groups = new Map<string, Movement[]>();
  for (const sale of sales) {
    const key = sale.groupId ?? sale.id;
    const list = groups.get(key);
    if (list) list.push(sale);
    else groups.set(key, [sale]);
  }

  return Array.from(groups.entries()).map(([key, movements]) => {
    const first = movements[0];
    return {
      id: key,
      ids: movements.map((movement) => movement.id),
      movements,
      date: first.date,
      seller: first.seller,
      payment: first.payment,
      customer: first.customer,
      status: saleStatus(first),
      paymentStatus: salePaymentStatus(first),
      amount: movements.reduce((sum, movement) => sum + movement.amount, 0),
      profit: movements.reduce((sum, movement) => sum + movement.profit, 0),
    };
  });
}

function saleGroupProductLabel(group: SaleGroup, products: Product[]) {
  return group.movements.map((movement) => saleProductLabel(movement, products)).join(", ");
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
  if (movement.location) return normalizeLocation(movement.location);
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
  const todayDate = today();
  const monthPrefix = todayDate.slice(0, 7);
  const salesToday = sales.filter((movement) => movement.date === todayDate);
  const salesMonth = sales.filter((movement) => movement.date.slice(0, 7) === monthPrefix);

  return {
    stock: products.reduce((sum, product) => sum + product.stock, 0),
    stockValue: products.reduce((sum, product) => sum + product.stock * product.cost, 0),
    sales: sales.reduce((sum, movement) => sum + movement.amount, 0),
    profit: sales.reduce((sum, movement) => sum + movement.profit, 0),
    profitToday: salesToday.reduce((sum, movement) => sum + movement.profit, 0),
    profitMonth: salesMonth.reduce((sum, movement) => sum + movement.profit, 0),
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

async function downloadSaleReceiptPdf(sale: SaleGroup, products: Product[], location: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const receiptNumber = sale.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();

  // Top header color accent bar (Teal)
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageWidth, 6, "F");

  // Logo / Business name
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Mates x Vos", 40, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Mates, bombillas y accesorios premium", 40, 62);

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Instagram: @matesxvos", pageWidth - 180, 38);
  doc.text("WhatsApp: +54 9 353 479-6992", pageWidth - 180, 50);
  doc.text(`Ubicación: ${location}`, pageWidth - 180, 62);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 76, pageWidth - 40, 76);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("COMPROBANTE DE VENTA", 40, 98);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`N° ${receiptNumber}`, 40, 113);
  doc.text(`Fecha: ${sale.date}`, pageWidth - 180, 98);
  doc.text(
    `${sale.status === "encargado" ? "Encargado" : "Entregado"} · ${sale.paymentStatus === "pagado" ? "Pagado" : "No pagado"}`,
    pageWidth - 180,
    113,
  );

  const infoY = 138;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, infoY, pageWidth - 80, 56, 6, 6, "FD");

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Cliente", 56, infoY + 18);
  doc.text("Vendedor", 56, infoY + 38);
  doc.text("Forma de pago", pageWidth / 2 + 10, infoY + 18);
  doc.text("Ubicación", pageWidth / 2 + 10, infoY + 38);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sale.customer?.trim() || "Consumidor final", 56, infoY + 30);
  doc.text(sale.seller || "-", 56, infoY + 50);
  doc.text(sale.payment || "-", pageWidth / 2 + 10, infoY + 30);
  doc.text(location, pageWidth / 2 + 10, infoY + 50);

  const startY = infoY + 76;
  const bodyData = sale.movements.map((movement) => {
    const product = products.find((item) => item.id === movement.productId);
    const quantity = movement.quantity ?? 1;
    return [
      product?.name ?? saleProductLabel(movement, products),
      String(quantity),
      currency(saleUnitPrice(movement)),
      currency(movement.amount),
    ];
  });

  autoTable(doc, {
    startY,
    head: [["Producto", "Cant.", "Precio unit.", "Subtotal"]],
    body: bodyData,
    margin: { left: 40, right: 40 },
    theme: "striped",
    styles: {
      cellPadding: 8,
      font: "helvetica",
      fontSize: 10,
      lineColor: [241, 245, 249],
      lineWidth: 0.5,
      textColor: [51, 65, 85],
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 23, 42],
      fontStyle: "bold",
      textColor: [255, 255, 255],
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 60, halign: "center" },
      2: { cellWidth: 100, halign: "right" },
      3: { cellWidth: 100, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data: any) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Comprobante interno, no válido como factura. Gracias por tu compra.", 40, pageHeight - 25);
      doc.text(`Página ${data.pageNumber}`, pageWidth - 70, pageHeight - 25);
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || startY;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(204, 251, 241);
  doc.rect(pageWidth - 220, finalY + 15, 180, 40, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL:", pageWidth - 210, finalY + 28);
  doc.setTextColor(13, 148, 136);
  doc.setFontSize(14);
  doc.text(currency(sale.amount), pageWidth - 210, finalY + 45);

  doc.save(`mates-x-vos-recibo-${receiptNumber}.pdf`);
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
