import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
import { useProfile } from '../../profileContext';
type Ticket = {
  id: string | null;
  userId: number | null;
  ticket_number: number;
  purchase_time: string | null;
  user?: {
    username?: string | null;
    name?: string | null;
  } | null;
};

type TicketListProps = {
  lotteryId: string;
  onBack: () => void;
  onBuy: (selected: number[], refreshTickets: () => void) => void;
  stake: number;
};

const TicketList: React.FC<TicketListProps> = ({ lotteryId, onBack, onBuy, stake }) => {
  const { profile } = useProfile();
  const userBalance = profile?.balance?.currentBalance ?? 0;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll the grid up or down by a fixed amount
  const scrollGrid = (direction: 'up' | 'down') => {
    const grid = gridRef.current;
    if (grid) {
      const amount = 120; // px to scroll per click (adjust as needed)
      grid.scrollBy({
        top: direction === 'up' ? -amount : amount,
        behavior: 'smooth',
      });
    }
  };
  // const [showConfirm, setShowConfirm] = useState(false);

  const refreshTickets = useCallback(() => {
    setLoading(true);
    setError(null);
    const apiUrl =
      import.meta.env.VITE_API_BASE ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    fetch(`${apiUrl}/api/lottery/${lotteryId}/tickets`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch tickets');
        return res.json();
      })
      .then((data) => {
        const nextTickets = Array.isArray(data) ? (data as Ticket[]) : [];
        setTickets(nextTickets);
        const availableNumbers = new Set(
          nextTickets.filter((t) => t.userId === null).map((t) => t.ticket_number)
        );
        setSelected((prev) => prev.filter((n) => availableNumbers.has(n)));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error fetching tickets');
        setLoading(false);
      });
  }, [lotteryId]);
  useEffect(() => {
    // Avoid calling setState directly in effect body
    // Instead, use a callback or schedule with setTimeout
    setTimeout(() => {
      refreshTickets();
    }, 0);
  }, [lotteryId, refreshTickets]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <button onClick={onBack} className="text-sky-400 bg-white rounded-2xl"> <ArrowLeft size={26}/></button>      
        <div className="mb-2 flex justify-center items-center gap-1">
          <button
            aria-label="Scroll up"
            className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sky-300 border border-slate-500 shadow disabled:opacity-40"
            onClick={() => scrollGrid('up')}
          >
            <ArrowUp size={26} />
          </button>
          <button
            className={`px-4 py-1 rounded-l border ${showAvailableOnly ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-800'} border-blue-400`}
            onClick={() => setShowAvailableOnly(true)}
          >
            ያልተያዙ ትኬቶች
          </button>
          <button
            className={`px-4 py-1 rounded-r border ${!showAvailableOnly ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-800'} border-blue-400`}
            onClick={() => setShowAvailableOnly(false)}
          >
           ሁሉም
          </button>
          <button
            aria-label="Scroll down"
            className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-sky-300 border border-slate-500 shadow disabled:opacity-40"
            onClick={() => scrollGrid('down')}
          >
            <ArrowDown size={24} />
          </button>
        </div>

      {loading ? (
        <div className="text-slate-300">Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="mb-4">
          <div
            ref={gridRef}
            className="grid grid-cols-7 gap-1 max-h-100 overflow-y-auto pr-2"
            tabIndex={0}
            style={{ scrollBehavior: 'smooth' }}
          >
            {(showAvailableOnly
              ? tickets.filter((ticket) => ticket.userId === null)
              : tickets
            ).map((ticket) => {
              const isClaimed = ticket.userId !== null;
              const isSelected = selected.includes(ticket.ticket_number);
              const claimedLabel = (ticket.user?.username || ticket.user?.name || '').trim();
              return (
                <button
                  key={ticket.ticket_number}
                  disabled={isClaimed}
                  onClick={() => {
                    if (!isClaimed) {
                      setSelected((prev) =>
                        prev.includes(ticket.ticket_number)
                          ? prev.filter((n) => n !== ticket.ticket_number)
                          : [...prev, ticket.ticket_number]
                      );
                    }
                  }}
                  className={`rounded p-1 text-center text-xs font-semibold  transition w-full h-12 flex flex-col items-center justify-center
                    ${isClaimed ? 'bg-gray-700/80 text-gray-400  cursor-not-allowed' :
                      isSelected ? 'bg-blue-500 text-white border-blue-400' : 'bg-yellow-700/80 text-slate-300 border-slate-700 hover:bg-slate-700'}
                  `}
                >
                  {String(ticket.ticket_number).padStart(3, '0')}
                  <div className="text-[8px] ">
                    {isClaimed ? (claimedLabel ? "@" + claimedLabel : 'Claimed') : isSelected ? 'Selected' : 'Available'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        onClick={() => onBuy(selected, refreshTickets)}
        disabled={selected.length === 0 || (Math.round(userBalance * 100) < Math.round(stake * selected.length * 100))}
        className="px-4 py-2 text-left rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        Buy Selected Ticket{selected.length > 1 ? 's' : ''}
      </button>
      {selected.length > 0 && (Math.round(userBalance * 100) < Math.round(stake * selected.length * 100)) && (
        <div className="text-red-400 mt-2 text-sm">Insufficient balance to buy {selected.length} ticket{selected.length > 1 ? 's' : ''}.</div>
      )}
    </div>
  );
};

export default TicketList;
