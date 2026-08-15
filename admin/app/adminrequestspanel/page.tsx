"use client";
import React from "react";
import Navbar from '../component/Navbar';
import Footer from '../component/Footer';
import { useEffect, useState } from "react";
import axios from "axios";
import { Wallet, ArrowDownCircle, Search, User, Calendar, DollarSign, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

export type AdminRequestsPanelProps = {
  backendUrl: string;
};
// Types for requests and users

type DepositRequest = {
  transactionId: null;
  account?: string | null;
  id: number;
  methodInfo: string;
  amount: number;
  status: string;
  createdAt: string;
  user: {
    id: number;
    username: string | null;
    telegramId: string;
    name?: string | null;
    balance?: number;
  };
};

type WithdrawRequest = DepositRequest;

function AdminRequestsPanel({ backendUrl }: AdminRequestsPanelProps) {
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
  const [depositPage, setDepositPage] = useState(1);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<
    | { type: "deposit" | "withdraw"; id: number }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'above' | 'below'>('all');
  const [balanceValue, setBalanceValue] = useState(0);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRequests = async () => {    
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("admin_token")
          : null;
      const res = await axios.get(`${backendUrl}/admin/requests`, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = res.data;
      if (data.success) {
        setDepositRequests(data.deposits || []);
        setWithdrawRequests(data.withdrawals || []);
      } else {
        setError(data.error || "Failed to load requests");
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

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequestAction = async (
    kind: "deposit" | "withdrawal",
    action: "approve" | "reject",
    id: number
  ) => {
    setActingId({ type: kind === "deposit" ? "deposit" : "withdraw", id });
    setError(null);
    try {
      const url =
        kind === "deposit"
          ? `${backendUrl}/admin/deposits/${id}/${action}`
          : `${backendUrl}/admin/withdrawals/${id}/${action}`;
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("admin_token")
          : null;
      const res = await axios.post(
        url,
        {},
        {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      if (res.data?.success) {
        if (kind === "deposit") {
          setDepositRequests((prev) => {
            const updated = prev.filter((r) => r.id !== id);
            if ((depositPage - 1) * PAGE_SIZE >= updated.length && depositPage > 1) {
              setDepositPage(depositPage - 1);
            }
            return updated;
          });
        } else {
          setWithdrawRequests((prev) => {
            const updated = prev.filter((r) => r.id !== id);
            if ((withdrawPage - 1) * PAGE_SIZE >= updated.length && withdrawPage > 1) {
              setWithdrawPage(withdrawPage - 1);
            }
            return updated;
          });
        }
      } else {
        setError(res.data?.error || "Action failed");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error || "Action failed. Please try again."
        );
      } else {
        setError("Action failed. Please try again.");
      }
    } finally {
      setActingId(null);
    }
  };

  // Filtering functions
  const filterByBalance = (arr: DepositRequest[]) => {
    if (balanceFilter === 'all') return arr;
    return arr.filter(r => {
      const bal = typeof r.user.balance === 'number' ? r.user.balance : 0;
      if (balanceFilter === 'above') return bal > balanceValue;
      if (balanceFilter === 'below') return bal < balanceValue;
      return true;
    });
  };

  const filterByDate = (arr: DepositRequest[]) => {
    if (dateFilter === 'all') return arr;
    const now = new Date();
    return arr.filter(r => {
      const created = new Date(r.createdAt);
      if (dateFilter === 'today') return created.toDateString() === now.toDateString();
      if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return created >= weekAgo && created <= now;
      }
      if (dateFilter === 'month') return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filterBySearch = (arr: DepositRequest[]) => {
    if (!searchQuery.trim()) return arr;
    const query = searchQuery.toLowerCase();
    return arr.filter(r => 
      r.user.username?.toLowerCase().includes(query) ||
      r.user.telegramId.toLowerCase().includes(query) ||
      r.amount.toString().includes(query) ||
      r.methodInfo?.toLowerCase().includes(query)
    );
  };

  const filteredDeposits = filterBySearch(filterByDate(filterByBalance(depositRequests)));
  const filteredWithdrawals = filterBySearch(filterByDate(filterByBalance(withdrawRequests)));

  const getPagedDeposits = () => {
    const start = (depositPage - 1) * PAGE_SIZE;
    return filteredDeposits.slice(start, start + PAGE_SIZE);
  };

  const getPagedWithdrawals = () => {
    const start = (withdrawPage - 1) * PAGE_SIZE;
    return filteredWithdrawals.slice(start, start + PAGE_SIZE);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-16 px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 text-gray-100">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col justify-center bg-center">
                <h1 className="text-xl font-semibold text-yellow-300 text-center drop-shadow">Pending Requests</h1>
                <p className="text-sm text-gray-300 mt-1">Approve or reject deposit and withdrawal requests</p>
              </div>
              <button
                onClick={fetchRequests}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-medium rounded-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username, ID, or amount"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                />
              </div>

              {/* Balance Filter */}
              <div className="relative ">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 w-4 h-4" />
                <select
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value as 'all' | 'above' | 'below')}
                  className="w-full pl-10 text-gray-800 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 appearance-none bg-white"
                >
                  <option value="all">All Balances</option>
                  <option value="above">Balance Above</option>
                  <option value="below">Balance Below</option>
                </select>
              </div>

              {/* Balance Value */}
              {(balanceFilter === 'above' || balanceFilter === 'below') && (
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 w-4 h-4" />
                  <input
                    type="number"
                    value={balanceValue}
                    onChange={(e) => setBalanceValue(Number(e.target.value))}
                    placeholder="Amount"
                    className="w-full pl-10 pr-4 py-2.5 border text-gray-800 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              )}

              {/* Date Filter */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 w-4 h-4" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                  className="w-full pl-10 text-gray-800 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 appearance-none bg-white"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-linear-to-br from-green-50 to-green-100/30 rounded-xl border border-green-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Deposits</p>
                  <p className="text-xl font-semibold text-gray-900">{filteredDeposits.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      Total: {filteredDeposits.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-linear-to-br from-green-100 to-green-200/50">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-linear-to-br from-red-50 to-red-100/30 rounded-xl border border-red-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Withdrawals</p>
                  <p className="text-xl font-semibold text-gray-900">{filteredWithdrawals.length}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <DollarSign className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700 font-medium">
                      Total: {filteredWithdrawals.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-linear-to-br from-red-100 to-red-200/50">
                  <ArrowDownCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deposits Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-linear-to-br from-green-50 to-green-100/50">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Deposit Requests</h2>
                      <p className="text-sm text-gray-600 mt-0.5">Approve or reject user deposits</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {filteredDeposits.length} pending
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-125 overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3" />
                    <p className="text-sm text-gray-600">Loading deposits...</p>
                  </div>
                ) : filteredDeposits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                      <Wallet className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">No pending deposits</p>
                    <p className="text-xs text-gray-500 mt-1">No matching deposit requests found</p>
                  </div>
                ) : (
                  getPagedDeposits().map((req) => (
                    <div key={req.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-300 mt-0.5">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">
                                  <span className="text-sm text-gray-800 font-normal">
                                    {req.user.name
                                      ? req.user.name
                                      : req.user.username
                                        ? req.user.username
                                        : req.user.telegramId
                                    }
                                    {req.user.telegramId ? ` (${req.user.telegramId})` : ''}
                                  </span>
                                </div>
                                <div className="text-lg font-semibold text-green-600">
                                  +{req.amount.toFixed(2)} ETB
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(req.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              {/* Receipt Link - uses methodInfo for reliable payment method detection */}
                              {(() => {
                                const txId = req.transactionId || null;
                                const methodInfo = req.methodInfo || "";
                                
                                if (!txId || typeof txId !== "string") return null;
                                
                                let receiptUrl = null;
                                let paymentMethod = "";
                                
                                // 1️⃣ Extract payment method from methodInfo (most reliable)
                                if (methodInfo.includes("CBEBirr:")) {
                                  paymentMethod = "CBEBirr";
                                  receiptUrl = methodInfo.replace(/^CBEBirr:/, "");
                                } else if (methodInfo.includes("Telebirr:")) {
                                  paymentMethod = "Telebirr";
                                  receiptUrl = methodInfo.replace(/^Telebirr:/, "");
                                } else if (methodInfo.includes("Ebirr:")) {
                                  paymentMethod = "Ebirr";
                                  receiptUrl = methodInfo.replace(/^Ebirr:/, "");
                                } else if (/^FT[A-Z0-9]{14,}$/i.test(txId)) {
                                  // 2️⃣ Fallback: BOA (Abyssinia): FT + 16+ chars
                                  paymentMethod = "BOA";
                                  receiptUrl = `https://cs.bankofabyssinia.com/slip/?trx=${txId}`;
                                } else if (/^[A-Z0-9]{8,15}$/i.test(txId)) {
                                  // 3️⃣ Fallback: Telebirr (for old deposits)
                                  paymentMethod = "Telebirr";
                                  receiptUrl = `https://transactioninfo.ethiotelecom.et/receipt/${txId}`;
                                }
                                
                                return receiptUrl ? (
                                  <a
                                    href={receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline text-xs font-semibold mt-1 inline-block hover:text-blue-700"
                                  >
                                    View Receipt {txId} ({paymentMethod})
                                  </a>
                                ) : null;
                              })()}
                              {typeof req.user.balance === 'number' && (
                                <div className="text-xs text-blue-600 mt-1 font-medium">
                                  Balance: {req.user.balance.toFixed(2)} ETB
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={() => handleRequestAction("deposit", "approve", req.id)}
                          disabled={actingId?.type === "deposit" && actingId.id === req.id}
                          className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction("deposit", "reject", req.id)}
                          disabled={actingId?.type === "deposit" && actingId.id === req.id}
                          className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {filteredDeposits.length > PAGE_SIZE && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Page {depositPage} of {Math.ceil(filteredDeposits.length / PAGE_SIZE)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDepositPage(p => Math.max(1, p - 1))}
                        disabled={depositPage === 1}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                          depositPage === 1
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setDepositPage(p => Math.min(Math.ceil(filteredDeposits.length / PAGE_SIZE), p + 1))}
                        disabled={depositPage === Math.ceil(filteredDeposits.length / PAGE_SIZE)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                          depositPage === Math.ceil(filteredDeposits.length / PAGE_SIZE)
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Withdrawals Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-linear-to-br from-red-50 to-red-100/50">
                      <ArrowDownCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Withdrawal Requests</h2>
                      <p className="text-sm text-gray-600 mt-0.5">Approve or reject user withdrawals</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {filteredWithdrawals.length} pending
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-125 overflow-y-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3" />
                    <p className="text-sm text-gray-600">Loading withdrawals...</p>
                  </div>
                ) : filteredWithdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-3">
                      <ArrowDownCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium">No pending withdrawals</p>
                    <p className="text-xs text-gray-500 mt-1">No matching withdrawal requests found</p>
                  </div>
                ) : (
                  getPagedWithdrawals().map((req) => (
                    <div key={req.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center border border-gray-300 mt-0.5">
                              <User className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">
                                  <span className="text-sm text-gray-800 font-normal">
                                    {req.user.name
                                      ? req.user.name
                                      : req.user.username
                                        ? req.user.username
                                        : req.user.telegramId
                                    }
                                    {req.user.telegramId ? ` (${req.user.telegramId})` : ''}
                                  </span>
                                </div>
                                <div className="text-lg font-semibold text-red-600">
                                  -{req.amount.toFixed(2)} ETB
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(req.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-xs text-gray-600 mt-1 font-medium">
                                {req.methodInfo}
                              </div>
                              {typeof req.user.balance === 'number' && (
                                <div className="text-xs text-blue-600 mt-1 font-medium">
                                  Balance: {req.user.balance.toFixed(2)} ETB
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={() => handleRequestAction("withdrawal", "approve", req.id)}
                          disabled={actingId?.type === "withdraw" && actingId.id === req.id}
                          className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction("withdrawal", "reject", req.id)}
                          disabled={actingId?.type === "withdraw" && actingId.id === req.id}
                          className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {filteredWithdrawals.length > PAGE_SIZE && (
                <div className="px-6 py-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Page {withdrawPage} of {Math.ceil(filteredWithdrawals.length / PAGE_SIZE)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setWithdrawPage(p => Math.max(1, p - 1))}
                        disabled={withdrawPage === 1}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                          withdrawPage === 1
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setWithdrawPage(p => Math.min(Math.ceil(filteredWithdrawals.length / PAGE_SIZE), p + 1))}
                        disabled={withdrawPage === Math.ceil(filteredWithdrawals.length / PAGE_SIZE)}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                          withdrawPage === Math.ceil(filteredWithdrawals.length / PAGE_SIZE)
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export default function Page() {
  return <AdminRequestsPanel backendUrl={BACKEND_URL} />;
}