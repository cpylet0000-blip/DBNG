import React, { createContext, useContext, useEffect, useState } from "react";

export type DepositMethod = {
  name: string;
  accountInfo: string;
  accountOwner?: string;
  isActive: boolean;
};

interface DepositMethodsContextValue {
  depositMethods: DepositMethod[];
  methodsLoading: boolean;
  methodsError: string | null;
}

const DepositMethodsContext = createContext<
  DepositMethodsContextValue | undefined
>(undefined);

export const useDepositMethods = (): DepositMethodsContextValue => {
  const context = useContext(DepositMethodsContext);
  if (!context) {
    throw new Error(
      "useDepositMethods must be used within a DepositMethodsProvider",
    );
  }
  return context;
};

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

export const DepositMethodsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [depositMethods, setDepositMethods] = useState<DepositMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodsError, setMethodsError] = useState<string | null>(null);

  useEffect(() => {
    const loadMethods = async () => {
      setMethodsLoading(true);
      setMethodsError(null);
      try {
        const res = await fetch(`${BACKEND_URL}/deposit-methods`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setDepositMethods(Array.isArray(data.methods) ? data.methods : []);
      } catch (err) {
        console.error("Deposit methods fetch failed", err);
        setMethodsError("Could not load deposit methods");
        setDepositMethods([]);
      } finally {
        setMethodsLoading(false);
      }
    };

    loadMethods();
  }, []);

  return (
    <DepositMethodsContext.Provider
      value={{ depositMethods, methodsLoading, methodsError }}
    >
      {children}
    </DepositMethodsContext.Provider>
  );
};
