import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import { useCart } from "../cart";
import type { ProductoShop, CategoriaShop, VarianteProducto } from "../types";
import { usePageBg } from "../hooks/usePageBg";

export function ShopPage() {
  usePageBg("home");
  const { user, logout } = useAuth();
  const esMiembroActivo = user?.esSocio === true;
  const [categoriaSel, setCategoriaSel] = useState<number | null>(null);
  const [esSocio, setEsSocio] = useState(() => esMiembroActivo);
  const [switchVisible, setSwitchVisible] = useState(true);
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = switchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSwitchVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [productoSel, setProductoSel] = useState<ProductoShop | null>(null);

  const { data: catsData } = useQuery<{ data: CategoriaShop[] }>({
    queryKey: ["shop-categorias"],
    queryFn: apiClient.shopCategorias,
  });

  const { data: prodsData, isLoading } = useQuery<{ data: ProductoShop[] }>({
    queryKey: ["shop-productos", categoriaSel],
    queryFn: () => apiClient.shopProductos(categoriaSel ?? undefined),
  });

  const categorias = catsData?.data ?? [];
  const productos = prodsData?.data ?? [];

  const catNombre = (id: number) => categorias.find((c) => c.id === id)?.nombre ?? "";

  return (
    <div className="min-h-screen">
      <Header userEmail={user?.email} onLogout={logout} />

      {/* Pill sticky — solo aparece cuando el switch ya no se ve */}
      <div
        className={`sticky top-[48px] z-[60] flex justify-center px-4 pointer-events-none transition-all duration-300 ${
          switchVisible ? "opacity-0 -translate-y-1 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="pointer-events-auto mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/80 px-4 py-1.5 shadow-lg backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-neutral-300">
            Precios para{" "}
            <span className="font-semibold text-white">{esSocio ? "socios" : "no socios"}</span>
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Título */}
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Catálogo</h2>

        {/* Switch Socio / No socio — en el flujo normal, con ref para detectar cuando desaparece */}
        <div ref={switchRef} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Mostrar precios:</span>
            <div className="flex border border-white/30">
              <button
                onClick={() => setEsSocio(false)}
                className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  !esSocio ? "bg-white text-black" : "text-neutral-300 hover:text-white"
                }`}
              >
                No socio
              </button>
              <button
                onClick={() => { if (esMiembroActivo) setEsSocio(true); }}
                disabled={!esMiembroActivo}
                className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  esSocio
                    ? "bg-white text-black"
                    : esMiembroActivo
                      ? "text-neutral-300 hover:text-white"
                      : "cursor-not-allowed text-neutral-600"
                }`}
              >
                Socio
              </button>
            </div>
          </div>
          {!esMiembroActivo && (
            <p className="flex items-start gap-1.5 border-l-2 border-amber-500/60 pl-2.5 text-xs leading-relaxed text-amber-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {/* Próximamente: link a solicitud de asociación */}
              Los precios de socio están disponibles exclusivamente para miembros activos del CABA. Para acceder a ellos, necesitás tener una membresía vigente.
            </p>
          )}
        </div>

        {/* Filtro de categorías — scroll horizontal en mobile, wrap en desktop */}
        {categorias.length > 0 && (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setCategoriaSel(null)}
                className={`flex-shrink-0 border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  categoriaSel === null
                    ? "border-white bg-white text-black"
                    : "border-white/30 text-neutral-300 hover:border-white"
                }`}
              >
                Todos
              </button>
              {categorias
                .filter((c) => c.parentId === null)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoriaSel(c.id)}
                    className={`flex-shrink-0 border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      categoriaSel === c.id
                        ? "border-white bg-white text-black"
                        : "border-white/30 text-neutral-300 hover:border-white"
                    }`}
                  >
                    {c.nombre}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
          </div>
        )}

        {/* Sin productos */}
        {!isLoading && productos.length === 0 && (
          <p className="text-sm text-neutral-400">No hay productos en esta categoría.</p>
        )}

        {/* Lista de productos */}
        <div className="space-y-3">
          {productos.map((p) => (
            <ProductoCard
              key={p.id}
              p={p}
              catNombre={catNombre}
              esSocio={esSocio}
              onClick={() => setProductoSel(p)}
            />
          ))}
        </div>
      </main>

      {/* Modal de detalle */}
      {productoSel && (
        <ProductoModal
          p={productoSel}
          catNombre={catNombre}
          esSocio={esSocio}
          onClose={() => setProductoSel(null)}
        />
      )}

    </div>
  );
}

function formatoPrecio(n: number): string {
  if (n === 0) return "Gratis";
  return `$${n.toLocaleString("es-AR")}`;
}

/** Filtra variantes por socio/no socio. Si ninguna tiene esSocio definido, devuelve todas. */
function variantesFiltradas(p: ProductoShop, esSocio: boolean): VarianteProducto[] {
  const conSocio = p.variantes.filter((v) => v.esSocio !== null);
  if (conSocio.length === 0) return p.variantes;
  return conSocio.filter((v) => v.esSocio === esSocio);
}

/** Quita el atributo socio/no socio de la lista (ya está implícito en el toggle). */
const SOCIO_ATTRS = new Set(["c.a.b.a.", "membresia"]);

function atributosVisibles(v: VarianteProducto): string[] {
  return v.atributos
    .filter((a) => !SOCIO_ATTRS.has(a.nombre.toLowerCase()))
    .map((a) => a.valor);
}

/**
 * Cuando un producto tiene 2+ atributos no-socio, Odoo genera todas las
 * combinaciones pero muchas tienen precio placeholder (igual al list_price
 * del template). Agrupamos por el primer atributo no-socio y mostramos solo
 * la variante de precio más alto de cada grupo (la "real").
 * Con 0 o 1 atributo no-socio, mostramos todas las variantes.
 */
function variantesAgrupadas(variants: VarianteProducto[]): VarianteProducto[] {
  const attrNames = new Set<string>();
  for (const v of variants) {
    for (const a of v.atributos) {
      if (!SOCIO_ATTRS.has(a.nombre.toLowerCase())) {
        attrNames.add(a.nombre);
      }
    }
  }

  if (attrNames.size <= 1) return variants;

  let primerAttr = "";
  for (const v of variants) {
    const attr = v.atributos.find((a) => !SOCIO_ATTRS.has(a.nombre.toLowerCase()));
    if (attr) {
      primerAttr = attr.nombre;
      break;
    }
  }
  if (!primerAttr) return variants;

  const grupos = new Map<string, VarianteProducto>();
  for (const v of variants) {
    const attr = v.atributos.find((a) => a.nombre === primerAttr);
    const key = attr?.valor ?? "—";
    const existente = grupos.get(key);
    if (!existente || v.precio > existente.precio) {
      grupos.set(key, v);
    }
  }

  return [...grupos.values()];
}

// ── Card (lista) ───────────────────────────────────────────────

function ProductoCard({
  p,
  catNombre,
  esSocio,
  onClick,
}: {
  p: ProductoShop;
  catNombre: (id: number) => string;
  esSocio: boolean;
  onClick: () => void;
}) {
  const variantes = variantesAgrupadas(variantesFiltradas(p, esSocio));
  const tieneVariantes = variantes.length > 1;

  const precios = variantes.map((v) => v.precio).filter((x) => x > 0);
  const precioMin = precios.length > 0 ? Math.min(...precios) : p.precioMin;
  const precioMax = precios.length > 0 ? Math.max(...precios) : p.precioMax;
  const precioTexto =
    precioMin === precioMax ? formatoPrecio(precioMin) : `${formatoPrecio(precioMin)} – ${formatoPrecio(precioMax)}`;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-4 border-l-4 border-white/20 bg-black/40 p-4 text-left backdrop-blur-md transition-colors hover:bg-white/[0.06]"
    >
      {/* Imagen */}
      {p.imagen && (
        <img
          src={`data:image/png;base64,${p.imagen}`}
          alt={p.nombre}
          className="h-16 w-16 flex-shrink-0 object-cover sm:h-20 sm:w-20"
        />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        {p.categorias.length > 0 && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            {p.categorias.map(catNombre).join(" · ")}
          </span>
        )}
        <h3 className="mt-0.5 text-base font-bold leading-tight tracking-tight text-white sm:text-lg">
          {p.nombre}
        </h3>
        {/* Precio — siempre en una línea */}
        <div className="mt-2">
          <span className="text-sm font-bold whitespace-nowrap text-white">{precioTexto}</span>
        </div>
        {tieneVariantes && (
          <div className="mt-1.5">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">
              {variantes.length} opciones
            </span>
          </div>
        )}
      </div>

      {/* Chevron */}
      <span className="mt-1 flex-shrink-0 text-neutral-400">›</span>
    </button>
  );
}

// ── Modal de detalle ────────────────────────────────────────────

function ProductoModal({
  p,
  catNombre,
  esSocio,
  onClose,
}: {
  p: ProductoShop;
  catNombre: (id: number) => string;
  esSocio: boolean;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState<number | null>(null);

  // Cerrar con Escape + bloquear scroll del body
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const variantes = variantesAgrupadas(variantesFiltradas(p, esSocio));
  const tieneVariantes = variantes.length > 1;
  const tieneSocio = p.variantes.some((v) => v.esSocio !== null);

  const handleAdd = (v: VarianteProducto) => {
    const attrsTexto = atributosVisibles(v).join(" · ");
    addItem({
      varianteId: v.id,
      productoId: p.id,
      nombre: p.nombre,
      varianteNombre: attrsTexto || "Estándar",
      precio: v.precio,
    });
    setAdded(v.id);
    setTimeout(() => setAdded(null), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border border-white/20 bg-black/90 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-start gap-4 border-b border-white/10 p-5">
          {p.imagen && (
            <img
              src={`data:image/png;base64,${p.imagen}`}
              alt={p.nombre}
              className="h-16 w-16 flex-shrink-0 object-cover sm:h-20 sm:w-20"
            />
          )}
          <div className="min-w-0 flex-1">
            {p.categorias.length > 0 && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {p.categorias.map(catNombre).join(" · ")}
              </span>
            )}
            <h3 className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-white">
              {p.nombre}
            </h3>
            {tieneSocio && (
              <span className="mt-1.5 inline-block whitespace-nowrap border border-white/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-300">
                {esSocio ? "Socio" : "No socio"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex-shrink-0 text-neutral-400 transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto p-5">
          {/* Descripción de venta */}
          {p.descripcionVenta && (
            <div className="mb-5 whitespace-pre-line text-sm leading-relaxed text-neutral-300">
              {p.descripcionVenta}
            </div>
          )}

          {/* Variantes */}
          {tieneVariantes && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-200">Opciones</h4>
              <div className="space-y-2">
                {variantes.map((v) => {
                  const attrsTexto = atributosVisibles(v).join(" · ");
                  const extra = v.atributos.reduce((sum, a) => sum + a.extra, 0);
                  const isAdded = added === v.id;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 border-l-4 border-emerald-500 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-white">{attrsTexto || "Estándar"}</span>
                        <span className="mt-0.5 block whitespace-nowrap text-sm font-bold text-emerald-400">
                          {formatoPrecio(v.precio)}
                          {extra > 0 && (
                            <span className="ml-1 text-[10px] text-neutral-500">+${extra}</span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAdd(v)}
                        disabled={isAdded}
                        className={`flex-shrink-0 border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                          isAdded
                            ? "border-emerald-500 bg-emerald-500 text-black"
                            : "border-white/30 text-white hover:bg-white/10"
                        }`}
                      >
                        {isAdded ? "Agregado" : "Agregar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Producto sin variantes — mostrar precio único */}
          {!tieneVariantes && variantes.length === 1 && (
            <div className="flex items-center justify-between gap-3 border-l-4 border-emerald-500 bg-white/[0.03] px-4 py-3">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-white">Estándar</span>
                <span className="mt-0.5 block whitespace-nowrap text-sm font-bold text-emerald-400">
                  {formatoPrecio(variantes[0].precio)}
                </span>
              </div>
              <button
                onClick={() => handleAdd(variantes[0])}
                disabled={added === variantes[0].id}
                className={`flex-shrink-0 border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  added === variantes[0].id
                    ? "border-emerald-500 bg-emerald-500 text-black"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
              >
                {added === variantes[0].id ? "Agregado" : "Agregar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal del carrito ──────────────────────────────────────────

export function CarritoModal({ onClose }: { onClose: () => void }) {
  const { items, total, updateQty, removeItem, clear } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await apiClient.shopCheckout(
        items.map((i) => ({ varianteId: i.varianteId, qty: i.qty })),
      );
      // Los items ya están en el carrito de Odoo — limpiar nuestro carrito
      clear();
      // Redirigir al checkout de Odoo — el usuario completa la compra y el pago ahí
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Error al procesar el checkout");
      setCheckoutLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border border-white/20 bg-black/90 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">Carrito</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-neutral-400 transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">Tu carrito está vacío</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.varianteId}
                  className="border-l-4 border-white/20 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight text-white">{item.nombre}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">{item.varianteNombre}</p>
                      <p className="mt-1 text-sm font-bold text-emerald-400">
                        {formatoPrecio(item.precio)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.varianteId)}
                      className="flex-shrink-0 text-xs text-neutral-500 transition-colors hover:text-red-400"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Controles de cantidad */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.varianteId, item.qty - 1)}
                      className="flex h-6 w-6 items-center justify-center border border-white/30 text-sm text-white transition-colors hover:bg-white/10"
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-white">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.varianteId, item.qty + 1)}
                      className="flex h-6 w-6 items-center justify-center border border-white/30 text-sm text-white transition-colors hover:bg-white/10"
                    >
                      +
                    </button>
                    <span className="ml-auto text-sm font-bold text-white">
                      {formatoPrecio(item.precio * item.qty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con total y checkout */}
        {items.length > 0 && (
          <div className="border-t border-white/10 p-5">
            {checkoutError && (
              <p className="mb-3 text-xs text-red-400">{checkoutError}</p>
            )}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wider text-neutral-300">Total</span>
              <span className="text-lg font-bold text-white">{formatoPrecio(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full bg-emerald-500 py-3 text-sm font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {checkoutLoading ? "Procesando..." : "Finalizar compra"}
            </button>
            <button
              onClick={clear}
              className="mt-2 w-full text-xs text-neutral-500 transition-colors hover:text-neutral-300"
            >
              Vaciar carrito
            </button>
            <p className="mt-3 text-center text-[10px] text-neutral-500">
              Serás redirigido al sitio de CABA para completar el pago
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
