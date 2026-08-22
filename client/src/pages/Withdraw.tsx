import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useProfile } from "../profileContext";
import axios from "axios";
import {
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

const Withdraw = () => {
  const { profile } = useProfile();

  const [method, setMethod] = useState<"Telebirr" | "Ebirr" | "CBEbirr">(
    "Telebirr",
  );
  const [input, setInput] = useState("");
  const [amount, setAmount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const currentBalance = profile?.balance?.currentBalance ?? 0;
  const playedGames = profile?.numberOfTotalPlay ?? 0;
  const minGamesRequired = 10;
  const hasMinGamesForWithdraw = playedGames >= minGamesRequired;
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [withdrawLock, setWithdrawLock] = useState(true);

  /* ================= HISTORY ================= */

  const [history, setHistory] = useState<
    Array<{ id: number; amount: number; status: string; createdAt: string }>
  >([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!profile?.id) return;

    setHistoryLoading(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/withdraw/history?userId=${profile.id}`,
      );

      const data = await res.json();

      setHistory(Array.isArray(data.history) ? data.history : []);
    } finally {
      setHistoryLoading(false);
    }
  }, [BACKEND_URL, profile?.id]);

  useEffect(() => {
    fetchHistory();

    const fetchLockStatus = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/withdraw/lockstatus`);
        setWithdrawLock(res.data.isActive);
      } catch {
        //
      }
    };

    fetchLockStatus();
  }, [BACKEND_URL, fetchHistory]);

  /* ================= VALIDATION ================= */

  const amountNumber = useMemo(() => Number(amount), [amount]);

  const validAccount =
    method === "Telebirr" ? /^\d{10}$/.test(input) : /^\d{6,}$/.test(input);

  const hasPending = history.some((h) => h.status === "pending");

  // require minimum amount and ensure requested amount is within balance
  const canRequest = amountNumber >= 100 && amountNumber <= currentBalance;
  const showError = (msg: string) => {
    setError(msg);

    setTimeout(() => {
      setError(null);
    }, 5000);
  };
  const handleWithdraw = async () => {
const netBalance = amountNumber + 50;
    if (currentBalance < netBalance) {
      showError("ከወጪ በኋላ ቀሪ ሒሳብዎ ከ50 ETB በላይ መሆን አለበት");
      return;
    }
    const totalDeposits = profile?.balance?.totalDeposits ?? 0;
    if (totalDeposits < 50) {
      showError("ብር ለማውጣት ቢያንስ 50 ETB ገቢ (deposit) ማድረግ አለብዎት");
      return;
    }
    if (!hasMinGamesForWithdraw) {
      setShowAlert(true);
      showError(
        `ብር ለማውጣት ቢያንስ ተጨማሪ ${minGamesRequired - playedGames} ጨዋታዎችን መጫወት አለብዎት`,
      );
      return;
    }
    
    if (hasPending) {
      showError("በሂደት ላይ ያለ የወጪ ጥያቄ አለዎት");
      return;
    }

    if (!canRequest) {
      showError("የተሳሳተ የወጪ ጥያቄ");
      return;
    }

    setRequesting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${BACKEND_URL}/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: profile?.id,
          methodInfo: `${method}:${input}`,
          amount: amountNumber,
        }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setWithdrawLock(false);
        showError("የብር ማውጣት አገልግሎት በጊዜያዊነት ተቋርጧል");
      } else if (data.success) {
        setAmount("");
        setInput("");
        setSuccess("Withdrawal request submitted");

        fetchHistory();

        setTimeout(() => {
          setSuccess(null);
        }, 2000);
      } else {
        showError(data.error || "የብር ማውጣት ጥያቄው አልተሳካም");
      }
    } catch {
      showError("የኔትወርክ ችግር አጋጥሟል");
    } finally {
      setRequesting(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="w-full max-w-2xl mx-auto py-3 space-y-3 h-[78vh] overflow-y-auto bg-[#141415] text-slate-400 flex flex-col justify-center items-center ">
      {/* LOCK STATE */}
      {!withdrawLock ? (
        <div className="w-full bg-[#0f0f0f] rounded-md p-3 text-center text-red-400 text-sm">
          የብር ማውጣት አገልግሎት በጊዜያዊነት ተቋርጧል
        </div>
      ) : (
        <>
          {/* METHOD SECTION */}
          <div className="w-full bg-[#0f0f0f] border-b-2 border-slate-900 rounded-md p-3 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 text-center">
              የመክፈያ ዘዴን ይምረጡ
            </h2>

            <div className="grid grid-cols-3 gap-2 w=full ">
              {(["Telebirr", "Ebirr", "CBEbirr"] as const).map((m) => {
                const key = m.toLowerCase();

                let img = "/CBEbirr.png";
                if (key.includes("tele")) img = "/Telebirr.png";
                else if (key.includes("cbe")) img = "/CBEbirr.png";
                else if (key.includes("ebirr")) img = "/Ebirr.png";

                return (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`relative rounded-full h-25 w-25 flex items-center justify-center border transition-all
                    ${
                      method === m
                        ? "border-[2px] border-blue-700 shadow-sm"
                        : "border-slate-700"
                    }`}
                    style={{
                      backgroundImage: `url(${img})`,
                      backgroundSize: "cover", // cover the button area
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/60 rounded-full" />
                    <div className="relative z-10 text-xs font-bold text-white">
                      {m}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* WITHDRAW FORM (MATCH Deposit card style) */}
          <div className="bg-[#0f0f0f] border-b-2 border-slate-900 rounded-md p-3 space-y-3">
            {/* BALANCE */}
            <div className="flex justify-between text-xs items-center">
              <span className="text-slate-400 font-semibold">
                Available Balance
              </span>

              <button
                onClick={() => setShowBalance((p) => !p)}
                className="flex items-center gap-1 text-blue-600"
              >
                {showBalance
                  ? `${currentBalance.toFixed(2)} ETB`
                  : `${currentBalance.toFixed(2)} ETB`}
              </button>
            </div>
            {/* AMOUNT INPUT */}
            <input
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Minimum 100 ETB"
              className="w-full bg-black border border-slate-900  rounded-md px-3 py-2 text-white
              focus:border-slate-800 outline-none text-sm"
            />

            {/* ACCOUNT INPUT */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                method === "Telebirr" ? "Phone Number" : "Account Number"
              }
              className="w-full bg-black border border-slate-900 rounded-md px-3 py-2 text-white
              focus:border-slate-800 outline-none text-sm"
            />

            {!validAccount && input && (
              <div className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={14} />
                የተሳሳተ መረጃ
              </div>
            )}

            {/* BUTTON (MATCH Deposit style vibe) */}
            <button
              disabled={!canRequest}
              onClick={handleWithdraw}
              className={`w-full py-2 rounded-md text-sm font-semibold transition
              ${
                canRequest
                  ? "bg-blue-500 text-black"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {requesting ? "Processing..." : "Submit"}
            </button>

            {/* STATUS */}
            {error && (
              <div className="text-xs text-red-400 flex items-center gap-1">
                <XCircle size={14} /> {error}
              </div>
            )}

            {success && (
              <div className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> {success}
              </div>
            )}
          </div>

          {/* HISTORY (MATCH Deposit history box) */}
          <div className="bg-[#0f0f0f] border w-full border-slate-900 rounded-md p-3 space-y-2">
            {/* HEADER (CLICKABLE like Deposit) */}
            <div
              onClick={() => setShowTransactions((p) => !p)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <h2 className="text-sm font-semibold text-slate-400 flex items-center gap-1">
                Transactions
              </h2>

              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-300 ${
                  showTransactions ? "rotate-180" : ""
                }`}
              />
            </div>

            {/* DROPDOWN CONTENT */}
            <div
              className={`transition-all duration-300 overflow-hidden ${
                showTransactions
                  ? "max-h-[400px] opacity-100 mt-2"
                  : "max-h-0 opacity-0"
              }`}
            >
              {historyLoading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw
                    className="animate-spin text-yellow-400"
                    size={18}
                  />
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-black  text-xs rounded-md p-[4px]"
                    >
                      <div className="flex justify-between text-white font-semibold">
                        <span className="text-slate-400 text-xs">Status:</span>
                        <span className="text-blue-600">{tx.amount} ETB</span>
                      </div>

                      <div className="flex justify-between text-slate-400 mt-0.5 ">
                        <span
                          className={
                            tx.status === "approved"
                              ? "text-green-400"
                              : tx.status === "pending"
                                ? "text-blue-600"
                                : "text-red-400"
                          }
                        >
                          {tx.status}
                        </span>

                        <span>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Withdraw;
