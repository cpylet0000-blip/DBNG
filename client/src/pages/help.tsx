import React from "react";
import { MessageSquare, Users, UserPlus } from "lucide-react";

const HelpPage = () => {
  const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_URL ?? "https://t.me/";
  const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL;
  const telegramGroup = import.meta.env.VITE_TELEGRAM_GROUP_USERNAME || " ";
  const telegramChannel = import.meta.env.VITE_TELEGRAM_CHANNEL_USERNAME || " ";

  return (
    <div className="flex flex-col items-center justify-start bg-black text-white p-4 ">

      <h1 className="text-2xl font-bold text-yellow-400 drop-shadow-[0_2px_6px_black]">
        Help & Support
      </h1>
      <p className="mb-4 text-center text-slate-300 max-w-md">
  Stay connected and get support anytime
      </p>

      {/* ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">

        {/* Join Telegram Group */}
        <a
          href={telegramGroup ? `https://t.me/${telegramGroup}` : TELEGRAM_URL}
          className="flex flex-col items-center justify-center gap-2 bg-black border border-yellow-400 rounded-xl p-6 shadow-lg shadow-yellow-500/30
                     hover:scale-105 hover:shadow-yellow-400/60 transition-all"
        >
          <Users size={30} className="text-slate-300" />
          <span className="text-slate-300 font-bold text-md drop-shadow-[0_1px_3px_black]">Join Telegram Group</span>
        </a>

        {/* Join Telegram Channel */}
        <a
          href={telegramChannel ? `https://t.me/${telegramChannel}` : TELEGRAM_URL}
          className="flex flex-col items-center justify-center gap-2 bg-black border border-yellow-400 rounded-xl p-6 shadow-lg shadow-yellow-500/30
                     hover:scale-105 hover:shadow-yellow-400/60 transition-all"
        >
          <MessageSquare size={30} className="text-slate-300" />
          <span className="text-slate-300 font-bold text-md drop-shadow-[0_1px_3px_black]">Join Telegram Channel</span>
        </a>

        {/* Get Admin Support */}
        <a
          href={SUPPORT_URL}
          className="flex flex-col items-center justify-center gap-2 bg-black border border-yellow-400 rounded-xl p-6 shadow-lg shadow-yellow-500/30
                     hover:scale-105 hover:shadow-yellow-400/60 transition-all"
        >
          <UserPlus size={30} className="text-slate-300" />
          <span className="text-slate-300 font-bold text-md drop-shadow-[0_1px_3px_black]">Contact Admin</span>
        </a>

      </div>
    </div>
  );
};

export default HelpPage;