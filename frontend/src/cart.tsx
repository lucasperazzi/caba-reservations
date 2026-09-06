import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient } from "./api";

export interface CartItem {
  varianteId: number; // product.product ID (variant) — lo que Odoo espera en /shop/cart/update
  productoId: number; // product.template ID
  nombre: string; // nombre del producto
  varianteNombre: string; // descripción de la variante (atributos)
  precio: number; // precio unitario
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (varianteId: number) => void;
  updateQty: (varianteId: number, qty: number) => void;
  clear: () => void;
  carritoOpen: boolean;
  openCarrito: () => void;
  closeCarrito: () => void;
}

const Ctx = createContext<CartCtx>(null!);

const STORAGE_KEY = "caba_cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [carritoOpen, setCarritoOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem: CartCtx["addItem"] = (item, qty = 1) => {
    setItems((prev) => {
      // Safe lock: si el carrito estaba vacío, limpiamos el carrito de Odoo
      // por las dudas (una compra anterior que no terminó, items que no se borraron, etc.)
      if (prev.length === 0) {
        apiClient.shopLimpiarCarrito().catch(() => {
          // Silencioso: si falla, no bloqueamos el agregado al carrito local.
          // El checkout vuelve a limpiar antes de agregar.
        });
      }
      const existing = prev.find((i) => i.varianteId === item.varianteId);
      if (existing) {
        return prev.map((i) =>
          i.varianteId === item.varianteId ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...prev, { ...item, qty }];
    });
  };

  const removeItem: CartCtx["removeItem"] = (varianteId) => {
    setItems((prev) => prev.filter((i) => i.varianteId !== varianteId));
  };

  const updateQty: CartCtx["updateQty"] = (varianteId, qty) => {
    if (qty <= 0) {
      removeItem(varianteId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.varianteId === varianteId ? { ...i, qty } : i)),
    );
  };

  const clear: CartCtx["clear"] = () => setItems([]);

  const openCarrito = () => setCarritoOpen(true);
  const closeCarrito = () => setCarritoOpen(false);

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.precio * i.qty, 0);

  return (
    <Ctx.Provider value={{ items, itemCount, total, addItem, removeItem, updateQty, clear, carritoOpen, openCarrito, closeCarrito }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  return useContext(Ctx);
}
