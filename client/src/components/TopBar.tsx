import { User as UserIcon, Gift, Wallet, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../profileContext";
import { useState } from "react";

const TopBar = () => {
  const [showBalance, setShowBalance] = useState(true);
  const navigate = useNavigate();
  const { profile, userLabel, avatarUrl, status } = useProfile();

  return (
    <div className="topbar-gradient flex items-center justify-between border-b-2 border-slate-800/60 px-2 py-1">

      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-10 w-10 rounded-full object-cover border border-slate-800"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
            <UserIcon size={15} className="text-slate-300" />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span
              className="truncate text-sm font-semibold text-[#9aa1b1]"
              data-testid="user"
            >
              {profile?.name || userLabel || "Loading..."}
            </span>

            {/* Verified Badge */}
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500">
              <svg
                className="h-2.5 w-2.5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4z" />
              </svg>
            </div>
          </div>

          <span
            className="block truncate text-[10px] text-slate-500"
            data-testid="status"
          >
            @{profile?.username}
          </span>
        </div>
      </div>

      {/* Center */}
      <div className="flex flex-col items-center leading-tight">
        <span className="text-[11px] font-semibold text-[#4ac4b8]">
          Bonus
        </span>

        <span className="text-sm font-semibold text-[#9aa1b1]">
          {profile?.rewardBalance ?? 0} ETB
        </span>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-1 leading-tight">
        <span
          className="cursor-pointer rounded-full px-2 py-0.5 text-sm font-semibold text-green-600"
          onClick={() => setShowBalance((prev) => !prev)}
        >
          {showBalance
            ? profile?.balance?.currentBalance?.toFixed?.(2) ?? "0.00"
            : "****"}{" "}
          ETB
        </span>

        <button
          type="button"
          onClick={() => navigate("/deposit")}
          className="flex items-center gap-1 rounded-md bg-green-700 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-green-500"
        >
          <Banknote size={13} />
          Deposit
        </button>
      </div>

    </div>
  );
};

export default TopBar;
