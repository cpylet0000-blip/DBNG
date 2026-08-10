import type { PlayKenoResponse } from "./types";

function kenoBuildHeaders(): Record<string, string> {
  // Only use Telegram Mini App context for authentication
  const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined;
  const isTelegram = Boolean(tg);
  if (isTelegram && tg?.initData) {
    return { 'x-telegram-init-data': tg.initData };
  }
  return {};
}
const KENO_API_BASE =
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE
    ? (import.meta as any).env.VITE_API_BASE
    : '';
export async function playKeno(
  bet: number,
  slot: number,
  selectedNumbers: number[]
): Promise<PlayKenoResponse> {
  console.log('🎯 playKeno called with:', { bet, slot, selectedNumbers });
  console.log('🌐 API Base:', KENO_API_BASE);
  
  const headers = { ...kenoBuildHeaders(), 'Content-Type': 'application/json' };
  const url = `${KENO_API_BASE}/api/keno/play`;
  
  console.log('📡 Fetching:', url);
  console.log('📋 Headers:', headers);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bet, slot, selectedNumbers }),
    credentials: 'include',
  });
  
  console.log('✅ Response status:', res.status, res.statusText);
  
  if (!res.ok) {
    let msg = `Error ${res.status}: ${res.statusText}`;
    try {
      const err = await res.json();
      if (err && (err as any).error) msg = (err as any).error;
    } catch {
      // Failed to parse error response
    }
    throw new Error(msg);
  }
  
  const data = await res.json();
  console.log('🎉 Keno result:', data);
  return data;
}