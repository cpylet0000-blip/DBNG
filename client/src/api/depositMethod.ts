// Frontend API for deposit methods and withdraw lock
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export async function fetchDepositMethods() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/deposit-methods`);
    if (!res.ok) {
      console.error('Failed to fetch deposit methods:', res.status);
      return [];
    }
    const data = await res.json();
    return data.methods || [];
  } catch (error) {
    console.error('Error fetching deposit methods:', error);
    return [];
  }
}

export async function fetchWithdrawLock() {
  const res = await fetch(`${BACKEND_URL}/api/deposit-methods/withdraw-lock`);
  const data = await res.json();
  return data.isActive;
}
