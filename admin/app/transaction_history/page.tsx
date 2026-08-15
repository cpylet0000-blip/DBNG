"use client";
import React from "react";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, Wallet, ArrowDownCircle, RefreshCcw } from "lucide-react";

type UserInfo = {
  id: number;
  username: string | null;
  telegramId: string;
  name: string | null;
};

type DepositReq = {
  methodInfo: string | null;
  paymentDateTime: string | null;
  transactionId: string | null;
  account: string;
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  user: UserInfo;
};

type WithdrawReq = DepositReq;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export default function RequestsPage() {
  const [deposits, setDeposits] = useState<DepositReq[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawReq[]>([]);
  // Sum up state
  const [depositSums, setDepositSums] = useState({
    today: 0,
    week: 0,
    month: 0,
    all: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<
    "all" | "deposit" | "withdrawal"
  >("all");
  const [depositPage, setDepositPage] = useState(1);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");
  const pageSize = 10;

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("admin_token")
          : null;
      const res = await axios.get(`${BACKEND_URL}/admin/requests/all`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.data?.success) {
        setDeposits(res.data.deposits ?? []);
        setWithdrawals(res.data.withdrawals ?? []);
      } else {
        setError(res.data?.error || "Failed to load requests");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to load requests");
      } else {
        setError("Failed to load requests");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to sum deposits by period
  const calculateDepositSums = (deposits: DepositReq[]) => {
    const now = new Date();
    let today = 0,
      week = 0,
      month = 0,
      all = 0;
    for (const d of deposits) {
      const created = new Date(d.createdAt);
      all += d.amount;
      if (created.toDateString() === now.toDateString()) today += d.amount;
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (created >= weekAgo && created <= now) week += d.amount;
      if (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      )
        month += d.amount;
    }
    return { today, week, month, all };
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    setDepositSums(calculateDepositSums(deposits));
  }, [deposits]);

  const filterByDate = (items: DepositReq[]) => {
    if (dateFilter === "all") return items;
    const now = new Date();
    return items.filter((r) => {
      const created = new Date(r.createdAt);
      if (dateFilter === "today") {
        return created.toDateString() === now.toDateString();
      }
      if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return created >= weekAgo && created <= now;
      }
      if (dateFilter === "month") {
        return (
          created.getMonth() === now.getMonth() &&
          created.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  };

  const filteredDeposits = useMemo(() => {
    let items = deposits;
    if (statusFilter !== "all")
      items = items.filter((r) => r.status.toLowerCase() === statusFilter);
    items = filterByDate(items);
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const name = r.user.username || "";
      const id = r.user.telegramId || "";
      const amt = r.amount.toString();
      return (
        name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        amt.includes(q)
      );
    });
  }, [deposits, search, statusFilter, dateFilter]);

  const filteredWithdrawals = useMemo(() => {
    let items = withdrawals;
    if (statusFilter !== "all")
      items = items.filter((r) => r.status.toLowerCase() === statusFilter);
    items = filterByDate(items);
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const name = r.user.username || "";
      const id = r.user.telegramId || "";
      const amt = r.amount.toString();
      return (
        name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        amt.includes(q)
      );
    });
  }, [withdrawals, search, statusFilter, dateFilter]);

  const depositTotalPages = Math.max(
    1,
    Math.ceil(filteredDeposits.length / pageSize),
  );
  const currentDepositPage = Math.min(depositPage, depositTotalPages);
  const pagedDeposits = useMemo(() => {
    const start = (currentDepositPage - 1) * pageSize;
    return filteredDeposits.slice(start, start + pageSize);
  }, [filteredDeposits, currentDepositPage]);

  const withdrawTotalPages = Math.max(
    1,
    Math.ceil(filteredWithdrawals.length / pageSize),
  );
  const currentWithdrawPage = Math.min(withdrawPage, withdrawTotalPages);
  const pagedWithdrawals = useMemo(() => {
    const start = (currentWithdrawPage - 1) * pageSize;
    return filteredWithdrawals.slice(start, start + pageSize);
  }, [filteredWithdrawals, currentWithdrawPage]);

  const showDeposits = kindFilter === "all" || kindFilter === "deposit";
  const showWithdrawals = kindFilter === "all" || kindFilter === "withdrawal";

  // Transaction status counts for sheet/summary
  const allTx = [...deposits, ...withdrawals];
  const statusCounts = allTx.reduce(
    (acc, tx) => {
      const status = tx.status.toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-6 pb-16 px-4 mt-24 bg-neutral-50 flex flex-col items-center">
        <div className="w-full max-w-6xl flex flex-col gap-6">
          <header className="flex flex-col sm:items-end sm:justify-between gap-3">
            <div className="flex justify-between w-full">
              <p className="text-xs text-neutral-500 mt-1">
                View all deposit and withdrawal history.
              </p>
              <button
                type="button"
                onClick={fetchAll}
                disabled={loading}
                className="px-1 py-1.5 rounded-md border border-neutral-200 bg-white text-red-400 hover:bg-neutral-100 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCcw size={24} className="inline-block" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mt-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white min-w-55">
                <Search size={14} className="text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by username, ID, amount"
                  className="flex-1 bg-transparent outline-none text-xs text-neutral-800 placeholder:text-neutral-400"
                />
              </div>
              <select
                value={kindFilter}
                onChange={(e) =>
                  setKindFilter(
                    e.target.value as "all" | "deposit" | "withdrawal",
                  )
                }
                className="px-2 py-1 rounded-md border border-neutral-200 bg-white outline-none text-xs text-neutral-700"
              >
                <option value="all">All</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "all"
                      | "pending"
                      | "approved"
                      | "rejected",
                  )
                }
                className="px-2 py-1 rounded-md border border-neutral-200 bg-white outline-none text-xs text-neutral-700"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(
                    e.target.value as "all" | "today" | "week" | "month",
                  )
                }
                className="px-2 py-1 rounded-md border border-neutral-200 bg-white outline-none text-xs text-neutral-700"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            {/* Sheet/summary of transaction counts by status */}
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span
                  key={status}
                  className="px-2 py-1 rounded bg-neutral-100 text-xs text-neutral-700 border border-neutral-200"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
                </span>
              ))}
            </div>
            {/* Deposit sum up feature */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 rounded bg-emerald-50 text-xs text-emerald-700 border border-emerald-200">
                Today: {depositSums.today.toFixed(2)} ETB
              </span>
              <span className="px-2 py-1 rounded bg-blue-50 text-xs text-blue-700 border border-blue-200">
                This Week: {depositSums.week.toFixed(2)} ETB
              </span>
              <span className="px-2 py-1 rounded bg-orange-50 text-xs text-orange-700 border border-orange-200">
                This Month: {depositSums.month.toFixed(2)} ETB
              </span>
              <span className="px-2 py-1 rounded bg-gray-50 text-xs text-gray-700 border border-gray-200">
                All Time: {depositSums.all.toFixed(2)} ETB
              </span>
            </div>
          </header>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <section className="grid grid-cols-1 lg:grid-cols-1 gap-6 items-start">
            {showDeposits && (
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 rounded">
                      <Wallet size={16} className="text-emerald-600" />
                    </div>
                    <h2 className="text-sm font-medium text-neutral-900">
                      Deposits
                    </h2>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    {loading
                      ? "Loading..."
                      : `${filteredDeposits.length} item(s)`}
                  </span>
                </div>
                <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
                  {pagedDeposits.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-md border border-neutral-200 hover:bg-neutral-50 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-neutral-800">
                          {req.user.name && req.user.username ? (
                            <>
                              {req.user.name}
                              <span className="ml-1 px-1 text-[10px] text-gray-700 bg-gray-100 rounded-full align-middle">
                                @{req.user.username}
                              </span>
                            </>
                          ) : req.user.name ? (
                            req.user.name
                          ) : req.user.username ? (
                            <span className="px-1 text-[10px] text-gray-700 bg-gray-100 rounded-full align-middle">
                              @{req.user.username}
                            </span>
                          ) : (
                            `ID: ${req.user.telegramId}`
                          )}
                        </span>

                        <span className="text-[11px] text-neutral-400">
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-green-500">
                          {req.paymentDateTime
                            ? `Paid at: ${new Date(req.paymentDateTime).toLocaleString()}`
                            : "Not paid yet"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-emerald-600">
                          +{req.amount.toFixed(2)} ETB
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                          {req.status}
                        </span>
                        {req.transactionId ? (
                          req.account == "251988818312" ? (
                            <a
                              href={`https://cbepay1.cbe.com.et/aureceipt?TID=${req.transactionId}&PH=${process.env.NEXT_PUBLIC_CBE_BIRR_ACCOUNT}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-blue-500"
                            >
                              {req.transactionId}
                            </a>
                          ) : req.methodInfo?.includes("Ebirr:") ? (
                            <a
                              href={req.methodInfo.replace(/^Ebirr:/, "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-blue-500"
                            >
                              {req.transactionId}
                            </a>
                          ) : req.methodInfo?.includes("CBEBirr:") ? (
                            <a
                              href={req.methodInfo.replace(/^CBEBirr:/, "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-blue-500"
                            >
                              {req.transactionId}
                            </a>
                          ) : req.transactionId.length > 17 ? (
                            <a
                              href={`https://apps.cbe.com.et:100/?id=${req.transactionId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-blue-500"
                            >
                              {req.transactionId}
                            </a>
                          ) : req.transactionId.length >= 15 &&
                            req.transactionId.length <= 18 ? (
                            <a
                              href={`https://cs.bankofabyssinia.com/slip/?trx=${req.transactionId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-blue-500"
                            >
                              {req.transactionId}
                            </a>
                          ) : (
                            <a
                              href={`https://transactioninfo.ethiotelecom.et/receipt/${req.transactionId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] uppercase tracking-wide text-blue-500"
                            >
                              {req.transactionId}
                            </a>
                          )
                        ) : null}
                        <a
                          href=""
                          className="text-[10px] uppercase tracking-wide text-neutral-500"
                        >
                          {req.transactionId
                            ? `TX: ${req.transactionId}`
                            : "No TX ID"}
                        </a>
                      </div>
                    </div>
                  ))}
                  {!loading && filteredDeposits.length === 0 && (
                    <div className="text-[11px] text-neutral-400 text-center py-4">
                      No deposit requests.
                    </div>
                  )}
                </div>
                {filteredDeposits.length > 0 && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-neutral-200 text-[11px] text-neutral-600">
                    <span>
                      Page {currentDepositPage} of {depositTotalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDepositPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentDepositPage === 1}
                        className="px-2 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDepositPage((p) =>
                            Math.min(depositTotalPages, p + 1),
                          )
                        }
                        disabled={currentDepositPage === depositTotalPages}
                        className="px-2 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showWithdrawals && (
              <div className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 rounded">
                      <ArrowDownCircle size={16} className="text-amber-600" />
                    </div>
                    <h2 className="text-sm font-medium text-neutral-900">
                      Withdrawals
                    </h2>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    {loading
                      ? "Loading..."
                      : `${filteredWithdrawals.length} item(s)`}
                  </span>
                </div>
                <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
                  {pagedWithdrawals.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-md border border-neutral-200 hover:bg-neutral-50 text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-neutral-800">
                          {req.user.name && req.user.username ? (
                            <>
                              {req.user.name}
                              <span className="ml-1 px-1 text-[10px] text-gray-700 bg-gray-100 rounded-full align-middle">
                                @{req.user.username}
                              </span>
                            </>
                          ) : req.user.name ? (
                            req.user.name
                          ) : req.user.username ? (
                            <span className="px-1 text-[10px] text-gray-700 bg-gray-100 rounded-full align-middle">
                              @{req.user.username}
                            </span>
                          ) : (
                            `ID: ${req.user.telegramId}`
                          )}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          Method: {req.methodInfo ? req.methodInfo : "N/A"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-amber-600">
                          -{req.amount.toFixed(2)} ETB
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!loading && filteredWithdrawals.length === 0 && (
                    <div className="text-[11px] text-neutral-400 text-center py-4">
                      No withdrawal requests.
                    </div>
                  )}
                </div>
                {filteredWithdrawals.length > 0 && (
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-neutral-200 text-[11px] text-neutral-600">
                    <span>
                      Page {currentWithdrawPage} of {withdrawTotalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setWithdrawPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentWithdrawPage === 1}
                        className="px-2 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setWithdrawPage((p) =>
                            Math.min(withdrawTotalPages, p + 1),
                          )
                        }
                        disabled={currentWithdrawPage === withdrawTotalPages}
                        className="px-2 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <Footer />
      </main>
    </>
  );
}
