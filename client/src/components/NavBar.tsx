import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2,
  User,
  Trophy,
  Upload,
  Download,
} from "lucide-react";

const NavBar = () => {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const itemClass = (path: string) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 transition-colors ${isActive(path)
      ? "text-blue-500"
      : "text-slate-400 hover:text-blue-400"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-[#141415]/95 backdrop-blur-sm">
      <div className="flex h-12 items-center justify-around px-1">

        <Link to="/games" className={itemClass("/games")}>
          <Gamepad2 size={18} strokeWidth={2.2} />
          <span className="text-[10px] font-medium">Games</span>
        </Link>

        <Link to="/deposit" className={itemClass("/deposit")}>
          <Download size={18} strokeWidth={2.2} />
          <span className="text-[10px] font-medium">Deposit</span>
        </Link>

        <Link to="/leaderboard" className={itemClass("/leaderboard")}>
          <Trophy size={18} strokeWidth={2.2} />
          <span className="text-[10px] font-medium">Ranking</span>
        </Link>

        <Link to="/withdraw" className={itemClass("/withdraw")}>
          <Upload size={18} strokeWidth={2.2} />
          <span className="text-[10px] font-medium">Withdraw</span>
        </Link>

        <Link to="/profile" className={itemClass("/profile")}>
          <User size={18} strokeWidth={2.2} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
        {/* <Link to="/shamo" className={flex flex-col items-center gap-1.5 transition ${active( "/shamo", )} hover:text-blue-500} > <Gift size={20} className="text-slate-400"/> <span className="text-[12px] text-slate-400 font-semibold">Shamo</span> </Link> */}
      </div>
    </nav>
  );
};

export default NavBar;