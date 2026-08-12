
import { useEffect, useState } from "react";
import { useProfile } from "../profileContext";

type MessageKind = "success" | "error" | "";

const Shamo = () => {
  const [comboCode, setComboCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<MessageKind>("");
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const { buildHeaders, refresh } = useProfile();

  const API_BASE =
    import.meta.env.VITE_API_BASE?.toString().replace(/\/$/, "") || "";

  useEffect(() => {
    if (!showCelebration) return;
    const timer = window.setTimeout(() => setShowCelebration(false), 5000);
    return () => window.clearTimeout(timer);
  }, [showCelebration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setMessageKind("");
    setRewardAmount(null);
    setShowCelebration(false);

    try {
      const res = await fetch(`${API_BASE}/api/profile/claim-rewards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildHeaders(),
        },
        body: JSON.stringify({ comboCode: comboCode.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const amount = Number(data.claimedChallenge ?? data.claimedAmount ?? 0);

        setRewardAmount(amount);
        setMessage(amount > 0 ? `You won ${amount} ETB` : "Reward claimed");
        setMessageKind("success");
        setShowCelebration(true);
        setComboCode("");

        await refresh();
      } else {
        setMessage(data.error || "Failed to claim reward");
        setMessageKind("error");
      }
    } catch {
      setMessage("Failed to claim reward");
      setMessageKind("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2 py-3 space-y-3 h-[78vh] overflow-y-auto bg-black text-white">

      {/* HEADER */}

      <div className="text-center space-y-1 mb-3">
        <h1 className="text-xl font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          Shamo Combo
        </h1>

        <p className="text-xs text-slate-400">
          Enter your reward code
        </p>
      </div>

      {/* CARD */}

      <div className="bg-[#0f0f0f] border border-slate-900 rounded-md p-4 space-y-4">

        {/* INPUT */}

        <div className="space-y-2">
          <label className="text-xs text-slate-400">
            Enter Code
          </label>

          <input
            type="text"
            value={comboCode}
            onChange={(e) => setComboCode(e.target.value)}
            placeholder="Enter your combo code here"
            disabled={loading}
            required
            className="w-full bg-black border border-slate-800 rounded-md px-3 py-2 text-white text-sm outline-none focus:border-yellow-400"
          />
        </div>

        {/* BUTTON */}

        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-2 rounded-md font-semibold ${
            loading
              ? "bg-slate-800 text-slate-500"
              : "bg-yellow-400 text-black hover:scale-[1.02]"
          }`}
        >
          {loading ? "Processing..." : "Claim Reward"}
        </button>

      </div>

      {/* CELEBRATION */}

      {showCelebration && messageKind === "success" && (
        <div className="border border-yellow-400/40 bg-yellow-500/10 rounded-md p-4 text-center">

          <div className="text-sm text-yellow-300">
            🎉 Reward Unlocked
          </div>

          <div className="text-2xl font-bold text-yellow-400 mt-1">
            +{rewardAmount ?? 0} ETB
          </div>

          <div className="text-xs text-slate-400 mt-1">
            Added to your balance
          </div>

        </div>
      )}

      {/* MESSAGE */}

      {message && !showCelebration && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            messageKind === "success"
              ? "border-green-500/30 text-green-400"
              : "border-red-500/30 text-red-400"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default Shamo;

