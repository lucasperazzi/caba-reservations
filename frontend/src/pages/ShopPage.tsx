import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api";
import { Header } from "./HomePage";
import { useAuth } from "../auth";
import type { ProductoShop, CategoriaShop, VarianteProducto } from "../types";
import { usePageBg } from "../hooks/usePageBg";

export function ShopPage() {
  usePageBg("home");
  const { user, logout } = useAuth();
  const [categoriaSel, setCategoriaSel] = useState<number | null>(null);
  const [esSocio, setEsSocio] = useState(false);
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
      <Header user={user?.name ?? ""} userEmail={user?.email} onLogout={logout} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Catálogo</h2>

        {/* Toggle Socio / No socio */}
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
              onClick={() => setEsSocio(true)}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                esSocio ? "bg-white text-black" : "text-neutral-300 hover:text-white"
              }`}
            >
              Socio
            </button>
          </div>
        </div>

        {/* Filtro de categorías */}
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoriaSel(null)}
              className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
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
                  className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    categoriaSel === c.id
                      ? "border-white bg-white text-black"
                      : "border-white/30 text-neutral-300 hover:border-white"
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
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

  const tieneSocio = p.variantes.some((v) => v.esSocio !== null);

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
        {/* Badges — línea separada */}
        {(tieneSocio || tieneVariantes) && (
          <div className="mt-1.5 flex items-center gap-2">
            {tieneSocio && (
              <span className="border border-white/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-300">
                {esSocio ? "Socio" : "No socio"}
              </span>
            )}
            {tieneVariantes && (
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                {variantes.length} opciones
              </span>
            )}
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
              <div className="space-y-1.5">
                {variantes.map((v) => {
                  const attrsTexto = atributosVisibles(v).join(" · ");
                  const extra = v.atributos.reduce((sum, a) => sum + a.extra, 0);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 border border-white/10 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="text-sm text-white">{attrsTexto || "Estándar"}</span>
                      </div>
                      <span className="flex-shrink-0 whitespace-nowrap text-sm font-semibold text-white">
                        {formatoPrecio(v.precio)}
                        {extra > 0 && (
                          <span className="ml-1 text-[10px] text-neutral-500">+${extra}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Producto sin variantes — mostrar precio único */}
          {!tieneVariantes && variantes.length === 1 && (
            <div className="flex items-center justify-between border border-white/10 px-3 py-2">
              <span className="text-sm text-white">Estándar</span>
              <span className="flex-shrink-0 whitespace-nowrap text-sm font-semibold text-white">
                {formatoPrecio(variantes[0].precio)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
