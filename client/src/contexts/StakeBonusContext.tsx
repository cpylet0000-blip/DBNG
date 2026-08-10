import React, { createContext, useContext, useState, useEffect } from "react";

interface StakeBonus {
  stake: 10 | 20 | 50 | 100;
  bonusAmount: number;
  enabled: boolean;
}

interface StakeBonusContextProps {
  stakeBonuses: StakeBonus[];
  getBonusForStake: (stake: number) => number;
  loading: boolean;
  refreshBonuses: () => void;
}

const StakeBonusContext = createContext<StakeBonusContextProps | undefined>(undefined);
// silently ignore the error above since we handle it in the hook

export const useStakeBonus = () => {
  
  const context = useContext(StakeBonusContext);
  if (!context) {
    alert( "  stakc error`  ");
    throw new Error("useStakeBonus must be used within a StakeBonusProvider");
  }
  return context;
};

export const StakeBonusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stakeBonuses, setStakeBonuses] = useState<StakeBonus[]>([
    { stake: 10, bonusAmount: 0, enabled: false },
    { stake: 20, bonusAmount: 0, enabled: false },
    { stake: 50, bonusAmount: 0, enabled: false },
    { stake: 100, bonusAmount: 0, enabled: false },
  ]);
  const [loading, setLoading] = useState(true);

  const fetchStakeBonuses = async () => {
    try {
      console.log('🔄 [FRONTEND] Fetching stake bonuses from backend...');
      setLoading(true);
      let API_BASE = '';
      try {
        API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
      } catch (e) {
        API_BASE = '';
      }
      console.log('🌐 [FRONTEND] Making request to:', `${API_BASE}/api/stake-bonuses`);
      const res = await fetch(`${API_BASE}/api/stake-bonuses`);
      
      const data = await res.json();
      console.log('📦 [FRONTEND] Backend response data:', data);
      if (data && data.success && Array.isArray(data.bonuses)) {
        setStakeBonuses(data.bonuses);
      } else {
       alert("failed")
      }
    } catch (e) {
      alert("catch")
    } finally {
      setLoading(false);
      console.log('🏁 [FRONTEND] Stake bonus fetch completed');
    }
  };

  const getBonusForStake = (stake: number): number => {
    const bonus = stakeBonuses.find(b => b.stake === stake);
    return bonus && bonus.enabled ? bonus.bonusAmount : 0;
  };

  const refreshBonuses = () => {
    fetchStakeBonuses();
  };

  useEffect(() => {
    fetchStakeBonuses();
  }, []);

  return (
    <StakeBonusContext.Provider value={{ 
      stakeBonuses, 
      getBonusForStake, 
      loading, 
      refreshBonuses 
    }}>
      {children}
    </StakeBonusContext.Provider>
  );
};
