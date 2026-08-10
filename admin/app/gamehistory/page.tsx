'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GameHistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new game room page
    router.replace('/gameroom');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting to Game Room...</p>
      </div>
    </div>
  );
}
