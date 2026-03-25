"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/me`, { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

export function useAuthGate(): {
  isAuthenticated: boolean;
  requireAuth: (onSuccess: () => void) => void;
  showSignIn: boolean;
  onSignInClose: () => void;
  onSignInSuccess: () => void;
} {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const pendingCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    void checkAuth().then(setIsAuthenticated);
  }, []);

  const requireAuth = useCallback(
    (onSuccess: () => void) => {
      if (isAuthenticated) {
        onSuccess();
        return;
      }
      pendingCallback.current = onSuccess;
      setShowSignIn(true);
    },
    [isAuthenticated]
  );

  const onSignInClose = useCallback(() => {
    setShowSignIn(false);
    pendingCallback.current = null;
  }, []);

  const onSignInSuccess = useCallback(() => {
    setIsAuthenticated(true);
    setShowSignIn(false);
    const cb = pendingCallback.current;
    pendingCallback.current = null;
    cb?.();
  }, []);

  return { isAuthenticated, requireAuth, showSignIn, onSignInClose, onSignInSuccess };
}
