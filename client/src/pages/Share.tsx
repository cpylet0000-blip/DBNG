import { useEffect, useMemo, useState } from "react";
import { useProfile } from "../profileContext";
import { Link } from "react-router-dom";

/* =========================
   Utils
========================= */
const apiUrl = (path: string) => {
  const rawBase = import.meta.env.VITE_API_BASE?.toString().trim() || "";
  const base = rawBase.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (base) return `${base}${cleanPath}`;
  return `${window.location.origin.replace(/\/$/, "")}${cleanPath}`;
};

const Share = () => {
  const { profile, buildHeaders } = useProfile();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [activeInvitations, setActiveInvitations] = useState(0);

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";
  const inviteLink = `https://t.me/${botUsername}?start=ref_${profile?.telegramId ?? " "}`;
  const telegramChannel = import.meta.env.VITE_TELEGRAM_CHANNEL_USERNAME || " ";
  const telegramGroup = import.meta.env.VITE_TELEGRAM_GROUP_USERNAME || " ";

  const joinItems = useMemo(
    () => [
      { id: "bot", title: "Bot Invite", link: inviteLink },
      {
        id: "channel",
        title: "Telegram Channel",
        link: `https://t.me/${telegramChannel}`,
      },
      {
        id: "group",
        title: "Telegram Group",
        link: `https://t.me/${telegramGroup}`,
      },
    ],
    [inviteLink],
  );

  /* ================= Fetch Invitations ================= */

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const headers = buildHeaders ? buildHeaders() : {};
        const res = await fetch(apiUrl("/api/user/invitations"), {
          credentials: "include",
          headers,
        });

        const data = await res.json();
        if (res.ok) setActiveInvitations(data.activeInvitations * 0); // multiply by 0 to prevent rewards during testing
        else throw new Error(data.error || "Failed to fetch invitations");
      } catch (e) {
        console.error("Failed to fetch invitations", e);
      }
    };

    fetchInvitations();
  }, [buildHeaders]);

  /* ================= Actions ================= */

  const handleCopy = async (id: string, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const canClaim = activeInvitations > 0 && !!profile?.userNumber;
  const rewardAmount = activeInvitations * 2;

  const handleClaim = async () => {
    setClaiming(true);
    setClaimStatus(null);

    try {
      const headers = { "Content-Type": "application/json", ...buildHeaders() };

      const res = await fetch(apiUrl("/api/user/invitations/claim"), {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Claim failed");

      setClaimStatus(`Successfully claimed ${rewardAmount} ETB`);
      setActiveInvitations(0);
    } catch (e) {
      setClaimStatus((e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="w-full max-w-2xl mx-auto px-2 py-3 space-y-3 h-[78vh] overflow-y-auto bg-black text-slate-300">
      {/* HEADER */}

      <div className="text-center space-y-1 mb-3">
        <h1 className="text-xl font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          Invite & Earn
        </h1>

        <p className="text-xs text-slate-400">
          Share your link and earn rewards
        </p>
      </div>

      {/* STATS */}

      <div className="bg-[#0f0f0f] border border-slate-900 rounded-md p-3 text-center">
        <div className="text-lg font-bold text-yellow-400">
          {activeInvitations}
        </div>

        <div className="text-xs text-slate-400">Active Invitations</div>

         {/* INVITE LINKS <div className="text-xs text-slate-500 mt-1">Earn 2 ETB per friend</div>*/}
      </div>

     

      <div className="space-y-2">
        <div className="text-xs text-slate-400 font-semibold">Invite Links</div>

        {joinItems.map((item) => (
          <div
            key={item.id}
            className="bg-[#0f0f0f] border border-slate-900 rounded-md p-3 flex items-center justify-between"
          >
            <div className="flex flex-col max-w-[70%]">
              <div className="text-sm text-slate-300 font-medium">
                {item.title}
              </div>

              <div className="text-[10px] text-slate-500 truncate">
                {item.link}
              </div>
            </div>

            <button
              onClick={() => handleCopy(item.id, item.link)}
              className="px-3 py-1 rounded-md bg-yellow-400 text-black text-xs font-semibold hover:scale-[1.03]"
            >
              {copiedId === item.id ? "Copied" : "Copy"}
            </button>
          </div>
        ))}
      </div>

      {/* CLAIM REWARD */}

      <div className="bg-[#0f0f0f] border border-slate-900 rounded-md p-3 text-center space-y-3">
        <div>
          <div className="text-xs text-slate-400">Total Reward</div>

          <div className="text-lg font-bold text-yellow-400">
            {rewardAmount} ETB
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={!canClaim || claiming}
          className={`w-full py-2 rounded-md font-semibold ${
            !canClaim || claiming
              ? "bg-slate-800 text-slate-500"
              : "bg-yellow-400 text-black hover:scale-[1.02]"
          }`}
        >
          {claiming
            ? "Processing..."
            : canClaim
              ? `Claim ${rewardAmount} ETB`
              : "No Rewards to Claim"}
        </button>

        {claimStatus && (
          <div className="text-xs text-yellow-400">{claimStatus}</div>
        )}

        {!profile?.userNumber && (
          <div className="text-xs text-slate-500">
            Add phone number in{" "}
            <Link to="/profile" className="underline text-yellow-400">
              Profile
            </Link>{" "}
            to claim
          </div>
        )}
      </div>

      {/* HOW IT WORKS */}

      <div className="bg-[#0f0f0f] border border-slate-900 rounded-md p-3 text-xs text-slate-400">
        <div className="text-slate-300 text-sm font-semibold mb-2">ጏደኛዎን በማጋራት ገቢ ያግኙ</div>

        <ol className="space-y-1 text-xs list-decimal list-inside">
          <li>የግብዣ ሊንክዎን copy ያድርጉ እና ያአጋሩ</li>
          <li>ጓደኛዎ ቦቱን ይቀላቀላል</li>
          <li>ለእያንዳንዱ invitation 2 ብር ያገኛሉ</li>
          <li>ሽልማቶትን በማንኛውም ጊዜ Claim ያድርጉ</li>
        </ol>
      </div>
    </div>
  );
};

export default Share;
