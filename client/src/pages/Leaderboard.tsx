/* eslint-disable react-hooks/set-state-in-effect */

import React, { useEffect, useState } from "react";
import {
  Trophy,
  User,
  Gamepad2,
  Mail,
  Award,
  Medal,
  Crown,
  ChevronRight,
} from "lucide-react";

/* TYPES - unchanged */
type LeaderboardEntry = {
  rank: number;
  name: string;
  value: number;
  userId: string;
};

type LeaderboardType = "PLAY" | "INVITATION";
type LeaderboardPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "TOTAL";

const TIMEFRAMES: LeaderboardPeriod[] = ["DAILY", "WEEKLY", "MONTHLY", "TOTAL"];
const TYPES: LeaderboardType[] = ["PLAY", "INVITATION"];

const WEEKEND_TOP3_REWARD_ETB: Record<
  LeaderboardType,
  { FIRST: number; SECOND: number; THIRD: number }
> = {
  PLAY: { FIRST: 200, SECOND: 150, THIRD: 100 },
  INVITATION: { FIRST: 200, SECOND: 100, THIRD: 50 },
};

const formatDisplayName = (name: string, maxLength = 12) => {
  if (!name) return "";
  return name.length <= maxLength ? name : `${name.slice(0, maxLength)}...`;
};

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/leaderboard`;

const Leaderboard: React.FC = () => {
  const [type, setType] = useState<LeaderboardType>("PLAY");
  const [period, setPeriod] = useState<LeaderboardPeriod>("MONTHLY");

  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [canDaily, setCanDaily] = useState(false);
  const [canWeekly, setCanWeekly] = useState(false);
  const [canMonthly, setCanMonthly] = useState(false);

  useEffect(() => {
    setLoading(true);
    const limit = period === "DAILY" ? 10 : 25;

    fetch(`${API_URL}?type=${type}&period=${period}&limit=${limit}`)
      .then((res) => res.json())
      .then((d) => setData(d || []))
      .finally(() => setLoading(false));
  }, [type, period]);

  useEffect(() => {
    if (type !== "PLAY") {
      setCanDaily(false);
      setCanWeekly(false);
      setCanMonthly(false);
      return;
    }
  }, [type]);

  const top3RewardEtb = WEEKEND_TOP3_REWARD_ETB[type];

  return (
    <div className=" min-h-[90vh] w-full bg-[#0f0f0f] mt-2 text-slate-200 px-4 pb-24 font-sans">
      {/* HEADER */}
      <header className="pt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-3  border-b-2  border-white/10">
          <Trophy size={16} className="text-blue-700" />
          <span className="text-[12px] text-blue-700 tracking-[0.3em] uppercase font-bold">
            leaderboard
          </span>
        </div>
      </header>

      {/* FILTERS */}
      <div className="mt-8 space-y-4">
        {/* TYPE */}
        <div className="flex bg-white/1 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                type === t
                  ? "bg-blue-900/90 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t === "PLAY" ? (
                <span className="flex items-center justify-center gap-1">
                  <Gamepad2 size={14} />
                  PLAYERS
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <Mail size={14} />
                  INVITERS
                </span>
              )}
            </button>
          ))}
        </div>

        {/* PERIOD */}
        <div className="flex justify-between items-center px-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setPeriod(tf)}
              disabled={
                type === "PLAY" &&
                ((tf === "DAILY" && !canDaily) ||
                  (tf === "WEEKLY" && !canWeekly) ||
                  (tf === "MONTHLY" && !canMonthly))
              }
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                period === tf
                  ? "text-blue-900 border-b-2 border-indigo-500 rounded-none"
                  : " text-slate-400 hover:text-white"
              }`}
            >
              {tf === "TOTAL" ? "ALL TIME" : tf}
            </button>
          ))}
        </div>
      </div>

      {/* PODIUM */}
      {!loading && data.length > 0 && (
        <div className="mt-10 flex justify-center items-end gap-3">
          {/* 2ND */}
          {data[1] && (
            <div className="flex-1 text-center">
              <div className="w-14 h-14 mx-auto rounded-full  border-[1.5px] border-slate-600 flex items-center justify-center">
                <User size={22} className="text-slate-400" />
              </div>
              <p className="mt-2 text-xs text-slate-300 font-medium">
                {formatDisplayName(data[1].name)}
              </p>
              <p className="text-indigo-300 font-bold text-sm">
                {data[1].value}
              </p>
            </div>
          )}

          {/* 1ST */}
          {data[0] && (
            <div className="flex-1 text-center -mt-6">
              <div className="relative">
                <Crown size={20} className="text-yellow-300 mx-auto mb-1" />
                <div className="w-20 h-20 mx-auto rounded-full  border-[1.5px] border-indigo-300 flex items-center justify-center">
                  <User size={32} className="text-orange-400" />
                </div>
              </div>

              <p className="mt-2 text-sm font-bold text-white">
                {formatDisplayName(data[0].name)}
              </p>
              <p className="text-indigo-200 font-extrabold text-lg">
                {data[0].value}
              </p>
            </div>
          )}

          {/* 3RD */}
          {data[2] && (
            <div className="flex-1 text-center">
              <div className="w-14 h-14 mx-auto rounded-full border-[1.5px] border-slate-500 flex items-center justify-center">
                <User size={22} className="text-slate-400" />
              </div>
              <p className="mt-2 text-xs text-slate-300 font-medium">
                {formatDisplayName(data[2].name)}
              </p>
              <p className="text-indigo-300 font-bold text-sm">
                {data[2].value}
              </p>
            </div>
          )}
        </div>
      )}

      {/* LIST */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
            <span className="text-[10px] font-bold tracking-widest text-indigo-400">
              LOADING SCORES
            </span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20  rounded-sm border border-dashed border-slate-800">
            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
              No Legends Yet
            </p>
          </div>
        ) : (
          <div className="rounded-sm overflow-hidden">
            {data.slice(3).map((entry, i) => {
              const rank = i + 4;
              return (
                <div
                  key={entry.userId}
                  className="flex justify-between items-center px-5 py-4 hover:bg-white/5 transition border-b-1 border-slate-800/50"
                >
                  <div className="flex items-center gap-4 ">
                    <span className="text-[10px] font-black text-slate-600 w-5">
                      {rank}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                      <User size={14} className="text-slate-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-200">
                      {formatDisplayName(entry.name)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-indigo-400">
                      {entry.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
