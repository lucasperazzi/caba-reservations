import { Hono } from "hono";
import { requireAuth } from "../middleware.js";
import { canSeeShop, config } from "../config.js";
import {
  OdooProductTemplate,
  OdooProductVariant,
  OdooAttributeValue,
  OdooPublicCategory,
  OdooError,
} from "../odooClient.js";

export const shop = new Hono();

shop.use("*", requireAuth);

// GET /api/shop/categorias
shop.get("/categorias", async (c) => {
  const user = c.get("user");
  if (!canSeeShop(user.email)) {
    return c.json({ error: "Catálogo no disponible" }, 403);
  }
  const odoo = c.get("odoo");
  try {
    const cats = await odoo.searchCategories();
    return c.json({ data: cats.map(normalizeCategoria) });
  } catch (err) {
    console.error("[shop/categorias] Error:", err instanceof Error ? err.message : err);
    return c.json({ error: "Error al obtener categorías" }, 500);
  }
});

// GET /api/shop/productos?categoria=1
shop.get("/productos", async (c) => {
  const user = c.get("user");
  if (!canSeeShop(user.email)) {
    return c.json({ error: "Catálogo no disponible" }, 403);
  }
  const odoo = c.get("odoo");
  const categoria = c.req.query("categoria");
  const categoryId = categoria ? Number(categoria) : undefined;

  try {
    const { products, variants, attributes } = await odoo.searchProducts(categoryId);

    // Indexar variantes por product_tmpl_id
    const variantsByTemplate = new Map<number, OdooProductVariant[]>();
    for (const v of variants) {
      const tmplId = Array.isArray(v.product_tmpl_id) ? v.product_tmpl_id[0] : v.product_tmpl_id;
      if (tmplId == null) continue;
      if (!variantsByTemplate.has(tmplId)) variantsByTemplate.set(tmplId, []);
      variantsByTemplate.get(tmplId)!.push(v);
    }

    const attrById = new Map(attributes.map((a) => [a.id, a]));

    return c.json({
      data: products.map((p) => normalizeProducto(p, variantsByTemplate.get(p.id) ?? [], attrById)),
    });
  } catch (err) {
    console.error("[shop/productos] Error:", err instanceof Error ? err.message : err);
    return c.json({ error: "Error al obtener productos" }, 500);
  }
});

// POST /api/shop/checkout
// Recibe los items del carrito nuestro, los agrega al carrito de Odoo,
// y devuelve la URL de checkout de Odoo para que el frontend redirija ahí.
shop.post("/checkout", async (c) => {
  const user = c.get("user");
  if (!canSeeShop(user.email)) {
    return c.json({ error: "Catálogo no disponible" }, 403);
  }

  let body: { items?: { varianteId: number; qty: number }[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body inválido" }, 400);
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: "El carrito está vacío" }, 400);
  }

  // Validar items
  for (const item of items) {
    if (!Number.isInteger(item.varianteId) || item.varianteId <= 0) {
      return c.json({ error: "varianteId inválido" }, 400);
    }
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      return c.json({ error: "qty inválido" }, 400);
    }
  }

  const odoo = c.get("odoo");
  try {
    // Limpiar el carrito existente de Odoo antes de agregar nuestros items.
    // Odoo reusa sale.order draft existentes (via session o partner.last_website_so_id),
    // así que si el usuario ya tenía items en el carrito del sitio real, se mezclarían.
    await odoo.clearCart();

    await odoo.addMultipleToCart(
      items.map((i) => ({ productId: i.varianteId, qty: i.qty })),
    );

    // Devolver la URL de checkout de Odoo.
    // El frontend redirige al usuario ahí para completar la compra y el pago.
    const checkoutUrl = `${config.odoo.baseUrl}/shop/checkout`;
    return c.json({ ok: true, checkoutUrl });
  } catch (err) {
    if (err instanceof OdooError) {
      console.error("[shop/checkout] OdooError:", err.message);
      return c.json({ error: err.message }, 502);
    }
    console.error("[shop/checkout] Error:", err instanceof Error ? err.message : err);
    return c.json({ error: "Error al procesar el checkout" }, 500);
  }
});

// POST /api/shop/carrito/limpiar
// Vacía el carrito de Odoo (safe lock antes de empezar a agregar items).
shop.post("/carrito/limpiar", async (c) => {
  const user = c.get("user");
  if (!canSeeShop(user.email)) {
    return c.json({ error: "Catálogo no disponible" }, 403);
  }
  const odoo = c.get("odoo");
  try {
    await odoo.clearCart();
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof OdooError) {
      console.error("[shop/carrito/limpiar] OdooError:", err.message);
      return c.json({ error: err.message }, 502);
    }
    console.error("[shop/carrito/limpiar] Error:", err instanceof Error ? err.message : err);
    return c.json({ error: "Error al limpiar el carrito" }, 500);
  }
});

// GET /api/shop/carrito
// Lee el carrito actual de Odoo (sale.order draft de la sesión).
shop.get("/carrito", async (c) => {
  const user = c.get("user");
  if (!canSeeShop(user.email)) {
    return c.json({ error: "Catálogo no disponible" }, 403);
  }
  const odoo = c.get("odoo");
  try {
    const lines = await odoo.getCart();
    const total = lines.reduce((sum, l) => sum + l.price_subtotal, 0);
    return c.json({
      data: lines.map((l) => ({
        id: l.id,
        productoId: l.product_id[0],
        productoNombre: l.product_id[1],
        cantidad: l.product_uom_qty,
        precioUnitario: l.price_unit,
        subtotal: l.price_subtotal,
      })),
      total,
    });
  } catch (err) {
    if (err instanceof OdooError) {
      console.error("[shop/carrito] OdooError:", err.message);
      return c.json({ error: err.message }, 502);
    }
    console.error("[shop/carrito] Error:", err instanceof Error ? err.message : err);
    return c.json({ error: "Error al obtener el carrito" }, 500);
  }
});

// ── Normalización ──────────────────────────────────────────────

function normalizeCategoria(c: OdooPublicCategory) {
  return {
    id: c.id,
    nombre: c.name,
    parentId: c.parent_id ? c.parent_id[0] : null,
  };
}

function normalizeProducto(
  p: OdooProductTemplate,
  variants: OdooProductVariant[],
  attrById: Map<number, OdooAttributeValue>,
) {
  // Agrupar variantes por sus atributos para mostrar opciones
  const variantesNormalizadas = variants.map((v) => {
    const attrs = (v.attribute_value_ids ?? []).map((id) => {
      const a = attrById.get(id);
      if (!a) return null;
      const attrName = Array.isArray(a.attribute_id) ? a.attribute_id[1] : String(a.attribute_id);
      return { nombre: attrName, valor: a.name, extra: a.price_extra };
    }).filter(Boolean) as { nombre: string; valor: string; extra: number }[];

    // Detectar si la variante es socio o no socio
    const esSocio = detectarSocio(attrs);

    return {
      id: v.id,
      precio: v.list_price,
      codigo: v.default_code || null,
      esSocio,
      atributos: attrs,
    };
  });

  // Rango de precios
  const precios = variants.map((v) => v.list_price).filter((x) => x > 0);
  const precioMin = precios.length > 0 ? Math.min(...precios) : p.list_price;
  const precioMax = precios.length > 0 ? Math.max(...precios) : p.list_price;

  return {
    id: p.id,
    nombre: p.name,
    descripcion: p.description || null,
    descripcionVenta: p.description_sale || null,
    precioMin,
    precioMax,
    imagen: p.image_medium || null,
    websiteUrl: p.website_url,
    categorias: p.public_categ_ids,
    variantes: variantesNormalizadas,
  };
}

// Nombres de atributos que indican socio/no socio (normalizados a minúsculas)
const SOCIO_ATTR_NAMES = new Set(["c.a.b.a.", "membresia"]);
const SOCIO_VALUES = new Set(["socios caba", "socio"]);
const NOSOCIO_VALUES = new Set(["no socios", "no socio"]);

/** Devuelve true=socio, false=no socio, null=no aplica */
function detectarSocio(attrs: { nombre: string; valor: string; extra: number }[]): boolean | null {
  for (const a of attrs) {
    const attrLower = a.nombre.toLowerCase();
    const valLower = a.valor.toLowerCase();
    if (SOCIO_ATTR_NAMES.has(attrLower)) {
      if (SOCIO_VALUES.has(valLower)) return true;
      if (NOSOCIO_VALUES.has(valLower)) return false;
    }
  }
  return null;
}
