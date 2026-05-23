"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  Layers3,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { currency, today } from "@/lib/utils";
import { Movement, Product, useStockStore } from "@/lib/store";

type View = "dashboard" | "stock" | "carga" | "ventas" | "precios";
type SaleStatus = (typeof SALE_STATUSES)[number]["id"];
type SaleFilter = "todos" | SaleStatus;

const LOW_STOCK_LIMIT = 5;
const SESSION_KEY = "matesxvos-dashboard-session";
const VENDORS = ["Julian", "Santiago"] as const;
const SALE_STATUSES = [
  { id: "pendiente", label: "Pendiente" },
  { id: "entregado", label: "Entregado" },
  { id: "cancelado", label: "Cancelado" },
] as const;

const navItems: { id: View; label: string; short: string; icon: typeof Boxes }[] = [
  { id: "dashboard", label: "Dashboard", short: "Inicio", icon: LayoutDashboard },
  { id: "stock", label: "Productos", short: "Stock", icon: Boxes },
  { id: "carga", label: "Carga", short: "Carga", icon: PackagePlus },
  { id: "ventas", label: "Ventas", short: "Ventas", icon: ShoppingBag },
  { id: "precios", label: "Precios", short: "PDF", icon: Download },
];

const pageTransition = {
  initial: { opacity: 0, y: 18, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(8px)" },
  transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
};

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const hydrate = useStockStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setSignedIn(window.localStorage.getItem(SESSION_KEY) === "active");
    setSessionReady(true);
  }, []);

  if (!sessionReady) {
    return <div className="min-h-screen bg-[#f7f7f5]" />;
  }

  if (!signedIn) {
    return <LoginScreen onLogin={() => setSignedIn(true)} />;
  }

  return (
    <main className="min-h-screen overflow-x-hidden text-ink">
      <Shell view={view} setView={setView} onLogout={() => setSignedIn(false)}>
        <AnimatePresence mode="wait">
          <motion.section key={view} {...pageTransition}>
            {view === "dashboard" && <DashboardView setView={setView} />}
            {view === "stock" && <StockView setView={setView} />}
            {view === "carga" && <LoadStockView />}
            {view === "ventas" && <SalesView />}
            {view === "precios" && <PricesView />}
          </motion.section>
        </AnimatePresence>
      </Shell>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [operator, setOperator] = useState("Mates x Vos");

  useEffect(() => {
    if (!panelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".login-reveal",
        { opacity: 0, y: 18, filter: "blur(10px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.75, stagger: 0.08, ease: "power3.out" },
      );
    }, panelRef);
    return () => ctx.revert();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    window.localStorage.setItem(SESSION_KEY, "active");
    onLogin();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 text-ink">
      <div ref={panelRef} className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="login-reveal">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/40">Mates x Vos</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Operacion diaria, stock y ventas en un panel premium.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-black/55">
            Un sistema liviano para vender mas rapido, ver el inventario, controlar encargos y compartir precios con clientes.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric label="Stock" value="Tiempo real" />
            <Metric label="Ventas" value="Estados" />
            <Metric label="Precios" value="PDF" />
          </div>
        </section>

        <section className="login-reveal rounded-[2rem] border border-line bg-white/88 p-5 shadow-premium backdrop-blur-2xl sm:p-7">
          <div className="rounded-[1.5rem] border border-line bg-black p-5 text-white">
            <p className="text-sm text-white/55">Acceso al panel</p>
            <p className="mt-2 text-2xl font-semibold">Dashboard SaaS</p>
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Input label="Operador" value={operator} onChange={(event) => setOperator(event.target.value)} />
            <Input label="Clave" type="password" placeholder="Acceso local" />
            <Button>
              <CheckCircle2 className="h-4 w-4" />
              Entrar al sistema
            </Button>
          </form>
          <p className="mt-4 text-xs leading-5 text-black/42">
            Acceso visual local para separar el panel del escritorio. La seguridad real debe conectarse a Supabase Auth cuando haya usuarios.
          </p>
        </section>
      </div>
    </main>
  );
}

function Shell({
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
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const remote = useStockStore((state) => state.remote);
  const metrics = useMemo(() => getMetrics(products, movements), [products, movements]);

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    onLogout();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px]">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-line bg-white/78 px-4 py-5 backdrop-blur-2xl lg:block">
        <Brand />
        <nav className="mt-8 grid gap-1">
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />
          ))}
        </nav>
        <div className="mt-8 rounded-[1.5rem] border border-line bg-[#fbfbfa] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-black/38">Estado</p>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${remote ? "bg-gain" : "bg-amber"}`} />
            {remote ? "Supabase activo" : "Modo local"}
          </div>
        </div>
        <Button className="mt-4 w-full justify-start" variant="ghost" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-line bg-white/82 backdrop-blur-2xl lg:top-0">
          <div className="px-3 py-3 sm:px-5 lg:px-8">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <Brand compact />
              <Button variant="ghost" size="icon" onClick={logout} aria-label="Salir">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1 lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`grid h-12 place-items-center rounded-2xl text-[0.68rem] font-semibold transition ${
                      active ? "bg-ink text-white shadow-soft" : "text-black/48 hover:bg-black/[0.04]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="mt-0.5">{item.short}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 hidden gap-3 sm:grid sm:grid-cols-4">
              <Metric label="Stock" value={`${metrics.stock} u.`} />
              <Metric label="Ventas" value={currency(metrics.sales)} />
              <Metric label="Ganancia" value={currency(metrics.profit)} />
              <Metric label="Pendientes" value={String(metrics.pending)} />
            </div>
          </div>
        </header>
        <div className="px-3 py-4 sm:px-5 lg:px-8 lg:py-8">{children}</div>
      </div>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-white shadow-soft">
        <span className="text-sm font-semibold">MV</span>
      </div>
      <div className="min-w-0">
        <p className={`${compact ? "text-base" : "text-lg"} truncate font-semibold tracking-tight`}>Mates x Vos</p>
        <p className="truncate text-xs text-black/42">Stock, ventas y precios</p>
      </div>
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
      className={`flex h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition ${
        active ? "bg-ink text-white shadow-soft" : "text-black/52 hover:bg-black/[0.04] hover:text-ink"
      }`}
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
  const chartData = useMemo(() => buildChartData(movements), [movements]);
  const lowProducts = products.filter((product) => product.stock <= LOW_STOCK_LIMIT).slice(0, 5);

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[2rem] border border-line bg-white/82 p-5 shadow-premium backdrop-blur-2xl sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/38">Panel operativo</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Dashboard moderno para vender, controlar stock y gestionar encargos.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/52 sm:text-base">
              Informacion clara, acciones rapidas y una experiencia responsive pensada para uso diario.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setView("ventas")}>
              <Plus className="h-4 w-4" />
              Nueva venta
            </Button>
            <Button variant="secondary" onClick={() => setView("stock")}>
              <Boxes className="h-4 w-4" />
              Ver productos
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Layers3} label="Unidades en stock" value={`${metrics.stock} u.`} detail={`${products.length} productos`} />
        <KpiCard icon={WalletCards} label="Ventas registradas" value={currency(metrics.sales)} detail={`${metrics.salesCount} movimientos`} />
        <KpiCard icon={TrendingUp} label="Ganancia estimada" value={currency(metrics.profit)} detail="Segun costo cargado" positive />
        <KpiCard icon={Activity} label="Encargos pendientes" value={String(metrics.pending)} detail="Requieren seguimiento" warning />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel title="Actividad comercial" subtitle="Ventas recientes agrupadas por fecha">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111111" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#111111" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(17,17,17,0.06)" strokeDasharray="4 4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 12 }} tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={(value) => currency(Number(value))} contentStyle={{ borderRadius: 18, border: "1px solid rgba(17,17,17,0.08)" }} />
                <Area type="monotone" dataKey="ventas" stroke="#111111" strokeWidth={3} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Stock critico" subtitle="Productos con pocas unidades">
          <div className="grid gap-3">
            {lowProducts.length ? (
              lowProducts.map((product) => (
                <div key={product.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="mt-1 text-sm text-black/45">{productLocation(product)}</p>
                    </div>
                    <StockPill product={product} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Stock saludable" text="No hay productos criticos." />
            )}
          </div>
        </Panel>
      </section>

      <Panel title="Distribucion de stock" subtitle="Unidades disponibles por producto">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={products.slice(0, 8).map((product) => ({ name: product.name, stock: product.stock }))}>
              <CartesianGrid stroke="rgba(17,17,17,0.06)" strokeDasharray="4 4" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(17,17,17,0.45)", fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 18, border: "1px solid rgba(17,17,17,0.08)" }} />
              <Bar dataKey="stock" fill="#111111" radius={[14, 14, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function StockView({ setView }: { setView: (view: View) => void }) {
  const products = useStockStore((state) => state.products);
  const addProduct = useStockStore((state) => state.addProduct);
  const updateProduct = useStockStore((state) => state.updateProduct);
  const deleteProduct = useStockStore((state) => state.deleteProduct);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("todos");
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = products.filter((product) => {
    const matches = `${product.name} ${product.brand} ${productLocation(product)}`.toLowerCase().includes(search.toLowerCase());
    const statusOk =
      stockFilter === "todos" ||
      (stockFilter === "bajo" && product.stock <= LOW_STOCK_LIMIT) ||
      (stockFilter === "ok" && product.stock > LOW_STOCK_LIMIT);
    return matches && statusOk;
  });

  return (
    <section className="grid gap-5">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/35">Inventario</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Productos</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setView("carga")}>
              <PackagePlus className="h-4 w-4" />
              Cargar stock
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <Input className="pl-11" placeholder="Buscar producto, proveedor o ubicacion" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} aria-label="Filtrar stock">
            <option value="todos">Todos</option>
            <option value="ok">Stock OK</option>
            <option value="bajo">Stock bajo</option>
          </Select>
        </div>
      </Panel>

      <div className="hidden overflow-hidden rounded-[2rem] border border-line bg-white/88 shadow-soft backdrop-blur-xl lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-black/[0.025] text-xs font-semibold uppercase tracking-wide text-black/42">
              <th className="px-5 py-4">Producto</th>
              <th className="px-5 py-4">Proveedor</th>
              <th className="px-5 py-4">Ubicacion</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Costo</th>
              <th className="px-5 py-4">Precio</th>
              <th className="px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-line transition-colors last:border-0 hover:bg-black/[0.018]">
                <td className="px-5 py-4 font-semibold">{product.name}</td>
                <td className="px-5 py-4 text-black/55">{product.brand}</td>
                <td className="px-5 py-4 text-black/55">{productLocation(product)}</td>
                <td className="px-5 py-4"><StockPill product={product} /></td>
                <td className="px-5 py-4">{currency(product.cost)}</td>
                <td className="px-5 py-4 font-semibold">{currency(product.price)}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="icon" onClick={() => { setEditing(product); setModalOpen(true); }} aria-label="Editar">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void confirmDelete(product, deleteProduct)} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <EmptyState title="Sin productos" text="Agrega productos para iniciar el inventario." /> : null}
      </div>

      <div className="grid gap-3 lg:hidden">
        {filtered.map((product) => (
          <motion.article key={product.id} layout className="rounded-[1.6rem] border border-line bg-white/92 p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">{product.name}</p>
                <p className="mt-1 break-words text-sm text-black/48">{product.brand} · {productLocation(product)}</p>
              </div>
              <StockPill product={product} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Mini label="Costo" value={currency(product.cost)} />
              <Mini label="Precio" value={currency(product.price)} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" variant="secondary" onClick={() => { setEditing(product); setModalOpen(true); }}>
                <Edit3 className="h-4 w-4" />
                Editar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void confirmDelete(product, deleteProduct)} aria-label="Eliminar">
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          </motion.article>
        ))}
        {!filtered.length ? <EmptyState title="Sin productos" text="Agrega productos para iniciar el inventario." /> : null}
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
    <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Carga de stock" subtitle="Ingreso rapido de mercaderia con actualizacion automatica.">
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
          <Select label="Producto" value={productId} required onChange={(event) => { const product = products.find((item) => item.id === event.target.value); setProductId(event.target.value); setUnitCost(product ? String(product.cost) : ""); setDone(""); }}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Input label="Costo unitario" required type="number" min={1} value={unitCost} onChange={(event) => setUnitCost(event.target.value)} />
          </div>
          <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Button disabled={!products.length}>
            <PackagePlus className="h-4 w-4" />
            Guardar carga
          </Button>
        </form>
        {done ? <SuccessMessage text={done} /> : null}
      </Panel>

      <Panel title="Vista previa" subtitle="Impacto estimado antes de guardar">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Producto" value={selected?.name ?? "-"} />
          <Metric label="Stock actual" value={`${selected?.stock ?? 0} u.`} />
          <Metric label="Ubicacion" value={selected ? productLocation(selected) : "-"} />
          <Metric label="Nuevo costo" value={currency(toPositiveNumber(unitCost))} />
        </div>
      </Panel>
    </section>
  );
}

function SalesView() {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const registerSale = useStockStore((state) => state.registerSale);
  const updateSaleStatus = useStockStore((state) => state.updateSaleStatus);
  const deleteMovement = useStockStore((state) => state.deleteMovement);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SaleFilter>("todos");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [seller, setSeller] = useState<(typeof VENDORS)[number]>("Julian");
  const [payment, setPayment] = useState("Mercado Pago");
  const [status, setStatus] = useState<SaleStatus>("entregado");
  const [date, setDate] = useState(today());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = products.find((product) => product.id === productId);
  const quantityValue = toPositiveInteger(quantity);
  const total = (selected?.price ?? 0) * quantityValue;
  const sales = movements.filter((movement) => movement.type === "venta");
  const visibleSales = sales.filter((sale) => statusFilter === "todos" || saleStatus(sale) === statusFilter);
  const totalSales = visibleSales.reduce((sum, sale) => sum + sale.amount, 0);
  const pendingCount = sales.filter((sale) => saleStatus(sale) === "pendiente").length;

  useEffect(() => {
    if (productId || !products[0]) return;
    setProductId(products[0].id);
  }, [productId, products]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await registerSale({ productId, quantity: quantityValue, seller, payment, date, status });
    if (!ok) {
      setMessage("");
      setError("No hay stock suficiente para esa venta.");
      return;
    }
    setError("");
    setMessage(`Venta registrada: ${quantityValue} ${selected?.name ?? "producto"} por ${currency(total)}.`);
    setModalOpen(false);
    setQuantity("1");
    setStatus("entregado");
  }

  return (
    <section className="grid gap-5">
      <Panel>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-black/35">POS & encargos</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Ventas</h1>
          </div>
          <Button onClick={() => setModalOpen(true)} disabled={!products.length}>
            <Plus className="h-4 w-4" />
            Agregar venta
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Mostrando" value={String(visibleSales.length)} />
          <Metric label="Pendientes" value={String(pendingCount)} />
          <Metric label="Total visible" value={currency(totalSales)} />
        </div>
        {message ? <SuccessMessage text={message} /> : null}
        {error ? <ErrorMessage text={error} /> : null}
      </Panel>

      <div className="overflow-hidden rounded-[2rem] border border-line bg-white/88 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusFilterButton active={statusFilter === "todos"} onClick={() => setStatusFilter("todos")}>Todos</StatusFilterButton>
            {SALE_STATUSES.map((entry) => (
              <StatusFilterButton key={entry.id} active={statusFilter === entry.id} onClick={() => setStatusFilter(entry.id)}>
                {entry.label}
              </StatusFilterButton>
            ))}
          </div>
          <p className="text-sm text-black/50">{visibleSales.length} movimientos</p>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-black/[0.025] text-xs font-semibold uppercase tracking-wide text-black/42">
                <th className="px-5 py-4">Venta / encargo</th>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Vendedor</th>
                <th className="px-5 py-4">Pago</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4 text-right">Total</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleSales.map((sale) => (
                <tr key={sale.id} className="border-b border-line transition-colors last:border-0 hover:bg-black/[0.018]">
                  <td className="px-5 py-4 font-semibold">{sale.detail}</td>
                  <td className="px-5 py-4 text-black/55">{sale.date}</td>
                  <td className="px-5 py-4 text-black/55">{sale.seller ?? "-"}</td>
                  <td className="px-5 py-4 text-black/55">{sale.payment ?? "-"}</td>
                  <td className="px-5 py-4">
                    <SaleStatusSelect value={saleStatus(sale)} onChange={(nextStatus) => void updateSaleStatus(sale.id, nextStatus)} />
                  </td>
                  <td className="px-5 py-4 text-right font-semibold">{currency(sale.amount)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => void removeSale(sale, deleteMovement)} aria-label="Eliminar venta">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-0 divide-y divide-line lg:hidden">
          {visibleSales.map((sale) => (
            <article key={sale.id} className="grid gap-3 px-4 py-4">
              <div className="grid gap-2">
                <p className="break-words font-semibold">{sale.detail}</p>
                <p className="break-words text-sm text-black/48">{sale.date} · {sale.seller ?? "Sin vendedor"} · {sale.payment ?? "Sin pago"}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <SaleStatusSelect value={saleStatus(sale)} onChange={(nextStatus) => void updateSaleStatus(sale.id, nextStatus)} />
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{currency(sale.amount)}</p>
                  <Button variant="ghost" size="icon" onClick={() => void removeSale(sale, deleteMovement)} aria-label="Eliminar venta">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!visibleSales.length ? <EmptyState title="Sin ventas" text="Cambia el filtro o agrega una venta nueva." /> : null}
      </div>

      <Button className="fixed bottom-5 right-5 z-30 h-14 rounded-full px-5 shadow-premium md:hidden" onClick={() => setModalOpen(true)}>
        <Plus className="h-5 w-5" />
        Venta
      </Button>

      <Modal open={modalOpen} title="Agregar venta" subtitle="Formulario rapido para registrar venta o encargo" onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
          <Select label="Producto" value={productId} required onChange={(event) => setProductId(event.target.value)}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} - {product.stock} u.</option>)}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Cantidad" required type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Input label="Fecha" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Estado" value={status} onChange={(event) => setStatus(event.target.value as SaleStatus)}>
              {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </Select>
            <Select label="Pago" value={payment} onChange={(event) => setPayment(event.target.value)}>
              <option>Mercado Pago</option>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              <option>A definir</option>
            </Select>
          </div>
          <Select label="Vendedor" value={seller} onChange={(event) => setSeller(event.target.value as (typeof VENDORS)[number])}>
            {VENDORS.map((vendor) => <option key={vendor} value={vendor}>{vendor}</option>)}
          </Select>
          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
            <Metric label="Producto" value={selected?.name ?? "-"} />
            <Metric label="Disponible" value={`${selected?.stock ?? 0} u.`} />
            <Metric label="Total" value={currency(total)} />
          </div>
          <Button disabled={!products.length}>
            <ShoppingBag className="h-4 w-4" />
            Guardar venta
          </Button>
        </form>
      </Modal>
    </section>
  );
}

function PricesView() {
  const products = useStockStore((state) => state.products);
  const availableProducts = products.filter((product) => product.stock > 0);

  return (
    <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
      <Panel title="Lista para clientes" subtitle="PDF corporativo con productos disponibles y precios finales.">
        <Button className="mt-2 w-full" disabled={!availableProducts.length} onClick={() => downloadPricePdf(availableProducts)}>
          <Download className="h-4 w-4" />
          Descargar PDF
        </Button>
      </Panel>

      <Panel title="Previsualizacion" subtitle={`${availableProducts.length} productos disponibles`}>
        <div className="divide-y divide-line overflow-hidden rounded-[1.5rem] border border-line bg-white">
          {availableProducts.map((product) => (
            <div key={product.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="mt-1 text-sm text-black/50">{product.brand} · {productLocation(product)}</p>
              </div>
              <p className="font-semibold">{currency(product.price)}</p>
            </div>
          ))}
          {!availableProducts.length ? <EmptyState title="Sin productos disponibles" text="Carga stock para generar la lista." /> : null}
        </div>
      </Panel>
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
  const [form, setForm] = useState({ name: "", brand: "", location: "", cost: "", price: "", stock: "" });

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
    <Modal open={open} title={product ? "Editar producto" : "Nuevo producto"} subtitle="Datos de inventario y venta" onClose={onClose}>
      <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
        <Input label="Producto" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Proveedor / marca" required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          <Input label="Ubicacion" required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Costo" required type="number" min={1} value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} />
          <Input label="Precio cliente" required type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <Input label="Stock" required type="number" min={0} value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{product ? "Guardar" : "Crear"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Panel({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-line bg-white/84 p-5 shadow-soft backdrop-blur-xl sm:p-6">
      {title ? (
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-black/48">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  positive,
  warning,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <motion.section whileHover={{ y: -4 }} className="rounded-[2rem] border border-line bg-white/86 p-5 shadow-soft backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${positive ? "bg-gain/10 text-gain" : warning ? "bg-amber/10 text-amber" : "bg-black/[0.04] text-ink"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <BarChart3 className="h-4 w-4 text-black/25" />
      </div>
      <p className="text-sm text-black/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-black/40">{detail}</p>
    </motion.section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/72 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-black/38">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.035] p-3">
      <p className="text-xs text-black/42">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function StockPill({ product }: { product: Product }) {
  const low = product.stock <= LOW_STOCK_LIMIT;
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${low ? "bg-danger/10 text-danger" : "bg-gain/10 text-gain"}`}>
      {product.stock} u.
    </span>
  );
}

function StatusFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-black/60 hover:bg-black/[0.03] hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function SaleStatusSelect({ value, onChange }: { value: SaleStatus; onChange: (status: SaleStatus) => void }) {
  const styles = {
    pendiente: "border-amber/30 bg-amber/10 text-amber",
    entregado: "border-gain/30 bg-gain/10 text-gain",
    cancelado: "border-danger/30 bg-danger/10 text-danger",
  };

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as SaleStatus)}
      className={`h-10 w-full rounded-2xl border px-3 text-xs font-semibold outline-none transition focus:ring-4 focus:ring-black/5 sm:w-fit ${styles[value]}`}
      aria-label="Cambiar estado de venta"
    >
      {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
    </select>
  );
}

function SuccessMessage({ text }: { text: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gain/10 px-4 py-3 text-sm font-medium text-gain">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}

function ErrorMessage({ text }: { text: string }) {
  return <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{text}</p>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-3 rounded-[1.5rem] border border-dashed border-black/15 bg-white/70 p-6 text-center">
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

async function removeSale(sale: Movement, deleteMovement: (id: string) => Promise<void>) {
  const ok = window.confirm("Eliminar esta venta? Si tiene producto y cantidad asociados, el stock vuelve automaticamente.");
  if (!ok) return;
  await deleteMovement(sale.id);
}

function saleStatus(movement: Movement): SaleStatus {
  if (movement.status === "pendiente" || movement.status === "cancelado" || movement.status === "entregado") return movement.status;
  return "entregado";
}

function productLocation(product: Product) {
  return product.location || product.brand || "Sin ubicacion";
}

function handleFormKeyboardNavigation(event: KeyboardEvent<HTMLFormElement>) {
  const key = event.key;
  if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Enter"].includes(key)) return;
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"),
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

function isEditableFormControl(control: HTMLElement): control is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement;
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
  const salesMovements = movements.filter((movement) => movement.type === "venta");
  return {
    stock: products.reduce((sum, product) => sum + product.stock, 0),
    inventoryValue: products.reduce((sum, product) => sum + product.stock * product.cost, 0),
    sales: salesMovements.reduce((sum, movement) => sum + movement.amount, 0),
    profit: salesMovements.reduce((sum, movement) => sum + movement.profit, 0),
    pending: salesMovements.filter((movement) => saleStatus(movement) === "pendiente").length,
    salesCount: salesMovements.length,
  };
}

function buildChartData(movements: Movement[]) {
  const sales = movements.filter((movement) => movement.type === "venta").slice(0, 14).reverse();
  if (!sales.length) {
    return [
      { date: "Lun", ventas: 0 },
      { date: "Mar", ventas: 0 },
      { date: "Mie", ventas: 0 },
      { date: "Jue", ventas: 0 },
      { date: "Vie", ventas: 0 },
    ];
  }
  return sales.map((movement) => ({ date: movement.date.slice(5), ventas: movement.amount }));
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
    if (index % 2 === 0) commands.push(`0.992 0.992 0.982 rg 40 ${y - 7} 515 24 re f`);
    commands.push(`0.88 0.88 0.84 RG 40 ${y - 7} 515 24 re S`);
    commands.push(pdfText(truncatePdfText(product.name, 30), 54, y, 10, "F2", "0.08 0.08 0.08"));
    commands.push(pdfText(truncatePdfText(product.brand, 16), 246, y, 9, "F1", "0.25 0.25 0.24"));
    commands.push(pdfText(truncatePdfText(productLocation(product), 18), 356, y, 9, "F1", "0.25 0.25 0.24"));
    commands.push(pdfText(formatPdfCurrency(product.price), 493, y, 10, "F2", "0.08 0.08 0.08"));
  });

  commands.push("0.965 0.965 0.945 rg 40 34 515 52 re f");
  commands.push("0.82 0.82 0.78 RG 40 34 515 52 re S");
  commands.push(pdfText("Precios sujetos a disponibilidad. Consultar por combos, envios y medios de pago.", 54, 66, 9, "F1", "0.25 0.25 0.24"));
  commands.push(pdfText(`Productos publicados: ${visibleProducts.length}${products.length > visibleProducts.length ? ` de ${products.length}` : ""}`, 54, 50, 9, "F2", "0.25 0.25 0.24"));

  const content = commands.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n",
    `6 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`,
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
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
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

function escapePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
