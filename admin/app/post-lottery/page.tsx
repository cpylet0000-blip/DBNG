'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '../component/Navbar';
import Footer from '../component/Footer';
import { Calendar, Clock, DollarSign, Hash, Send } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

type Lottery = {
  id: string;
  drawDate: string;
  drawTime: string;
  stake: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  totalTickets: number;
  availableTickets: number;
  status: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

export default function PostLotteryPage() {
    // Edit state
    const [editingLottery, setEditingLottery] = useState<Lottery | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editStake, setEditStake] = useState('');
    const [editTotalTickets, setEditTotalTickets] = useState('');
    const [editFirstPrize, setEditFirstPrize] = useState('');
    const [editSecondPrize, setEditSecondPrize] = useState('');
    const [editThirdPrize, setEditThirdPrize] = useState('');
    const [editDrawDate, setEditDrawDate] = useState('');
    const [editDrawTime, setEditDrawTime] = useState('');

    const openEditLottery = (lot: Lottery) => {
      setEditingLottery(lot);
      setEditStake(lot.stake.toString());
      setEditTotalTickets(lot.totalTickets.toString());
      setEditFirstPrize(lot.firstPrize.toString());
      setEditSecondPrize(lot.secondPrize.toString());
      setEditThirdPrize(lot.thirdPrize.toString());
      setEditDrawDate(lot.drawDate.split('T')[0] || '');
      setEditDrawTime(lot.drawTime ? lot.drawTime.split('T')[1]?.slice(0,5) : '');
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLottery) return;
      setEditLoading(true);
      setError(null);
      setMessage(null);
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('admin_token') : null;
        const drawDateIso = `${editDrawDate}T00:00:00.000Z`;
        const drawTimeIso = `${editDrawDate}T${editDrawTime}:00.000Z`;
        await axios.put(
          `${BACKEND_URL}/lottery/admin/update`,
          {
            lottery_id: editingLottery.id,
            stake_amount: Number(editStake),
            total_tickets: Number(editTotalTickets),
            first_prize_amount: Number(editFirstPrize),
            second_prize_amount: Number(editSecondPrize),
            third_prize_amount: Number(editThirdPrize),
            draw_date: drawDateIso,
            draw_time: drawTimeIso,
          },
          {
            withCredentials: true,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        setMessage('Lottery updated successfully.');
        setEditingLottery(null);
        fetchLotteries();
      } catch (err) {
        setError('Failed to update lottery. Please try again.');
      } finally {
        setEditLoading(false);
      }
    };
  const router = useRouter();
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stakeAmount, setStakeAmount] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [firstPrize, setFirstPrize] = useState('');
  const [secondPrize, setSecondPrize] = useState('');
  const [thirdPrize, setThirdPrize] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [drawTime, setDrawTime] = useState('');
  // Set to PAID handler
  const handleSetToPaid = async (lotteryId: string) => {
    setError(null);
    setMessage(null);
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('admin_token') : null;
      await axios.put(
        `${BACKEND_URL}/lottery/admin/update`,
        {
          lottery_id: lotteryId,
          status: 'PAID',
        },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      setMessage('Lottery status set to PAID. Drawing will begin automatically!');
      fetchLotteries();
    } catch (err) {
      setError('Failed to update lottery status. Please try again.');
    }
  };

  const fetchLotteries = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/lottery`);
      setLotteries(res.data || []);
    } catch (err) {
      setError('Failed to load lotteries');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchLotteries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!stakeAmount || !totalTickets || !firstPrize || !secondPrize || !thirdPrize || !drawDate || !drawTime) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      const token =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('admin_token')
          : null;

      const drawDateIso = `${drawDate}T00:00:00.000Z`;
      const drawTimeIso = `${drawDate}T${drawTime}:00.000Z`;

      await axios.post(
        `${BACKEND_URL}/lottery/admin/create`,
        {
          stake_amount: Number(stakeAmount),
          total_tickets: Number(totalTickets),
          first_prize_amount: Number(firstPrize),
          second_prize_amount: Number(secondPrize),
          third_prize_amount: Number(thirdPrize),
          draw_date: drawDateIso,
          draw_time: drawTimeIso,
        },
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      setMessage('Lottery created successfully.');
      setStakeAmount('');
      setTotalTickets('');
      setFirstPrize('');
      setSecondPrize('');
      setThirdPrize('');
      setDrawDate('');
      setDrawTime('');
      fetchLotteries();
    } catch (err) {
      setError('Failed to create lottery. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 px-2 bg-neutral-50 flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-neutral-900">Lottery</h1>
            <p className="text-xs text-neutral-500">
              View existing lotteries, available spaces, and post new ones.
            </p>
          </header>

          <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Posted lotteries</h2>
              <button
                type="button"
                onClick={fetchLotteries}
                disabled={loadingList}
                className="px-3 py-1.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
            {loadingList ? (
              <div className="text-xs text-neutral-400">Loading lotteries...</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {lotteries.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-neutral-900">
                        Stake ${lot.stake.toFixed(2)} - {lot.drawDate}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Tickets: {lot.availableTickets}/{lot.totalTickets} available • Status: {lot.status}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Prizes: 1st ${lot.firstPrize.toFixed(2)}, 2nd ${lot.secondPrize.toFixed(2)}, 3rd ${lot.thirdPrize.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button
                        type="button"
                        className="mb-1 px-2 py-1 rounded bg-neutral-200 text-xs font-semibold hover:bg-neutral-300"
                        onClick={() => router.push(`/post-lottery/${lot.id}`)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="mb-1 px-2 py-1 rounded bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600"
                        onClick={() => openEditLottery(lot)}
                      >
                        Edit
                      </button>
                      {lot.availableTickets === 0 && lot.status !== 'completed' && (
                        <button
                          type="button"
                          className={`px-2 py-1 rounded text-white text-xs font-semibold ${
                            lot.status === 'PAID'
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          onClick={() => handleSetToPaid(lot.id)}
                          disabled={lot.status === 'PAID'}
                        >
                          {lot.status === 'PAID' ? 'Already PAID' : 'Set to PAID'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {editingLottery && (
                  <form onSubmit={handleEditSubmit} className="mt-4 p-4 bg-neutral-100 rounded-lg border border-neutral-300 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor="editStake">Ticket price</label>
                      <input id="editStake" type="number" min={0} step={0.01} className="border rounded px-2 py-1" value={editStake} onChange={e => setEditStake(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor="editTotalTickets">Max tickets</label>
                      <input id="editTotalTickets" type="number" min={1} className="border rounded px-2 py-1" value={editTotalTickets} onChange={e => setEditTotalTickets(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor="editDrawDate">Draw date</label>
                      <input id="editDrawDate" type="date" className="border rounded px-2 py-1" value={editDrawDate} onChange={e => setEditDrawDate(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor="editDrawTime">Draw time</label>
                      <input id="editDrawTime" type="time" className="border rounded px-2 py-1" value={editDrawTime} onChange={e => setEditDrawTime(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor="editFirstPrize">1st prize</label>
                      <input id="editFirstPrize" type="number" min={0} step={0.01} className="border rounded px-2 py-1" value={editFirstPrize} onChange={e => setEditFirstPrize(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor="editSecondPrize">2nd prize</label>
                      <input id="editSecondPrize" type="number" min={0} step={0.01} className="border rounded px-2 py-1" value={editSecondPrize} onChange={e => setEditSecondPrize(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium" htmlFor="editThirdPrize">3rd prize</label>
                      <input id="editThirdPrize" type="number" min={0} step={0.01} className="border rounded px-2 py-1" value={editThirdPrize} onChange={e => setEditThirdPrize(e.target.value)} required />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button type="submit" disabled={editLoading} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60">{editLoading ? 'Saving…' : 'Save'}</button>
                      <button type="button" className="px-4 py-2 rounded bg-neutral-300 text-neutral-800 font-semibold" onClick={() => setEditingLottery(null)}>Cancel</button>
                    </div>
                  </form>
                )}
                {lotteries.length === 0 && (
                  <div className="text-[11px] text-neutral-400 text-center py-3">
                    No lotteries posted yet.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5">
            {error && (
              <div className="mb-3 text-xs text-red-500 text-center font-medium">{error}</div>
            )}
            {message && (
              <div className="mb-3 text-xs text-emerald-600 text-center font-medium">{message}</div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-800" htmlFor="ticketPrice">
                    Ticket price
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <DollarSign size={14} className="text-neutral-400" />
                    <input
                      id="ticketPrice"
                      type="number"
                      min={0}
                      step={0.01}
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="0.50"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-800" htmlFor="maxTickets">
                    Max tickets
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <Hash size={14} className="text-neutral-400" />
                    <input
                      id="maxTickets"
                      type="number"
                      min={1}
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="100"
                      value={totalTickets}
                      onChange={(e) => setTotalTickets(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-800" htmlFor="drawDate">
                    Draw date
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <Calendar size={14} className="text-neutral-400" />
                    <input
                      id="drawDate"
                      type="date"
                      className="flex-1 bg-transparent outline-none text-sm"
                      value={drawDate}
                      onChange={(e) => setDrawDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-800" htmlFor="drawTime">
                    Draw time
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <Clock size={14} className="text-neutral-400" />
                    <input
                      id="drawTime"
                      type="time"
                      className="flex-1 bg-transparent outline-none text-sm"
                      value={drawTime}
                      onChange={(e) => setDrawTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-800" htmlFor="firstPrize">
                    1st prize amount
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <DollarSign size={14} className="text-neutral-400" />
                    <input
                      id="firstPrize"
                      type="number"
                      min={0}
                      step={0.01}
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="500"
                      value={firstPrize}
                      onChange={(e) => setFirstPrize(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-neutral-800" htmlFor="secondPrize">
                    2nd / 3rd prize amounts
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                      <DollarSign size={14} className="text-neutral-400" />
                      <input
                        id="secondPrize"
                        type="number"
                        min={0}
                        step={0.01}
                        className="flex-1 bg-transparent outline-none text-sm"
                        placeholder="200"
                        value={secondPrize}
                        onChange={(e) => setSecondPrize(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                      <DollarSign size={14} className="text-neutral-400" />
                      <input
                        id="thirdPrize"
                        type="number"
                        min={0}
                        step={0.01}
                        className="flex-1 bg-transparent outline-none text-sm"
                        placeholder="100"
                        value={thirdPrize}
                        onChange={(e) => setThirdPrize(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-neutral-800" htmlFor="manualDrawDate">
                  Manual draw date (any format)
                </label>
                <input
                  id="manualDrawDate"
                  type="text"
                  className="flex-1 bg-transparent outline-none text-sm border border-neutral-200 rounded-lg px-3 py-2"
                  placeholder="e.g. Meskerem 2 2025 or custom text"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                />
                <span className="text-xs text-neutral-400">This will be saved as-is for display only. Not used for backend draw logic.</span>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="mt-2 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
                {formLoading ? 'Posting…' : 'Post new lottery'}
              </button>
            </form>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
