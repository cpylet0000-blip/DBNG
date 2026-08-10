import React, { createContext, useContext, useState, useEffect } from "react";

interface BingoGameContextProps {
  bonus: number;
  setBonus: (bonus: number) => void;
  win: number;
  setWin: (win: number) => void;
}

const BingoGameContext = createContext<BingoGameContextProps | undefined>(undefined);

export const useBingoGame = () => {
  const context = useContext(BingoGameContext);
  if (!context) {
    throw new Error("useBingoGame must be used within a BingoGameProvider");
  }
  return context;
};

export const BingoGameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bonus, setBonus] = useState(0);
  const [win, setWin] = useState(0);

  useEffect(() => {
    // Fetch bonus from backend once on mount
    async function fetchBonus() {
      try {
        const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
        const res = await fetch(`${API_BASE}/api/admin/bonus`);
        const data = await res.json();
        if (data.success && typeof data.amount === 'number') {
          setBonus(data.amount);
        }
      } catch (e) {
        // ignore
      }
    }
    fetchBonus();
  }, []);

  return (
    <BingoGameContext.Provider value={{ bonus, setBonus, win, setWin }}>
      {children}
    </BingoGameContext.Provider>
  );
};
