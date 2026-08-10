import "./index.css";
import { Navigate, Route, Routes, BrowserRouter } from "react-router-dom";
import Profile from "./pages/Profile";
import Share from "./pages/Share";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Shamo from "./pages/Shamo";
import Leaderboard from "./pages/Leaderboard";
import { LotteryGame } from "./games/lottery";
import { BingoGame } from "./games/bingo";
import { TiktactoeGame } from "./games/tiktactoe";
import { AvatarRoom } from "./games/avatar";
import { KenoGame } from "./games/keno";
import { NumberPuzzleGame } from "./games/number-puzzle";
import { ProfileProvider } from "./profileContext";
import { StakeBonusProvider } from "./contexts/StakeBonusContext";
import { DepositMethodsProvider } from "./contexts/DepositMethodsContext";
import TopBar from "./components/TopBar";
import NavBar from "./components/NavBar";
import Landing from "./pages/Landing";
import HelpPage from "./pages/help";
// import AdminStakeBonuses from './pages/AdminStakeBonuses'

const AppShell = () => {
  return (
    <main className="min-h-screen bg-[#141415] px-3 ">
      <div className="">
        <TopBar />
        <div className="flex-1 flex flex-col gap-4">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/games" element={<Landing />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/share" element={<Share />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/shamo" element={<Shamo />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/games/keno" element={<KenoGame />} />
            <Route path="/games/lottery" element={<LotteryGame />} />
            <Route path="/games/bingo" element={<BingoGame />} />
            <Route path="/games/tiktactoe" element={<TiktactoeGame />} />
            <Route path="/games/avatar" element={<AvatarRoom />} />
            <Route path="/games/number-puzzle" element={<NumberPuzzleGame />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <div className="w-full fixed bottom-0 left-0 right-0 px-3 pb-4">
        <NavBar />
      </div>
    </main>
  );
};

const App = () => (
  <BrowserRouter>
    <ProfileProvider>
      <StakeBonusProvider>
        <DepositMethodsProvider>
          <AppShell />
        </DepositMethodsProvider>
      </StakeBonusProvider>
    </ProfileProvider>
  </BrowserRouter>
);

export default App;
