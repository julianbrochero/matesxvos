"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { cn, currency, today } from "@/lib/utils";
import { Movement, Product, useStockStore } from "@/lib/store";

type View = "dashboard" | "stock" | "carga" | "ventas" | "precios";
type LocationName = "Buenos Aires" | "Villa Maria";
type LocationFilter = "todos" | LocationName;
type SaleStatus = "pendiente" | "entregado" | "cancelado";
type SaleFilter = "todos" | SaleStatus;

const LOW_STOCK_LIMIT = 5;
const SESSION_KEY = "matesxvos-dashboard-session";
const LOCATIONS: LocationName[] = ["Buenos Aires", "Villa Maria"];
const VENDORS = ["Julian", "Santiago"] as const;
const SALE_STATUSES: { id: SaleStatus; label: string }[] = [
  { id: "pendiente", label: "Pendiente" },
  { id: "entregado", label: "Entregado" },
  { id: "cancelado", label: "Cancelado" },
];

const navItems: { id: View; label: string; short: string; icon: typeof Boxes }[] = [
  { id: "dashboard", label: "Inicio", short: "Inicio", icon: LayoutDashboard },
  { id: "stock", label: "Stock", short: "Stock", icon: Boxes },
  { id: "ventas", label: "Ventas", short: "Ventas", icon: ShoppingBag },
  { id: "carga", label: "Carga", short: "Carga", icon: PackagePlus },
  { id: "precios", label: "Precios", short: "PDF", icon: Download },
];

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

  if (!sessionReady) return <div className="min-h-screen bg-slate-50" />;

  if (!signedIn) {
    return <LoginScreen onLogin={() => setSignedIn(true)} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <AppShell view={view} setView={setView} onLogout={() => setSignedIn(false)}>
        {view === "dashboard" && <DashboardView setView={setView} />}
        {view === "stock" && <StockView setView={setView} />}
        {view === "ventas" && <SalesView />}
        {view === "carga" && <PurchasesView />}
        {view === "precios" && <PricesView />}
      </AppShell>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [operator, setOperator] = useState("Mates x Vos");

  function submit(event: FormEvent) {
    event.preventDefault();
    window.localStorage.setItem(SESSION_KEY, "active");
    onLogin();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Mates x Vos</h1>
        <p className="mt-1 text-sm text-slate-500">Stock, ventas y precios.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Input label="Operador" value={operator} onChange={(event) => setOperator(event.target.value)} />
          <Input label="Clave" type="password" placeholder="Acceso local" />
          <Button>
            <CheckCircle2 className="h-4 w-4" />
            Entrar
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
  const remote = useStockStore((state) => state.remote);

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    onLogout();
  }

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
        <Brand />
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => navigate(item.id)} />
          ))}
        </nav>
        <div className="mt-6 rounded-lg border border-slate-200 p-3 text-sm">
          <p className="font-medium">Estado</p>
          <p className="mt-1 text-slate-500">{remote ? "Supabase activo" : "Modo local"}</p>
        </div>
        <Button className="mt-3 w-full justify-start" variant="ghost" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/20" type="button" aria-label="Cerrar menu" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-[82vw] max-w-xs bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <Brand />
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="mt-6 grid gap-1">
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
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </header>
        <div className="px-4 py-5 pb-24 sm:px-6 lg:py-6">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={cn(
                  "grid h-16 place-items-center content-center gap-1 text-xs font-medium transition",
                  active ? "text-slate-950" : "text-slate-500",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.short}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn("truncate font-semibold tracking-tight", compact ? "text-base" : "text-lg")}>Mates x Vos</p>
      {!compact ? <p className="text-xs text-slate-500">Inventario simple</p> : null}
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
        "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
        active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
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
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("todos");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("todos");
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = products.filter((product) => {
    const query = `${product.name} ${product.brand} ${productLocation(product)}`.toLowerCase();
    const matches = query.includes(search.toLowerCase());
    const locationOk = locationMatches(product, locationFilter);
    const statusOk =
      stockFilter === "todos" ||
      (stockFilter === "bajo" && product.stock <= LOW_STOCK_LIMIT) ||
      (stockFilter === "ok" && product.stock > LOW_STOCK_LIMIT);
    return matches && locationOk && statusOk;
  });

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

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Ubicacion</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-slate-600">{product.brand}</td>
                <td className="px-4 py-3 text-slate-600">{productLocation(product)}</td>
                <td className="px-4 py-3">
                  <StockEditor product={product} onSave={(stock) => void updateStock(product.id, stock)} />
                </td>
                <td className="px-4 py-3 font-medium">{currency(product.price)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="icon" onClick={() => { setEditing(product); setModalOpen(true); }} aria-label="Editar producto">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => void confirmDelete(product, deleteProduct)} aria-label="Eliminar producto">
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
          <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-medium">{product.name}</p>
                <p className="mt-1 text-sm text-slate-500">{product.brand} - {productLocation(product)}</p>
              </div>
              <StockPill product={product} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Info label="Costo" value={currency(product.cost)} />
              <Info label="Precio" value={currency(product.price)} />
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
              <StockEditor product={product} onSave={(stock) => void updateStock(product.id, stock)} />
              <Button variant="secondary" size="icon" onClick={() => { setEditing(product); setModalOpen(true); }} aria-label="Editar producto">
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => void confirmDelete(product, deleteProduct)} aria-label="Eliminar producto">
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

function SalesView() {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const registerSale = useStockStore((state) => state.registerSale);
  const updateSaleStatus = useStockStore((state) => state.updateSaleStatus);
  const deleteMovement = useStockStore((state) => state.deleteMovement);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SaleFilter>("todos");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("todos");
  const [saleLocation, setSaleLocation] = useState<LocationName>("Buenos Aires");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [seller, setSeller] = useState<(typeof VENDORS)[number]>("Julian");
  const [payment, setPayment] = useState("Mercado Pago");
  const [status, setStatus] = useState<SaleStatus>("entregado");
  const [date, setDate] = useState(today());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = products.find((product) => product.id === productId);
  const saleProducts = useMemo(
    () => products.filter((product) => productLocation(product) === saleLocation),
    [products, saleLocation],
  );
  const quantityValue = toPositiveInteger(quantity);
  const total = (selected?.price ?? 0) * quantityValue;
  const sales = movements.filter((movement) => movement.type === "venta");
  const visibleSales = sales.filter((sale) => {
    const statusOk = statusFilter === "todos" || saleStatus(sale) === statusFilter;
    const locationOk = movementMatchesLocation(sale, products, locationFilter);
    return statusOk && locationOk;
  });

  useEffect(() => {
    if (saleProducts.some((product) => product.id === productId)) return;
    setProductId(saleProducts[0]?.id ?? "");
  }, [productId, saleProducts]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await registerSale({ productId, quantity: quantityValue, seller, payment, date, status });
    if (!ok) {
      setMessage("");
      setError("No hay stock suficiente.");
      return;
    }
    setError("");
    setMessage("Venta registrada.");
    setModalOpen(false);
    setQuantity("1");
    setStatus("entregado");
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
            <SummaryPill label="Total" value={String(visibleSales.length)} />
            <SummaryPill label="Pendientes" value={String(sales.filter((sale) => saleStatus(sale) === "pendiente").length)} />
            <SummaryPill label="Vendido" value={currency(visibleSales.reduce((sum, sale) => sum + sale.amount, 0))} />
          </div>
          <LocationFilterSelect value={locationFilter} onChange={setLocationFilter} label="Todas" />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SaleFilter)} aria-label="Filtrar ventas">
            <option value="todos">Todos</option>
            {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </Select>
        </div>
      </Panel>

      {message ? <SuccessMessage text={message} /> : null}
      {error ? <ErrorMessage text={error} /> : null}

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Venta</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{sale.detail}</p>
                  <p className="text-xs text-slate-500">{sale.seller ?? "Sin vendedor"} - {movementLocation(sale, products)}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{sale.date}</td>
                <td className="px-4 py-3 text-slate-600">{sale.payment ?? "-"}</td>
                <td className="px-4 py-3">
                  <SaleStatusSelect value={saleStatus(sale)} onChange={(nextStatus) => void updateSaleStatus(sale.id, nextStatus)} />
                </td>
                <td className="px-4 py-3 text-right font-medium">{currency(sale.amount)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => void removeSale(sale, deleteMovement)} aria-label="Eliminar venta">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
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
            location={movementLocation(sale, products)}
            onDelete={() => void removeSale(sale, deleteMovement)}
            onStatusChange={(nextStatus) => void updateSaleStatus(sale.id, nextStatus)}
          />
        ))}
        {!visibleSales.length ? <EmptyState title="Sin ventas" text="Registra una venta nueva." /> : null}
      </div>

      <Button className="fixed bottom-20 right-4 z-30 rounded-full shadow-lg md:hidden" onClick={() => setModalOpen(true)} disabled={!products.length}>
        <Plus className="h-5 w-5" />
        Venta
      </Button>

      <Modal open={modalOpen} title="Agregar venta" subtitle="Formulario rapido" onClose={() => setModalOpen(false)}>
        <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
          <Select label="Ubicacion" value={saleLocation} onChange={(event) => setSaleLocation(event.target.value as LocationName)}>
            {LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}
          </Select>
          <Select label="Producto" value={productId} required onChange={(event) => setProductId(event.target.value)}>
            {saleProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - {product.stock} u.</option>)}
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
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Disponible</span>
              <span className="font-medium">{selected?.stock ?? 0} u.</span>
            </div>
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-slate-500">Total</span>
              <span className="font-medium">{currency(total)}</span>
            </div>
          </div>
          <Button disabled={!saleProducts.length}>
            <ShoppingBag className="h-4 w-4" />
            Guardar venta
          </Button>
        </form>
      </Modal>
    </section>
  );
}

function PurchasesView() {
  const products = useStockStore((state) => state.products);
  const movements = useStockStore((state) => state.movements);
  const registerPurchase = useStockStore((state) => state.registerPurchase);
  const [stockLocation, setStockLocation] = useState<LocationName>("Buenos Aires");
  const locationProducts = useMemo(
    () => products.filter((product) => productLocation(product) === stockLocation),
    [products, stockLocation],
  );
  const [productId, setProductId] = useState(locationProducts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(locationProducts[0] ? String(locationProducts[0].cost) : "");
  const [date, setDate] = useState(today());
  const [done, setDone] = useState("");
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
    setDone("Stock actualizado.");
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-5">
        <PageHeader title="Carga" description="Ingreso rapido de mercaderia." />
        <Panel title="Agregar stock">
          <form onSubmit={submit} onKeyDown={handleFormKeyboardNavigation} className="grid gap-4">
            <Select label="Ubicacion" value={stockLocation} onChange={(event) => { setStockLocation(event.target.value as LocationName); setDone(""); }}>
              {LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}
            </Select>
            <Select label="Producto" value={productId} required onChange={(event) => { const product = locationProducts.find((item) => item.id === event.target.value); setProductId(event.target.value); setUnitCost(product ? String(product.cost) : ""); setDone(""); }}>
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
          {done ? <SuccessMessage text={done} /> : null}
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
  const [generating, setGenerating] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("todos");
  const availableProducts = products.filter((product) => product.stock > 0 && locationMatches(product, locationFilter));

  async function handleDownload() {
    setGenerating(true);
    try {
      await downloadPricePdf(availableProducts);
    } catch {
      window.alert("No se pudo generar el PDF. Intentalo de nuevo.");
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
            <div key={product.id} className="grid gap-1 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-slate-500">{product.brand} - {productLocation(product)}</p>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
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
  location,
  onDelete,
  onStatusChange,
}: {
  sale: Movement;
  location: string;
  onDelete: () => void;
  onStatusChange: (status: SaleStatus) => void;
}) {
  const status = saleStatus(sale);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SaleStatusBadge status={status} />
          <p className="mt-2 break-words font-medium">{sale.detail}</p>
          <p className="mt-1 text-sm text-slate-500">{sale.date} - {sale.seller ?? "Sin vendedor"} - {location}</p>
        </div>
        <p className="shrink-0 font-semibold">{currency(sale.amount)}</p>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <SaleStatusSelect value={status} onChange={onStatusChange} />
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar venta">
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </article>
  );
}

function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const styles: Record<SaleStatus, string> = {
    pendiente: "bg-amber-50 text-amber-700",
    entregado: "bg-emerald-50 text-emerald-700",
    cancelado: "bg-red-50 text-red-700",
  };
  const label = SALE_STATUSES.find((entry) => entry.id === status)?.label ?? "Pendiente";
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", styles[status])}>{label}</span>;
}

function SaleStatusSelect({ value, onChange }: { value: SaleStatus; onChange: (status: SaleStatus) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as SaleStatus)}
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
      aria-label="Cambiar estado"
    >
      {SALE_STATUSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
    </select>
  );
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
  onSubmit: (values: Omit<Product, "id" | "sold">) => void;
}) {
  const [form, setForm] = useState({ name: "", brand: "", location: "", cost: "", price: "", stock: "" });

  useEffect(() => {
    setForm({
      name: product?.name ?? "",
      brand: product?.brand ?? "",
      location: normalizeLocation(product?.location),
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
      location: normalizeLocation(form.location),
      cost: toPositiveNumber(form.cost),
      price: toPositiveNumber(form.price),
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

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

async function confirmDelete(product: Product, deleteProduct: (id: string) => Promise<void>) {
  const ok = window.confirm(`Eliminar ${product.name}?`);
  if (!ok) return;
  await deleteProduct(product.id);
}

async function removeSale(sale: Movement, deleteMovement: (id: string) => Promise<void>) {
  const ok = window.confirm("Eliminar esta venta? El stock se devuelve automaticamente.");
  if (!ok) return;
  await deleteMovement(sale.id);
}

function saleStatus(movement: Movement): SaleStatus {
  return movement.status ?? "entregado";
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

async function downloadPricePdf(products: Product[]) {
  if (!products.length) return;

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 112, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Mates x Vos", 40, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Lista de precios para clientes - ${today()}`, 40, 66);
  doc.text(`${products.length} productos disponibles`, 40, 84);

  autoTable(doc, {
    startY: 130,
    head: [["Producto", "Marca", "Ubicacion", "Precio"]],
    body: products.map((product) => [
      product.name,
      product.brand,
      productLocation(product),
      currency(product.price),
    ]),
    margin: { left: 40, right: 40 },
    theme: "grid",
    styles: {
      cellPadding: 8,
      font: "helvetica",
      fontSize: 9,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [15, 23, 42],
      fontStyle: "bold",
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      3: { halign: "right", fontStyle: "bold" },
    },
    didDrawPage: () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Precios sujetos a disponibilidad.", 40, pageHeight - 32);
    },
  });

  doc.save(`mates-x-vos-precios-${today()}.pdf`);
}
