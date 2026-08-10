"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ArrowRightLeft, RefreshCcw, Search } from "lucide-react";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";

type UserMini = {
  id: number;
  telegramId: string;
  name: string | null;
  username: string | null;
  userNumber: string | null;
};

type TransferItem = {
  id: number;
  senderId: number;
  receiverId: number;
  amount: number;
  createdAt: string;
  sender: UserMini;
  receiver: UserMini;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const userLabel = (user?: UserMini | null) => {
  if (!user) return "Unknown";
  if (user.name && user.username) return `${user.name} (@${user.username})`;
  if (user.name) return user.name;
  if (user.username) return `@${user.username}`;
  if (user.userNumber) return user.userNumber;
  return user.telegramId;
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("admin_token")
          : null;

      const res = await axios.get(`${BACKEND_URL}/admin/transfers`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (res.data?.success) {
        setTransfers(res.data.transfers ?? []);
      } else {
        setError(res.data?.error || "Failed to load transfers");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to load transfers");
      } else {
        setError("Failed to load transfers");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transfers;

    return transfers.filter((item) => {
      const sender = userLabel(item.sender).toLowerCase();
      const receiver = userLabel(item.receiver).toLowerCase();
      const amount = String(item.amount);
      return sender.includes(q) || receiver.includes(q) || amount.includes(q);
    });
  }, [transfers, search]);

  const totalAmount = useMemo(
    () =>
      filteredTransfers.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
    [filteredTransfers],
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-6 pb-16 px-4 mt-24 bg-neutral-50 flex flex-col items-center">
        <div className="w-full max-w-6xl flex flex-col gap-4">
          <header className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg font-semibold text-neutral-900">
                Transfers
              </h1>
              <button
                type="button"
                onClick={fetchTransfers}
                disabled={loading}
                className="px-2 py-2 rounded-md border border-neutral-200 bg-white text-red-400 hover:bg-neutral-100 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCcw size={18} className="inline-block" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white min-w-64">
                <Search size={14} className="text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sender, receiver, amount"
                  className="flex-1 bg-transparent outline-none text-xs text-neutral-800 placeholder:text-neutral-400"
                />
              </div>
              <span className="px-2 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                Records: {filteredTransfers.length}
              </span>
              <span className="px-2 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                Total: {totalAmount.toFixed(2)} ETB
              </span>
            </div>
          </header>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <section className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filteredTransfers.map((item) => {
                const isExpanded = expandedIds.includes(item.id);
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between p-3 rounded-md border border-neutral-200 hover:bg-neutral-50 text-xs">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 text-neutral-800">
                          <span className="font-medium truncate">
                            {userLabel(item.sender)}
                          </span>
                          <ArrowRightLeft
                            size={14}
                            className="text-neutral-400 shrink-0"
                          />
                          <span className="font-medium truncate">
                            {userLabel(item.receiver)}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                          {Number(item.amount).toFixed(2)} ETB
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id],
                            )
                          }
                          className="px-2 py-1 text-[11px] border border-neutral-200 rounded bg-white hover:bg-neutral-50"
                        >
                          {isExpanded ? "Hide" : "Details"}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 p-3 rounded-md border border-neutral-200 bg-neutral-50 text-xs">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-neutral-800 mb-2">
                              Sender
                            </h3>
                            <div className="text-[12px] text-neutral-700 space-y-1">
                              <div>ID: {item.sender?.id ?? "N/A"}</div>
                              <div>
                                Telegram ID: {item.sender?.telegramId ?? "N/A"}
                              </div>
                              <div>Name: {item.sender?.name ?? "N/A"}</div>
                              <div>
                                Username: {item.sender?.username ?? "N/A"}
                              </div>
                              <div>
                                User Number: {item.sender?.userNumber ?? "N/A"}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-neutral-800 mb-2">
                              Receiver
                            </h3>
                            <div className="text-[12px] text-neutral-700 space-y-1">
                              <div>ID: {item.receiver?.id ?? "N/A"}</div>
                              <div>
                                Telegram ID:{" "}
                                {item.receiver?.telegramId ?? "N/A"}
                              </div>
                              <div>Name: {item.receiver?.name ?? "N/A"}</div>
                              <div>
                                Username: {item.receiver?.username ?? "N/A"}
                              </div>
                              <div>
                                User Number:{" "}
                                {item.receiver?.userNumber ?? "N/A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {!loading && filteredTransfers.length === 0 && (
                <div className="text-[11px] text-neutral-400 text-center py-4">
                  No transfers found.
                </div>
              )}
              {loading && (
                <div className="text-[11px] text-neutral-400 text-center py-4">
                  Loading...
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
