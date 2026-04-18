"use client";

import { useCallback, useEffect, useState } from "react";

export interface CartItem {
  id: string; // menuItemId
  name: string;
  basePriceCents: number;
  quantity: number;
  options: {
    doneness?: string;
    sauce?: string;
    side?: string;
    notes?: string;
  };
}

const CART_KEY = "taps_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.id === item.id &&
          i.options.doneness === item.options.doneness &&
          i.options.sauce === item.options.sauce &&
          i.options.side === item.options.side
      );
      const next = existing
        ? prev.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i
          )
        : [...prev, { ...item, quantity: item.quantity ?? 1 }];
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, qty: number) => {
    setItems((prev) => {
      const next =
        qty <= 0
          ? prev.filter((i) => i.id !== itemId)
          : prev.map((i) => (i.id === itemId ? { ...i, quantity: qty } : i));
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotalCents = items.reduce((sum, i) => sum + i.basePriceCents * i.quantity, 0);

  return { items, cartCount, cartTotalCents, addItem, removeItem, updateQuantity, clearCart };
}
