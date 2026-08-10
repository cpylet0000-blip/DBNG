import { useEffect, useState } from "react";
import { useProfile } from "../profileContext";
import { Link } from "react-router-dom";
import { MessageSquare, Users, LifeBuoy } from "lucide-react";

type CelebrationState = { title: string; amount: number };
const MIN_BALANCE_AFTER_TRANSFER = 50;

const Profile = () => {
  const { profile, status, userLabel, refresh, buildHeaders } = useProfile();
  const API_BASE =
    import.meta.env.VITE_API_BASE?.toString().replace(/\/$/, "") || "";
  const supportUrl = import.meta.env.VITE_SUPPORT_URL || "";
  const telegramSupportUrl = supportUrl  ? `https://t.me/${supportUrl}`
    : "https://t.me/";
  const telegramGroupUsername =
    import.meta.env.VITE_TELEGRAM_GROUP_USERNAME || "";
  const telegramChannelUsername =
    import.meta.env.VITE_TELEGRAM_CHANNEL_USERNAME || "";
  const telegramGroupUrl = telegramGroupUsername
    ? `https://t.me/${telegramGroupUsername}`
    : "https://t.me/";
  const telegramChannelUrl = telegramChannelUsername
    ? `https://t.me/${telegramChannelUsername}`
    : "https://t.me/";

  // Logic remains untouched as requested
  const claimRewardsUrl = `${API_BASE}/api/profile/claim-rewards`;
  const claimRewardPlaysUrl = `${API_BASE}/api/profile/claim-reward-plays`;
  const sendMoneyUrl = `${API_BASE}/api/profile/send-money`;
  const rewardRuleUrl = `${API_BASE}/api/reward-rule`;

  const [phoneStatus, setPhoneStatus] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimingPlays, setClaimingPlays] = useState(false);
  const [sendingMoney, setSendingMoney] = useState(false);
  const [friendPhone, setFriendPhone] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [challengeRule, setChallengeRule] = useState<{
    numberOfGamePlay: number;
    rewardAmount: number;
  } | null>(null);

  useEffect(() => {
    const fetchRule = async () => {
      try {
        const res = await fetch(rewardRuleUrl);
        if (res.ok) {
          const data = await res.json();
          if (data?.rule) {
            setChallengeRule({
              numberOfGamePlay: data.rule.numberOfGamePlay,
              rewardAmount: data.rule.rewardAmount,
            });
          }
        }
      } catch {
        //
      }
    };
    fetchRule();
  }, [rewardRuleUrl]);

  const handleClaimRewards = async () => {
    setClaiming(true);
    setPhoneStatus(null);
    setCelebration(null);
    try {
      const res = await fetch(claimRewardsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        const rewardAmount = Number(
          data.claimedChallenge ??
            data.claimedAmount ??
            challengeRule?.rewardAmount ??
            0,
        );
        setPhoneStatus(`Successfully claimed ${rewardAmount} ETB`);
        setCelebration({
          title: "Challenge Reward Claimed",
          amount: rewardAmount,
        });
        await refresh();
      } else {
        setPhoneStatus(data.error || "Failed to claim rewards");
      }
    } catch {
      setPhoneStatus("Failed to claim rewards");
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimRewardPlays = async () => {
    setClaimingPlays(true);
    setPhoneStatus(null);
    setCelebration(null);
    try {
      const res = await fetch(claimRewardPlaysUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        const rewardAmount = Number(data.bonusAmount ?? 0);
        setPhoneStatus(
          `Successfully claimed ${rewardAmount} ETB from ${data.claimedPlays} plays`,
        );
        setCelebration({ title: "Play Reward Claimed", amount: rewardAmount });
        await refresh();
      } else {
        setPhoneStatus(data.error || "Failed to claim reward plays");
      }
    } catch {
      setPhoneStatus("Failed to claim reward plays");
    } finally {
      setClaimingPlays(false);
    }
  };

  const handleSendMoney = async () => {
    const receiverPhone = friendPhone.trim();
    const amount = Number(sendAmount);
    if (!receiverPhone) {
      setPhoneStatus("Friend phone number is required");
      return;
    }
    const digits = receiverPhone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 12) {
      setPhoneStatus("Enter a valid phone number");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPhoneStatus("Enter a valid amount greater than 0");
      return;
    }
    const currentBalance = Number(profile?.balance?.currentBalance ?? 0);
    const remainingBalance = currentBalance - amount;
    if (remainingBalance < MIN_BALANCE_AFTER_TRANSFER) {
      setPhoneStatus(
        `You must keep at least ${MIN_BALANCE_AFTER_TRANSFER} ETB after sending`,
      );
      return;
    }
    setSendingMoney(true);
    setPhoneStatus(null);
    setCelebration(null);
    try {
      const res = await fetch(sendMoneyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildHeaders() },
        body: JSON.stringify({ receiverPhone, amount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFriendPhone("");
        setSendAmount("");
        setPhoneStatus(
          `Sent ${Number(data.amount ?? amount).toFixed(2)} ETB to ${data?.receiver?.name || data?.receiver?.userNumber || "your friend"}`,
        );
        await refresh();
      } else {
        setPhoneStatus(data.error || "Failed to send money");
      }
    } catch {
      setPhoneStatus("Failed to send money");
    } finally {
      setSendingMoney(false);
    }
  };

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => {
      setCelebration(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [celebration]);

  return (
    <div className="w-full  max-w-lg mx-auto bg-[#0f0f0f] rounded-md text-slate-200 mt-10 py-2 px-1.5 font-sans selection:bg-yellow-500/30 ">
      <div className="my-10">
        {/* 1. MINIMAL HEADER */}
        <div className="flex items-center justify-center mb-6 pt-2 px-1">
          <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">
            My <span className="text-blue-600">Profile</span>
          </h1>
        </div>

        <div className="space-y-4">
          {/* 2. USER PROFILE CARD */}
          <div className="relative overflow-hidden bg-[#141415] border border-white/1 rounded-lg p-5 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-200 p-[2px]">
                  <div className="w-full h-full rounded-2xl bg-black flex items-center justify-center text-blue-400 font-bold text-2xl">
                    {profile?.name?.charAt(0) || "U"}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-black rounded-full shadow-lg"></div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {profile?.name || userLabel || "Player"}
                </h2>
                <p className="text-sm text-zinc-500 font-mono">
                  {profile?.userNumber || "000-000-000"}
                </p>
              </div>
            </div>
          </div>

          {/* 3. WALLET SECTION */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141415] border border-white/1 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Main Balance
                </p>
                <h3 className="text-xl font-black text-white">
                  {profile?.balance?.currentBalance?.toFixed?.(2) ?? "0.00"}{" "}
                  <span className="text-xs font-normal text-zinc-500">ETB</span>
                </h3>
              </div>
              <Link
                to="/deposit"
                className="flex items-center justify-center w-full py-2 bg-blue-500 hover:bg-blue-400 text-black text-xs font-black rounded-md transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/10"
              >
                DEPOSIT
              </Link>
            </div>

            <div className="bg-[#141415] border border-white/1 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Bonus Wallet
                </p>
                <h3 className="text-xl font-black text-emerald-400">
                  {profile?.rewardBalance ?? 0}{" "}
                  <span className="text-xs font-normal opacity-50">ETB</span>
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={telegramSupportUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-white/1 bg-[#141415] px-2 py-3 text-center transition-all hover:border-blue-500/60 hover:bg-blue-500/10 active:scale-[0.98]"
            >
              <LifeBuoy className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
                Support
              </span>
            </a>
            <a
              href={telegramGroupUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-white/1 bg-[#141415] px-2 py-3 text-center transition-all hover:border-blue-500/60 hover:bg-blue-500/10 active:scale-[0.98]"
            >
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
                Group
              </span>
            </a>
            <a
              href={telegramChannelUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-white/1 bg-[#141415] px-2 py-3 text-center transition-all hover:border-blue-500/60 hover:bg-blue-500/10 active:scale-[0.98]"
            >
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
                Channel
              </span>
            </a>
          </div>

          {/* 4. STATS GRID */}
          {/* <div className="grid grid-cols-3 gap-2 bg-zinc-900/30 p-2 rounded-2xl border border-white/5">
          <div className="text-center py-2">
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Invites</p>
            <p className="text-sm font-black text-white">{profile?.totalInvitation ?? 0}</p>
          </div>
          <div className="text-center py-2 border-x border-white/5 relative">
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Reward</p>
            <p className="text-sm font-black text-pink-500">{(profile?.totalInvitation ?? 0) * 2}</p>
            <Link to="/share" className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-pink-500/80 hover:text-pink-400 transition-colors underline whitespace-nowrap">Invite +</Link>
          </div>
          <div className="text-center py-2">
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Plays</p>
            <p className="text-sm font-black text-white">{profile?.rewardPlay ?? 0}</p>
          </div>
        </div> */}

          {/* 5. CHALLENGE TRACKER */}
          {challengeRule && (
            <div className="bg-gradient-to-r from-zinc-900 to-black border border-white/10 rounded-3xl p-5 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h4 className="text-xs font-black text-pink-500 uppercase tracking-widest mb-1">
                      Current Challenge
                    </h4>
                    <p className="text-[11px] text-zinc-400 leading-tight">
                      Complete {challengeRule.numberOfGamePlay} games to earn{" "}
                      {challengeRule.rewardAmount} ETB
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-white">
                      {profile?.numberOfTotalPlay ?? 0}
                    </span>
                    <span className="text-xs text-zinc-600 font-bold">
                      {" "}
                      / {challengeRule.numberOfGamePlay}
                    </span>
                  </div>
                </div>

                {/* Custom Progress Bar */}
                <div className="h-1.5 w-full bg-black rounded-full overflow-hidden mb-4 border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-pink-600 to-pink-200 transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(((profile?.numberOfTotalPlay ?? 0) / challengeRule.numberOfGamePlay) * 100, 100)}%`,
                    }}
                  />
                </div>

                <button
                  onClick={handleClaimRewards}
                  disabled={
                    claiming ||
                    (profile?.numberOfTotalPlay ?? 0) <
                      challengeRule.numberOfGamePlay
                  }
                  className={`w-full py-3 rounded-2xl font-black text-xs transition-all shadow-xl ${
                    (profile?.numberOfTotalPlay ?? 0) >=
                    challengeRule.numberOfGamePlay
                      ? "bg-pink-500 text-black hover:scale-[1.01] active:scale-95"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                  }`}
                >
                  {claiming ? "PROCESSING..." : "CLAIM CHALLENGE REWARD"}
                </button>
              </div>
              {/* Decor glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 blur-3xl -z-0"></div>
            </div>
          )}

          {/* 6. PLAY REWARDS BUTTON (Conditional) */}
          {/* {(profile?.rewardPlay ?? 0) > 10 && (
            <button
              onClick={handleClaimRewardPlays}
              disabled={claimingPlays}
              className={`w-full py-4 rounded-2xl font-black text-xs border transition-all ${
                claimingPlays
                  ? "bg-zinc-900 border-zinc-800 text-zinc-600"
                  : "bg-zinc-900/50 border-white/10 text-pink-500 hover:bg-pink-500/10 active:scale-95"
              }`}
            >
              {claimingPlays
                ? "CLAIMING..."
                : `COLLECT ${Math.floor((profile?.rewardPlay ?? 0) * 0.05)} ETB FROM REWARD PLAYS`}
            </button>
          )} */}

          {/* 7. NOTIFICATIONS & FEEDBACK */}
          <div className="space-y-2 pt-2">
            {celebration && (
              <div className="animate-in fade-in zoom-in duration-300 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  {celebration.title}
                </p>
                <p className="text-2xl font-black text-white">
                  +{celebration.amount} <span className="text-xs">ETB</span>
                </p>
              </div>
            )}

            {phoneStatus && (
              <div className="text-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs font-medium text-yellow-200">
                {phoneStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
