"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Navbar from "../../component/Navbar";
import Footer from "../../component/Footer";
import {
  ArrowLeft,
  Filter,
  RefreshCw,
  Search,
  Ticket,
  Trash,
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

type LotteryDetail = {
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

type TicketRow = {
  id: string;
  ticket_number: number;
  purchase_time: string | null;
  user: {
    username: string | null;
    name: string | null;
  } | null;
};

export default function LotteryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lotteryId = (params?.id as string) ?? "";

  const [lottery, setLottery] = useState<LotteryDetail | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = async () => {
    if (!lotteryId) return;
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/lottery/${lotteryId}`);
      setLottery(res.data);
    } catch (err) {
      setError("Failed to load lottery details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchTickets = async () => {
    if (!lotteryId) return;
    setLoadingTickets(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/lottery/${lotteryId}/tickets`, {
        params: {
          status: statusFilter,
          q: searchTerm || undefined,
        },
      });
      setTickets(res.data || []);
    } catch (err) {
      setError("Failed to load tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [lotteryId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTickets();
    }, 200);
    return () => clearTimeout(timeout);
  }, [lotteryId, statusFilter, searchTerm]);

  const handleDelete = async () => {
    if (!lottery) return;
    const confirmed = window.confirm("Delete this lottery? This cannot be undone.");
    if (!confirmed) return;

    const adminPassword = window.prompt("Enter admin password to confirm deletion:");
    if (!adminPassword) {
      setError("Admin password is required to delete lottery.");
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setMessage(null);
      const token =
        typeof window !== "undefined" ? window.localStorage.getItem("admin_token") : null;
      await axios.delete(`${BACKEND_URL}/lottery/${lottery.id}`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        data: { adminPassword },
      });
      setMessage("Lottery deleted");
      router.push("/post-lottery");
    } catch (err) {
      setError("Failed to delete lottery. Check password or try again.");
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "-";
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 px-2 bg-neutral-50 flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col gap-5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/post-lottery")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-white text-sm font-semibold hover:bg-neutral-100"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold text-neutral-900">Lottery details</h1>
                <p className="text-xs text-neutral-500">Ticket list, filters, and admin actions.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                fetchDetail();
                fetchTickets();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs font-semibold hover:bg-neutral-100"
              disabled={loadingDetail || loadingTickets}
            >
              <RefreshCw size={14} className={loadingDetail || loadingTickets ? "animate-spin" : ""} />
              Refresh
            </button>
          </header>

          {error && <div className="text-xs text-red-500 font-medium text-center">{error}</div>}
          {message && <div className="text-xs text-emerald-600 font-medium text-center">{message}</div>}

          <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5">
            {loadingDetail && !lottery ? (
              <div className="text-sm text-neutral-400">Loading lottery...</div>
            ) : lottery ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-neutral-200">
  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
    {/* Stake */}
    <div className="space-y-1">
      <div className="text-xs font-medium text-neutral-500">STAKE</div>
      <div className="text-lg font-bold text-neutral-900">${lottery.stake.toFixed(2)}</div>
    </div>
    
    {/* Tickets */}
    <div className="space-y-1">
      <div className="text-xs font-medium text-neutral-500">TICKETS</div>
      <div className="text-sm font-semibold text-neutral-900">
        <span className="text-blue-600">{lottery.availableTickets}</span> / {lottery.totalTickets}
      </div>
    </div>
    
    {/* Draw */}
    <div className="space-y-1">
      <div className="text-xs font-medium text-neutral-500">DRAW</div>
      <div className="text-sm font-semibold text-neutral-900">
        {lottery.drawDate}<br/>
        <span className="text-neutral-600">{lottery.drawTime}</span>
      </div>
    </div>
    
    {/* Prizes */}
    <div className="space-y-1 col-span-2 lg:col-span-1">
      <div className="text-xs font-medium text-neutral-500">PRIZES</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-sm font-bold text-green-600">${lottery.firstPrize.toFixed(2)}</span>
        <span className="text-xs text-neutral-400">|</span>
        <span className="text-sm text-neutral-700">${lottery.secondPrize.toFixed(2)}</span>
        <span className="text-xs text-neutral-400">|</span>
        <span className="text-sm text-neutral-700">${lottery.thirdPrize.toFixed(2)}</span>
      </div>
    </div>
    
    {/* Status */}
    <div className="space-y-1">
      <div className="text-xs font-medium text-neutral-500">STATUS</div>
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
        lottery.status === 'Active' 
          ? 'bg-blue-100 text-blue-700' 
          : lottery.status === 'Completed'
          ? 'bg-green-100 text-green-700'
          : 'bg-neutral-100 text-neutral-700'
      }`}>
        {lottery.status}
      </div>
    </div>
  </div>
</div>
            ) : (
              <div className="text-sm text-neutral-400">Lottery not found.</div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Ticket size={16} />
                <h2 className="text-sm font-semibold text-neutral-900">Tickets</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-neutral-50 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <Search size={14} className="text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search ticket # or user"
                    className="bg-transparent outline-none text-sm flex-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-neutral-50">
                  <Filter size={14} className="text-neutral-400" />
                  <select
                    className="bg-transparent outline-none text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All tickets</option>
                    <option value="available">Available only</option>
                    <option value="claimed">Claimed only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Ticket #</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Purchased</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTickets ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-neutral-400">Loading tickets...</td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-neutral-400">No tickets found.</td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => {
                      const claimed = !!ticket.user;
                      const userLabel = claimed
                        ? ticket.user?.username || ticket.user?.name || "User"
                        : "Available";
                      return (
                        <tr key={ticket.id} className="border-t border-neutral-200">
                          <td className="px-3 py-2 font-semibold text-neutral-900">{ticket.ticket_number}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex px-2 py-1 rounded-md text-[11px] font-semibold ${claimed ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}
                            >
                              {claimed ? "Claimed" : "Available"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-neutral-700">{userLabel}</td>
                          <td className="px-3 py-2 text-neutral-600">{formatTime(ticket.purchase_time)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-neutral-500">
                Showing {tickets.length} tickets {statusFilter !== "all" ? `(${statusFilter})` : ""}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchTickets}
                  disabled={loadingTickets}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs font-semibold hover:bg-neutral-100"
                >
                  <RefreshCw size={14} className={loadingTickets ? "animate-spin" : ""} />
                  Reload
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!lottery || deleting}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Requires admin password to delete"
                >
                  <Trash size={14} />
                  Delete lottery
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
