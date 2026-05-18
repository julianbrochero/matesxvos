"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  Layers3,
  LineChart,
  Menu,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AmbientBackground, BorderBeam, SkeletonLine } from "@/components/premium-effects";
import { NumberTicker } from "@/components/number-ticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { currency, compact, today } from "@/lib/utils";
import { Product, useStockStore } from "@/lib/store";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "productos", label: "Productos", icon: Boxes },
  { id: "compras", label: "Compras", icon: PackagePlus },
  { id: "ventas", label: "Ventas", icon: ShoppingBag },
  { id: "historial", label: "Historial", icon: Clock3 },
  { id: "estadisticas", label: "Estadísticas", icon: LineChart },
] as const;

type View = (typeof nav)[number]["id"];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.075 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const months = [
  { name: "Ene", ventas: 420000, ganancia: 118000 },
  { name: "Feb", ventas: 510000, ganancia: 152000 },
  { name: "Mar", ventas: 610000, ganancia: 178000 },
  { name: "Abr", ventas: 740000, ganancia: 214000 },
  { name: "May", ventas: 850000, ganancia: 240000 },
  { name: "Jun", ventas: 930000, ganancia: 274000 },
];

const chartColors = ["#111111", "#21a66a", "#d89b25", "#5f6c7b", "#ef6060", "#8b8b8b"];
const LOW_STOCK_LIMIT = 5;

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hydrate = useStockStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <main className="min-h-screen overflow-hidden text-ink">
      <AmbientBackground />
      <div className="flex min-h-screen">
        <Sidebar
          view={view}
          setView={(next) => {
            setView(next);
            setSidebarOpen(false);
          }}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header view={view} onMenu={() => setSidebarOpen(true)} />
          <AnimatePresence mode="wait">
            <motion.section
              key={view}
              className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-4 sm:px-6 lg:px-8"
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {view === "dashboard" && <Dashboard onNavigate={setView} />}
              {view === "productos" && <Products />}
              {view === "compras" && <Purchases />}
              {view === "ventas" && <Sales />}
              {view === "historial" && <History />}
              {view === "estadisticas" && <Stats />}
            </motion.section>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function Sidebar({
  view,
  setView,
  open,
  onClose,
  collapsed,
  setCollapsed,
}: {
  view: View;
  setView: (view: View) => void;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}) {
  const content = (
    <motion.aside
      className="flex h-full flex-col border-r border-line bg-white/92 px-3 py-4 backdrop-blur-2xl xl:sticky xl:top-0 xl:h-screen"
      animate={{ width: open ? 280 : collapsed ? 78 : 190 }}
      transition={{ type: "spring", stiffness: 350, damping: 34 }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex min-w-0 items-center">
          <motion.div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-line bg-white text-ink shadow-sm"
            whileHover={{ y: -1, scale: 1.02 }}
          >
            <MateIcon className="h-5 w-5" />
          </motion.div>
        </div>
        <Button variant="ghost" size="icon" className="xl:hidden" onClick={onClose} aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="mt-7 grid gap-1">
        {nav.map((entry) => {
          const Icon = entry.icon;
          const active = view === entry.id;
          return (
            <button
              key={entry.id}
              onClick={() => setView(entry.id)}
              className={`group relative flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-all duration-200 ${
                active ? "text-ink" : "text-black/48 hover:bg-black/[0.035] hover:text-ink"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="active-nav"
                  className="absolute inset-0 rounded-2xl border border-line bg-black/[0.045]"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              ) : null}
              {active ? (
                <motion.span
                  layoutId="active-nav-line"
                  className="absolute left-0 h-5 w-1 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              ) : null}
              <Icon
                className={`relative h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  active ? "text-ink" : ""
                }`}
              />
              {open || !collapsed ? (
                <span className="relative truncate">{entry.label}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-line pt-3 xl:block">
        <Button
          variant="ghost"
          size="icon"
          className="w-full justify-center rounded-2xl text-black/50 hover:text-ink"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Contraer sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {!collapsed ? (
          <motion.div
            className="mt-3 flex items-center justify-center gap-2 px-2 text-xs text-black/38"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gain" />
            Listo para vender
          </motion.div>
        ) : null}
      </div>
    </motion.aside>
  );

  return (
    <>
      <div className="hidden xl:block">{content}</div>
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex bg-black/15 backdrop-blur-xl xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 350, damping: 34 }}
            >
              {content}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function MateIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8.3 9.2h7.4l-.64 6.16A4.12 4.12 0 0 1 10.96 19h-1.9a4.12 4.12 0 0 1-4.1-3.64L4.3 9.2Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.3 9.2c.72-1.02 1.92-1.7 3.26-1.7h2.88c1.34 0 2.54.68 3.26 1.7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.9 7.8 19.2 4"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M18.15 5.22 20 6.84"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M8.25 12.35h5.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function Header({ view, onMenu }: { view: View; onMenu: () => void }) {
  const active = nav.find((entry) => entry.id === view);
  const remote = useStockStore((state) => state.remote);
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const metrics = useMetrics(products, movements);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/72 px-4 py-3 backdrop-blur-2xl sm:px-6 xl:px-8">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="secondary" size="icon" className="xl:hidden" onClick={onMenu} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-[0.68rem] font-medium uppercase tracking-[0.18em] text-black/38 sm:text-xs sm:tracking-[0.22em]">Sistema premium</p>
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-2xl">{active?.label}</h1>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <div className="rounded-full border border-line bg-white/70 px-3 py-2 text-xs font-medium text-black/50 shadow-sm">
            Hoy, {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date())}
          </div>
          <div className="rounded-full border border-line bg-white/70 px-3 py-2 text-xs font-semibold text-black/50 shadow-sm">
            {remote ? "Supabase" : "Local"}
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => downloadBusinessSnapshot({ products, movements, metrics, source: remote ? "supabase" : "local" })}
            aria-label="Descargar backup"
            title="Descargar backup"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function downloadBusinessSnapshot({
  products,
  movements,
  metrics,
  source,
}: {
  products: Product[];
  movements: ReturnType<typeof useStockStore.getState>["movements"];
  metrics: ReturnType<typeof useMetrics>;
  source: "supabase" | "local";
}) {
  const generatedAt = new Date();
  const payload = {
    app: "Mates x Vos",
    source,
    generatedAt: generatedAt.toISOString(),
    summary: {
      totalSales: metrics.sales,
      totalProfit: metrics.profit,
      totalStock: metrics.stock,
      marginPercent: Math.round(metrics.margin),
      products: products.length,
      movements: movements.length,
    },
    products,
    movements,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = generatedAt.toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `mates-x-vos-backup-${date}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const metrics = useMetrics(products, movements);
  const topProduct = [...products].sort((a, b) => b.sold - a.sold)[0];
  const lowProducts = products.filter(isLowStock);

  const cards = [
    { label: "Ventas totales", value: metrics.sales, icon: CircleDollarSign, format: currency, tone: "text-ink" },
    { label: "Ganancia total", value: metrics.profit, icon: TrendingUp, format: currency, tone: "text-gain" },
    { label: "Stock total", value: metrics.stock, icon: Layers3, format: (v: number) => `${Math.round(v)} unidades`, tone: "text-ink" },
    { label: "Producto más vendido", value: topProduct?.sold ?? 0, icon: Sparkles, format: () => topProduct?.name ?? "Sin datos", tone: "text-amber" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5">
      <motion.div variants={item} className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <section className="group relative overflow-hidden rounded-[2rem] border border-line bg-white/80 p-5 shadow-premium backdrop-blur-2xl sm:p-7">
          <BorderBeam />
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <motion.div
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-black/55 shadow-sm"
                whileHover={{ scale: 1.02 }}
              >
                <span className="h-2 w-2 rounded-full bg-gain shadow-[0_0_0_5px_rgba(33,166,106,0.12)]" />
                Negocio activo
              </motion.div>
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
                Control premium de stock, ventas y ganancias de yerbas.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-black/52 sm:text-base">
                Un panel rápido para cargar compras, vender, ver rentabilidad y detectar stock crítico sin fricción.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate("ventas")}>
                <ShoppingBag className="h-4 w-4" />
                Nueva venta
              </Button>
              <Button variant="secondary" onClick={() => onNavigate("productos")}>
                <Plus className="h-4 w-4" />
                Producto
              </Button>
            </div>
          </div>
        </section>
        <section className="group relative overflow-hidden rounded-[2rem] border border-line bg-ink p-5 text-white shadow-premium sm:p-6">
          <BorderBeam />
          <p className="text-sm text-white/55">Margen promedio</p>
          <div className="mt-3 text-5xl font-semibold tracking-tight">
            <NumberTicker value={metrics.margin} format={(v) => `${Math.round(v)}%`} />
          </div>
          <p className="mt-4 text-sm leading-6 text-white/55">
            La rentabilidad estimada del catálogo se mantiene fuerte.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[72, 48, 88].map((height, index) => (
              <motion.div
                key={height}
                className="rounded-2xl bg-white/10"
                initial={{ height: 20 }}
                animate={{ height }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </div>
        </section>
      </motion.div>

      <motion.div variants={container} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.section
              key={card.label}
              variants={item}
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative overflow-hidden rounded-[1.75rem] border border-line bg-white/78 p-5 shadow-soft backdrop-blur-xl transition-shadow duration-200 hover:shadow-premium"
            >
              <BorderBeam />
              <div className="mb-5 flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/[0.04]">
                  <Icon className={`h-5 w-5 ${card.tone}`} />
                </div>
                <span className="rounded-full bg-gain/10 px-2.5 py-1 text-xs font-semibold text-gain">+12%</span>
              </div>
              <p className="text-sm text-black/48">{card.label}</p>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                <NumberTicker value={card.value} format={card.format} />
              </div>
            </motion.section>
          );
        })}
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <motion.section variants={item} className="glass rounded-[1.75rem] p-4 sm:p-5">
          <SectionTitle title="Ventas y ganancias" subtitle="Tendencia mensual con animación progresiva" />
          <div className="mt-4 h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111111" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#111111" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#21a66a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#21a66a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={compact} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 12 }} />
                <Tooltip formatter={(value) => currency(Number(value))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(17,17,17,0.08)", boxShadow: "0 18px 55px rgba(17,17,17,0.1)" }} />
                <Area type="monotone" dataKey="ventas" stroke="#111111" strokeWidth={3} fill="url(#sales)" animationDuration={900} />
                <Area type="monotone" dataKey="ganancia" stroke="#21a66a" strokeWidth={3} fill="url(#profit)" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
        <motion.section variants={item} className="glass rounded-[1.75rem] p-4 sm:p-5">
          <SectionTitle title="Alertas de stock" subtitle={`${lowProducts.length} productos necesitan atención`} />
          <div className="mt-4 grid gap-3">
            {lowProducts.length ? (
              lowProducts.map((product) => <StockAlert key={product.id} product={product} />)
            ) : (
              <EmptyState title="Stock sano" text="No hay productos por debajo del mínimo." />
            )}
          </div>
        </motion.section>
      </div>

      <motion.section variants={item} className="glass rounded-[1.75rem] p-4 sm:p-5">
        <SectionTitle title="Actividad reciente" subtitle="Compras, ventas y movimientos sincronizados" />
        <Timeline limit={5} />
      </motion.section>
    </motion.div>
  );
}

function Products() {
  const products = useStockStore((state) => state.products);
  const addProduct = useStockStore((state) => state.addProduct);
  const updateProduct = useStockStore((state) => state.updateProduct);
  const deleteProduct = useStockStore((state) => state.deleteProduct);
  const updateStock = useStockStore((state) => state.updateStock);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = products.filter((product) => {
    const matches = `${product.name} ${product.brand}`.toLowerCase().includes(search.toLowerCase());
    const status =
      filter === "todos" ||
      (filter === "bajo" && isLowStock(product)) ||
      (filter === "ok" && !isLowStock(product));
    return matches && status;
  });
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5">
      <motion.section variants={item} className="glass rounded-[1.75rem] p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <SectionTitle title="Productos" subtitle="Catálogo, costos, precios, stock y rentabilidad" />
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Agregar producto
          </Button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <Input className="pl-11" placeholder="Buscar por nombre o marca..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <Select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} aria-label="Filtro de stock">
            <option value="todos">Todos los estados</option>
            <option value="ok">Stock saludable</option>
            <option value="bajo">Stock bajo</option>
          </Select>
        </div>
      </motion.section>

      <motion.section variants={item} className="glass overflow-hidden rounded-[1.75rem]">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-black/[0.02] text-xs uppercase tracking-[0.16em] text-black/40">
                <th className="px-5 py-4 font-semibold">Producto</th>
                <th className="px-5 py-4 font-semibold">Costo</th>
                <th className="px-5 py-4 font-semibold">Venta</th>
                <th className="px-5 py-4 font-semibold">Stock</th>
                <th className="px-5 py-4 font-semibold">Margen</th>
                <th className="px-5 py-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id} className="border-b border-line transition-colors duration-200 last:border-0 hover:bg-white/85">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-xs text-black/45">{product.brand}</p>
                  </td>
                  <td className="px-5 py-4">{currency(product.cost)}</td>
                  <td className="px-5 py-4">{currency(product.price)}</td>
                  <td className="px-5 py-4">
                    <StockBadge product={product} />
                  </td>
                  <td className="px-5 py-4 font-semibold text-gain">{Math.round(((product.price - product.cost) / product.price) * 100)}%</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="icon" onClick={() => updateStock(product.id, product.stock + 1)} aria-label="Sumar stock">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="icon" onClick={() => { setEditing(product); setModalOpen(true); }} aria-label="Editar">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} aria-label="Eliminar">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 lg:hidden">
          {visible.map((product) => (
            <motion.div
              key={product.id}
              layout
              className="rounded-3xl border border-line bg-white/82 p-4 shadow-sm"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-black/45">{product.brand}</p>
                </div>
                <StockBadge product={product} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <MiniStat label="Costo" value={currency(product.cost)} />
                <MiniStat label="Venta" value={currency(product.price)} />
                <MiniStat label="Vendidos" value={`${product.sold}`} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" variant="secondary" onClick={() => { setEditing(product); setModalOpen(true); }}>
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-line p-4">
          <p className="text-sm text-black/45">
            Página {page} de {pages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))} aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.section>

      <ProductModal
        open={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => {
          if (editing) updateProduct(editing.id, values);
          else addProduct(values);
          setModalOpen(false);
        }}
      />
    </motion.div>
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
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    cost: product ? String(product.cost) : "",
    price: product ? String(product.price) : "",
    stock: product ? String(product.stock) : "",
  });

  useEffect(() => {
    setForm({
      name: product?.name ?? "",
      brand: product?.brand ?? "",
      cost: product ? String(product.cost) : "",
      price: product ? String(product.price) : "",
      stock: product ? String(product.stock) : "",
    });
  }, [product, open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      name: form.name,
      brand: form.brand,
      cost: toPositiveNumber(form.cost),
      price: toPositiveNumber(form.price),
      stock: toNonNegativeInteger(form.stock),
      minStock: product?.minStock ?? LOW_STOCK_LIMIT,
    });
  }

  return (
    <Modal open={open} title={product ? "Editar producto" : "Agregar producto"} subtitle="Datos principales del catálogo" onClose={onClose}>
      <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Marca" required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          <Input label="Costo de compra" required type="number" min={1} value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} />
          <Input label="Precio de venta" required type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <Input label="Stock actual" required type="number" min={0} value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{product ? "Guardar cambios" : "Crear producto"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Purchases() {
  const products = useStockStore((state) => state.products);
  const registerPurchase = useStockStore((state) => state.registerPurchase);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("20");
  const [unitCost, setUnitCost] = useState(products[0] ? String(products[0].cost) : "");
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const quantityValue = toNonNegativeInteger(quantity);
  const unitCostValue = toPositiveNumber(unitCost);

  function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(async () => {
      await registerPurchase({ productId, quantity: quantityValue, unitCost: unitCostValue, date });
      setLoading(false);
    }, 520);
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
        <SectionTitle title="Nueva compra" subtitle="Ingresa mercadería y actualiza stock automáticamente" />
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="mt-5 grid gap-4">
          <Select label="Producto" value={productId} onChange={(event) => { const next = products.find((product) => product.id === event.target.value); setProductId(event.target.value); setUnitCost(next ? String(next.cost) : ""); }}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </Select>
          <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Input label="Costo unitario" required type="number" min={1} value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
          <Input label="Fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Button disabled={loading} className="mt-2">
            {loading ? <LoadingDots /> : <PackagePlus className="h-4 w-4" />}
            {loading ? "Registrando..." : "Registrar compra"}
          </Button>
        </form>
      </motion.section>
      <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
        <SectionTitle title="Impacto estimado" subtitle="El gasto queda en historial y el stock sube al instante" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ImpactCard icon={ReceiptText} label="Gasto total" value={currency(quantityValue * unitCostValue)} />
          <ImpactCard icon={Layers3} label="Unidades a ingresar" value={`${quantityValue} unidades`} />
        </div>
        <div className="mt-6 rounded-3xl border border-line bg-white/70 p-4">
          <p className="text-sm font-semibold">Vista previa</p>
          <p className="mt-2 text-sm leading-6 text-black/50">
            Al confirmar, el producto seleccionado aumenta su stock, actualiza costo unitario y crea un movimiento de compra.
          </p>
          <div className="mt-5 grid gap-2">
            <SkeletonLine className="h-3 w-4/5" />
            <SkeletonLine className="h-3 w-3/5" />
            <SkeletonLine className="h-3 w-5/6" />
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function Sales() {
  const products = useStockStore((state) => state.products);
  const registerSale = useStockStore((state) => state.registerSale);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [seller, setSeller] = useState("Juli");
  const [payment, setPayment] = useState("Mercado Pago");
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");
  const [saleAlert, setSaleAlert] = useState<{
    product: string;
    quantity: number;
    revenue: number;
    profit: number;
  } | null>(null);
  const selected = products.find((product) => product.id === productId);
  const quantityValue = toNonNegativeInteger(quantity);
  const revenue = (selected?.price ?? 0) * quantityValue;
  const cost = (selected?.cost ?? 0) * quantityValue;
  const profit = revenue - cost;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await registerSale({ productId, quantity: quantityValue, seller, payment, date });
    if (!ok) {
      setError("Stock insuficiente para registrar la venta.");
      setSaleAlert(null);
      return;
    }

    setError("");
    setSaleAlert({
      product: selected?.name ?? "Producto",
      quantity: quantityValue,
      revenue,
      profit,
    });
  }

  useEffect(() => {
    if (!saleAlert) return;
    const timeout = window.setTimeout(() => setSaleAlert(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [saleAlert]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
        <SectionTitle title="Nueva venta" subtitle="Baja stock, suma venta y calcula ganancia automáticamente" />
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="mt-5 grid gap-4">
          <Select label="Producto" value={productId} onChange={(event) => setProductId(event.target.value)}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.stock} disp.</option>)}
          </Select>
          <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Input label="Vendedor" value={seller} onChange={(event) => setSeller(event.target.value)} />
          <Select label="Método de pago" value={payment} onChange={(event) => setPayment(event.target.value)}>
            <option>Mercado Pago</option>
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta</option>
          </Select>
          <Input label="Fecha" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <AnimatePresence>
            {error ? (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <Button>
            <ShoppingBag className="h-4 w-4" />
            Registrar venta
          </Button>
        </form>
        <SaleSuccessToast alert={saleAlert} onClose={() => setSaleAlert(null)} />
      </motion.section>
      <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
        <SectionTitle title="Resumen de venta" subtitle={selected ? selected.name : "Selecciona un producto"} />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <ImpactCard icon={CreditCard} label="Venta" value={currency(revenue)} />
          <ImpactCard icon={ReceiptText} label="Costo" value={currency(cost)} />
          <ImpactCard icon={TrendingUp} label="Ganancia" value={currency(profit)} positive />
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-white/70">
          <div className="grid grid-cols-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
            <span>Producto</span>
            <span>Cantidad</span>
            <span className="text-right">Margen</span>
          </div>
          <div className="grid grid-cols-3 px-4 py-4 text-sm">
            <span className="font-semibold">{selected?.name ?? "-"}</span>
            <span>{quantityValue}</span>
            <span className="text-right font-semibold text-gain">{revenue ? Math.round((profit / revenue) * 100) : 0}%</span>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function handleFormKeyboardNavigation(event: KeyboardEvent<HTMLFormElement>) {
  const key = event.key;
  if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Enter"].includes(key)) return;

  const target = event.target as HTMLElement | null;
  if (!target || target.closest("[data-keyboard-ignore='true']")) return;

  const form = event.currentTarget;
  const controls = Array.from(
    form.querySelectorAll<HTMLElement>(
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

  if (key !== "Enter") return;

  const targetButton = target instanceof HTMLButtonElement;

  if (targetButton) return;

  const editableControls = controls.filter(isEditableFormControl);
  const editableIndex = editableControls.findIndex((control) => control === target);

  event.preventDefault();
  if (editableIndex >= 0 && editableIndex < editableControls.length - 1) {
    editableControls[editableIndex + 1]?.focus();
    return;
  }

  form.requestSubmit();
}

function toPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toNonNegativeInteger(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
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

function SaleSuccessToast({
  alert,
  onClose,
}: {
  alert: { product: string; quantity: number; revenue: number; profit: number } | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {alert ? (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed inset-x-3 top-4 z-50 mx-auto max-w-md rounded-[1.5rem] border border-gain/20 bg-white/90 p-4 shadow-premium backdrop-blur-2xl sm:left-auto sm:right-5 sm:mx-0"
          initial={{ opacity: 0, y: -16, scale: 0.96, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, scale: 0.96, filter: "blur(8px)" }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gain/10 text-gain">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">Venta registrada</p>
                  <p className="mt-1 text-sm text-black/50">
                    {alert.quantity} {alert.product}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1 text-black/35 transition-colors hover:bg-black/[0.04] hover:text-black"
                  aria-label="Cerrar alerta"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-black/[0.035] px-3 py-2">
                  <p className="text-xs text-black/40">Venta</p>
                  <p className="font-semibold">{currency(alert.revenue)}</p>
                </div>
                <div className="rounded-2xl bg-gain/10 px-3 py-2 text-gain">
                  <p className="text-xs text-gain/70">Ganancia</p>
                  <p className="font-semibold">+{currency(alert.profit)}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function History() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("todos");
  const movements = useStockStore((state) => state.movements).filter((movement) => {
    const matches = `${movement.title} ${movement.detail}`.toLowerCase().includes(query.toLowerCase());
    const typeOk = type === "todos" || movement.type === type;
    return matches && typeOk;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5">
      <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <SectionTitle title="Historial" subtitle="Timeline de compras, ventas, ganancias y movimientos de stock" />
          <div className="grid gap-3 sm:grid-cols-[1fr_180px] lg:w-[520px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <Input className="pl-11" placeholder="Buscar movimiento..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="venta">Ventas</option>
              <option value="compra">Compras</option>
              <option value="stock">Stock</option>
              <option value="producto">Productos</option>
            </Select>
          </div>
        </div>
      </motion.section>
      <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
        <Timeline movements={movements} />
      </motion.section>
    </motion.div>
  );
}

function Stats() {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const metrics = useMetrics(products, movements);
  const productChart = products.map((product) => ({ name: product.brand, vendidos: product.sold, stock: product.stock }));
  const sellerData = ["Juli", "Mica", "Sofi"].map((seller) => ({
    seller,
    ventas: movements.filter((movement) => movement.seller === seller).reduce((sum, movement) => sum + movement.amount, 0) || Math.round(metrics.sales / 3),
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5">
      <motion.div variants={container} className="grid gap-4 sm:grid-cols-3">
        <motion.div variants={item}><ImpactCard icon={CircleDollarSign} label="Venta mensual" value={currency(metrics.sales)} /></motion.div>
        <motion.div variants={item}><ImpactCard icon={WalletCards} label="Ganancia mensual" value={currency(metrics.profit)} positive /></motion.div>
        <motion.div variants={item}><ImpactCard icon={Boxes} label="Productos bajos" value={`${products.filter(isLowStock).length}`} /></motion.div>
      </motion.div>
      <div className="grid gap-5 xl:grid-cols-2">
        <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
          <SectionTitle title="Ventas por producto" subtitle="Ranking visual de unidades vendidas" />
          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(17,17,17,0.06)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 18, border: "1px solid rgba(17,17,17,0.08)" }} />
                <Bar dataKey="vendidos" radius={[14, 14, 4, 4]} animationDuration={900}>
                  {productChart.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
        <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
          <SectionTitle title="Ventas por vendedor" subtitle="Distribución visual de performance" />
          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sellerData} dataKey="ventas" nameKey="seller" innerRadius={72} outerRadius={116} paddingAngle={5} animationDuration={1000}>
                  {sellerData.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => currency(Number(value))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(17,17,17,0.08)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>
      <motion.section variants={item} className="glass rounded-[1.75rem] p-5">
        <SectionTitle title="Estado de stock" subtitle="Productos agotados, bajos y más vendidos" />
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => <StockAlert key={product.id} product={product} />)}
        </div>
      </motion.section>
    </motion.div>
  );
}

function Timeline({ movements, limit }: { movements?: ReturnType<typeof useStockStore.getState>["movements"]; limit?: number }) {
  const storeMovements = useStockStore((state) => state.movements);
  const deleteMovement = useStockStore((state) => state.deleteMovement);
  const rows = (movements ?? storeMovements).slice(0, limit);
  if (!rows.length) return <EmptyState title="Sin movimientos" text="Todavía no hay actividad para mostrar." />;

  async function removeMovement(movementId: string) {
    const ok = window.confirm("Eliminar este movimiento del historial?");
    if (!ok) return;
    await deleteMovement(movementId);
  }

  return (
    <div className="mt-5 grid gap-4">
      {rows.map((movement, index) => (
        <motion.div
          key={movement.id}
          className="relative grid gap-3 rounded-3xl border border-line bg-white/72 p-4 shadow-sm sm:grid-cols-[auto_1fr_auto]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.045 }}
          whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.95)" }}
        >
          <div className={`grid h-10 w-10 place-items-center rounded-2xl ${movement.type === "venta" ? "bg-gain/10 text-gain" : movement.type === "compra" ? "bg-amber/10 text-amber" : "bg-black/[0.05] text-ink"}`}>
            {movement.type === "venta" ? <ShoppingBag className="h-4 w-4" /> : movement.type === "compra" ? <PackagePlus className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{movement.title}</p>
              <Badge>{movement.type}</Badge>
            </div>
            <p className="mt-1 text-sm text-black/48">{movement.detail}</p>
          </div>
          <div className="flex items-start justify-between gap-3 sm:justify-end">
            <div className="text-left sm:text-right">
              <p className="font-semibold">{movement.amount ? currency(movement.amount) : "-"}</p>
              <p className="text-xs text-black/42">{movement.date}</p>
              {movement.profit ? <p className="mt-1 text-xs font-semibold text-gain">+{currency(movement.profit)}</p> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => void removeMovement(movement.id)}
              aria-label="Eliminar movimiento"
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-black/48">{subtitle}</p>
    </div>
  );
}

function ImpactCard({ icon: Icon, label, value, positive }: { icon: typeof CircleDollarSign; label: string; value: string; positive?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[1.5rem] border border-line bg-white/78 p-5 shadow-soft"
    >
      <BorderBeam />
      <div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-black/[0.04]">
        <Icon className={`h-5 w-5 ${positive ? "text-gain" : "text-ink"}`} />
      </div>
      <p className="text-sm text-black/48">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${positive ? "text-gain" : ""}`}>{value}</p>
    </motion.div>
  );
}

function StockAlert({ product }: { product: Product }) {
  const low = isLowStock(product);
  const percent = Math.min(100, Math.round((product.stock / (LOW_STOCK_LIMIT * 2)) * 100));
  return (
    <motion.div
      className="rounded-3xl border border-line bg-white/76 p-4 shadow-sm"
      whileHover={{ y: -3, scale: 1.01 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-black/45">{product.brand}</p>
        </div>
        <Badge danger={low}>{low ? "Bajo" : "OK"}</Badge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[0.06]">
        <motion.div
          className={`h-full rounded-full ${low ? "bg-danger" : "bg-gain"}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-xs text-black/42">{product.stock} unidades · alerta bajo {LOW_STOCK_LIMIT}</p>
    </motion.div>
  );
}

function StockBadge({ product }: { product: Product }) {
  const low = isLowStock(product);
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${low ? "bg-danger/10 text-danger" : "bg-gain/10 text-gain"}`}>
      {product.stock} u.
    </span>
  );
}

function isLowStock(product: Product) {
  return product.stock <= LOW_STOCK_LIMIT;
}

function Badge({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${danger ? "bg-danger/10 text-danger" : "bg-black/[0.05] text-black/55"}`}>
      {children}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.035] p-3">
      <p className="text-xs text-black/42">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-white/50 p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-black/45">{text}</p>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="h-1.5 w-1.5 rounded-full bg-white"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: dot * 0.12 }}
        />
      ))}
    </span>
  );
}

function useMetrics(products: Product[], movements: ReturnType<typeof useStockStore.getState>["movements"]) {
  return useMemo(() => {
    const sales = movements.filter((movement) => movement.type === "venta").reduce((sum, movement) => sum + movement.amount, 0);
    const profit = movements.filter((movement) => movement.type === "venta").reduce((sum, movement) => sum + movement.profit, 0);
    const stock = products.reduce((sum, product) => sum + product.stock, 0);
    const revenuePotential = products.reduce((sum, product) => sum + product.price * product.stock, 0);
    const costPotential = products.reduce((sum, product) => sum + product.cost * product.stock, 0);
    const margin = revenuePotential ? ((revenuePotential - costPotential) / revenuePotential) * 100 : 0;
    return { sales, profit, stock, margin };
  }, [products, movements]);
}
