// Audio for spinning
const SPIN_AUDIO_SRC = "/audio/start.mp3";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  RefreshCw,
  ArrowLeft,
  Plus,
  Minus,
  Banknote,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BettingBoard from "./BettingBoard";
import PayoutTable from "./PayoutTable";
import SpinWinAPI from "./SpinWinAPI";
import { useProfile } from "../../profileContext";

const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];
const SECTOR_GROUPS = [
  { label: "A", startWheelIndex: 1, centerWheelIndex: 4 }, // 32, 15, 19, 4, 21, 2
  { label: "B", startWheelIndex: 7, centerWheelIndex: 10 }, // 25, 17, 34, 6, 27, 13
  { label: "C", startWheelIndex: 13, centerWheelIndex: 16 }, // 36, 11, 30, 8, 23, 10
  { label: "D", startWheelIndex: 19, centerWheelIndex: 22 }, // 5, 24, 16, 33, 1, 20
  { label: "E", startWheelIndex: 25, centerWheelIndex: 28 }, // 14, 31, 9, 22, 18, 29
  { label: "F", startWheelIndex: 31, centerWheelIndex: 34 }, // 7, 28, 12, 35, 3, 26
];

type WheelColor = "red" | "black" | "green";

interface Bet {
  id?: number;
  type: string;
  value: string | number;
  amount: number;
  odds: number;
  status?: "pending" | "won" | "lost" | "cancelled";
}

interface SpinResult {
  id?: number;
  number: number;
  color: WheelColor;
  timestamp: Date;
}

interface ApiBet {
  id: number;
  betType: string;
  betValue: string;
  amount: number | string;
  odds: number | string;
  status: "pending" | "won" | "lost" | "cancelled";
}

interface ApiSpin {
  id?: number;
  winningNumber: number;
  winningColor: WheelColor;
  createdAt: string;
}

interface ApiGameResponse {
  game?: {
    gameId?: string;
    status?: string;
    bets?: ApiBet[];
  };
  roundEndsAt?: number;
  roundSecondsRemaining?: number;
  isRoundSpinning?: boolean;
}

interface ApiHistoryResponse {
  spins?: ApiSpin[];
}

interface SocketSpinResult {
  gameId?: string;
  winningNumber: number;
  winningColor: WheelColor;
  totalWinnings?: number;
  winners?: Array<{
    username: string;
    amount: number;
    winningNumber: number;
    betType: string;
    betValue: string;
  }>;
}

interface SocketRoundTimer {
  gameId?: string;
  roundEndsAt?: number;
  secondsRemaining?: number;
  isRoundSpinning?: boolean;
}

interface SocketRoundStarted {
  gameId?: string;
  roundEndsAt?: number;
  secondsRemaining?: number;
}

interface SocketRoundSpinning {
  gameId?: string;
}

const SPIN_ANIMATION_DURATION_S = 6.8;
const SPIN_ANIMATION_BUFFER_MS = 350;
const SPIN_ANIMATION_MS =
  SPIN_ANIMATION_DURATION_S * 1000 + SPIN_ANIMATION_BUFFER_MS;
const SPIN_EASE: [number, number, number, number] = [0.03, 0.95, 0.12, 1];
const WINNING_NUMBER_HIGHLIGHT_MS = 1400;
const WINNER_DISPLAY_EXTENSION_MS = 10000; // Additional 10 seconds for winners
const DEFAULT_CHIP = 10;

const formatCountdown = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return "--:--";
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutesPart = Math.floor(safeSeconds / 60);
  const secondsPart = safeSeconds % 60;
  return `${minutesPart}:${String(secondsPart).padStart(2, "0")}`;
};

const getSecondsFromRoundEnd = (roundEndsAtMs: number) => {
  const remainingMs = Math.max(0, roundEndsAtMs - Date.now());
  return Math.ceil(remainingMs / 1000);
};

const aggregatePendingBets = (rawBets: ApiBet[]): Bet[] => {
  const merged = new Map<string, Bet>();

  for (const bet of rawBets) {
    if (bet.status !== "pending") continue;

    const key = `${bet.betType}:${bet.betValue}`;
    const current = merged.get(key);

    if (current) {
      current.amount += Number(bet.amount);
      continue;
    }

    merged.set(key, {
      id: bet.id,
      type: bet.betType,
      value: bet.betValue,
      amount: Number(bet.amount),
      odds: Number(bet.odds),
      status: bet.status,
    });
  }

  return Array.from(merged.values());
};

const extractApiErrorMessage = (error: unknown): string => {
  const maybeAxios = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };

  return (
    maybeAxios?.response?.data?.error ||
    maybeAxios?.response?.data?.message ||
    maybeAxios?.message ||
    "Request failed"
  );
};

const getNumberColor = (num: number): WheelColor => {
  if (num === 0) return "green";
  return RED_NUMBERS.includes(num) ? "red" : "black";
};

const SpinWinGame: React.FC = () => {
  // Ref for spinning audio
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  // Play spin audio
  const playSpinAudio = useCallback(() => {
    try {
      if (!spinAudioRef.current) {
        spinAudioRef.current = new Audio(SPIN_AUDIO_SRC);
      }
      // Loop while the wheel is spinning so short clips don't cut out mid-spin.
      spinAudioRef.current.loop = true;
      spinAudioRef.current.currentTime = 0;
      const playPromise = spinAudioRef.current.play();
      if (playPromise) {
        playPromise.catch(() => {
          /* browser blocked autoplay - ignore */
        });
      }
    } catch {
      /* audio not available - ignore */
    }
  }, []);

  const stopSpinAudio = useCallback(() => {
    try {
      if (!spinAudioRef.current) return;
      spinAudioRef.current.pause();
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.loop = false;
    } catch {
      // audio not available - ignore
    }
  }, []);
  const { profile, refresh, buildHeaders } = useProfile();
  const navigate = useNavigate();

  const apiRef = useRef(new SpinWinAPI());
  const currentGameIdRef = useRef<string | null>(null);
  const spinningRoundGameIdRef = useRef<string | null>(null);
  const pendingNextRoundGameIdRef = useRef<string | null>(null);
  const pendingRoundStartRef = useRef<SocketRoundStarted | null>(null);
  const isSpinningRef = useRef(false);
  const showingResultRef = useRef(false);
  const refreshRef = useRef(refresh);
  const lastRotationRef = useRef(0);
  const latestLoadRequestIdRef = useRef(0);
  const latestRoundEndsAtRef = useRef<number | null>(null);
  const lastTicketAcceptAtRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [startRotation, setStartRotation] = useState(0);
  const [pendingSelections, setPendingSelections] = useState<Bet[]>([]);
  const [ticketedBets, setTicketedBets] = useState<Bet[]>([]);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [history, setHistory] = useState<SpinResult[]>([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  // Removed showResultPanel, show winners only while spinning
  const [selectedChip, setSelectedChip] = useState(DEFAULT_CHIP);
  const [gameId, setGameId] = useState<string | null>(null);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [spinCountdown, setSpinCountdown] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [highlightedWinningNumber, setHighlightedWinningNumber] = useState<
    number | null
  >(null);
  const [showWinnersDisplay, setShowWinnersDisplay] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [lastSpinId, setLastSpinId] = useState<number | null>(null);
  const [recentWinners, setRecentWinners] = useState<
    Array<{
      username: string;
      amount: number;
      winningNumber: number;
      timestamp: Date;
    }>
  >([]);

  const chipValues = [10, 20, 50, 100];
  const selectedChipIndex = chipValues.findIndex(
    (value) => value === selectedChip,
  );
  const pendingPotentialReturn = pendingSelections.reduce(
    (sum, bet) => sum + bet.amount * bet.odds,
    0,
  );
  const ticketedPotentialReturn = ticketedBets.reduce(
    (sum, bet) => sum + bet.amount * bet.odds,
    0,
  );
  const isSpinPhase = typeof spinCountdown === "number" && spinCountdown <= 0;
  // Keep the wheel visible during the entire result display (spin animation + highlight + winners)
  const showWheel =
    isSpinPhase ||
    isSpinning ||
    highlightedWinningNumber !== null ||
    showWinnersDisplay;

  const decreaseChip = () => {
    const currentIndex = selectedChipIndex >= 0 ? selectedChipIndex : 0;
    const nextIndex = Math.max(0, currentIndex - 1);
    const newChipValue = chipValues[nextIndex];
    setSelectedChip(newChipValue);

    // Update all pending bets to use the new stake amount
    setPendingSelections((prev) =>
      prev.map((bet) => ({
        ...bet,
        amount: newChipValue,
      })),
    );
  };

  const increaseChip = () => {
    const currentIndex = selectedChipIndex >= 0 ? selectedChipIndex : 0;
    const nextIndex = Math.min(chipValues.length - 1, currentIndex + 1);
    const newChipValue = chipValues[nextIndex];
    setSelectedChip(newChipValue);

    // Update all pending bets to use the new stake amount
    setPendingSelections((prev) =>
      prev.map((bet) => ({
        ...bet,
        amount: newChipValue,
      })),
    );
  };

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    latestRoundEndsAtRef.current = roundEndsAt;
  }, [roundEndsAt]);

  const syncActiveGame = useCallback((nextGameId: string) => {
    currentGameIdRef.current = nextGameId;
    setGameId(nextGameId);
    apiRef.current.gameId = nextGameId;
    apiRef.current.joinGame(nextGameId);
  }, []);

  const balance = profile?.balance?.currentBalance ?? 0;
  const slotAngle = 360 / WHEEL_NUMBERS.length;
  const sectorStartAngle = slotAngle * 0.5;
  const sectorSpanAngle = slotAngle * 6;
  const sectorStops = SECTOR_GROUPS.map((_, index) => {
    const start = sectorStartAngle + index * sectorSpanAngle;
    const end = start + sectorSpanAngle;
    const color = index % 2 === 0 ? "#f3c23e" : "#e5b12a";
    return `${color} ${start}deg ${end}deg`;
  }).join(", ");
  const zeroTailStart =
    sectorStartAngle + SECTOR_GROUPS.length * sectorSpanAngle;
  const sectorGradient = `conic-gradient(#c18a2f 0deg ${sectorStartAngle}deg, ${sectorStops}, #c18a2f ${zeroTailStart}deg 360deg)`;

  const loadGameData = useCallback(async () => {
    const requestId = ++latestLoadRequestIdRef.current;

    try {
      // Make all API calls concurrently for faster loading
      const [gameRes, historyRes] = await Promise.all([
        apiRef.current.getGame() as Promise<ApiGameResponse>,
        apiRef.current.getHistory(10, 0) as Promise<ApiHistoryResponse>,
      ]);

      // Ignore stale responses that finished out-of-order.
      if (requestId !== latestLoadRequestIdRef.current) {
        return;
      }

      if (gameRes?.game?.gameId) {
        const activeGameId = gameRes.game.gameId;
        syncActiveGame(activeGameId);
      }

      if (typeof gameRes?.roundEndsAt === "number") {
        setRoundEndsAt(gameRes.roundEndsAt);
        latestRoundEndsAtRef.current = gameRes.roundEndsAt;
      }

      if (typeof gameRes?.roundSecondsRemaining === "number") {
        if (typeof gameRes?.roundEndsAt === "number") {
          setSpinCountdown(getSecondsFromRoundEnd(gameRes.roundEndsAt));
        } else {
          setSpinCountdown(gameRes.roundSecondsRemaining);
        }
      }

      if (typeof gameRes?.isRoundSpinning === "boolean") {
        setIsSpinning(gameRes.isRoundSpinning);
      }

      const pendingBets = aggregatePendingBets(gameRes?.game?.bets || []);
      setTicketedBets((prev) => {
        const acceptedVeryRecently =
          Date.now() - lastTicketAcceptAtRef.current < 5000;
        if (
          pendingBets.length === 0 &&
          prev.length > 0 &&
          acceptedVeryRecently
        ) {
          return prev;
        }
        return pendingBets;
      });

      const parsedHistory: SpinResult[] = (historyRes?.spins || []).map(
        (spin) => ({
          id: typeof spin.id === "number" ? spin.id : undefined,
          number: spin.winningNumber,
          color: spin.winningColor,
          timestamp: new Date(spin.createdAt),
        }),
      );

      setHistory(parsedHistory);
      setLastResult(parsedHistory[0] || null);
      setLastSpinId(parsedHistory[0]?.id ?? null);
    } catch (error) {
      console.error("Failed to load game data:", error);
      throw error;
    }
  }, [syncActiveGame]);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      await loadGameData();
    } catch (error) {
      console.error("Failed to initialize Spin Win:", error);
      setActionError(`Failed to load game: ${extractApiErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadGameData]);

  useEffect(() => {
    // Initialize API
    apiRef.current.setHeadersBuilder(buildHeaders);
    apiRef.current.setToken(localStorage.getItem("token") || "");
    apiRef.current.setUserContext({
      userId: profile?.id || null,
      username: profile?.username || profile?.name || "Player",
    });

    initialize();
  }, [initialize, buildHeaders, profile?.id, profile?.username, profile?.name]);

  useEffect(() => {
    const api = apiRef.current;
    let socket = null;

    try {
      socket = api.connectSocket();
      if (!socket) {
        return;
      }
    } catch (error) {
      console.error("Failed to connect socket:", error);
      return;
    }

    // game-updated is broadcast when any player places a bet.
    // We don't need a full server reload here — our own bets are already
    // reflected locally, and round-started/spin-result handle the rest.
    const handleGameUpdated = () => {
      // intentionally lightweight — no server call
    };

    const applyRoundStarted = async (data: SocketRoundStarted) => {
      if (!data?.gameId) return;

      if (
        spinningRoundGameIdRef.current &&
        data.gameId !== spinningRoundGameIdRef.current
      ) {
        pendingNextRoundGameIdRef.current = data.gameId;
      } else {
        syncActiveGame(data.gameId);
      }

      if (typeof data?.roundEndsAt === "number") {
        setRoundEndsAt(data.roundEndsAt);
        latestRoundEndsAtRef.current = data.roundEndsAt;
      }

      if (typeof data?.secondsRemaining === "number") {
        if (typeof data?.roundEndsAt === "number") {
          setSpinCountdown(getSecondsFromRoundEnd(data.roundEndsAt));
        } else {
          setSpinCountdown(data.secondsRemaining);
        }
      } else if (typeof data?.roundEndsAt === "number") {
        setSpinCountdown(getSecondsFromRoundEnd(data.roundEndsAt));
      }

      setIsSpinning(false);

      try {
        await loadGameData();
      } catch (error) {
        console.error("Failed to sync new round:", error);
      }
    };

    const handleSpinResult = (data: SocketSpinResult) => {
      if (!data?.winningNumber && data?.winningNumber !== 0) return;

      const currentGameId = currentGameIdRef.current;
      const spinningGameId = spinningRoundGameIdRef.current;

      if (
        data?.gameId &&
        data.gameId !== currentGameId &&
        data.gameId !== spinningGameId
      ) {
        return;
      }

      if (data?.gameId) {
        spinningRoundGameIdRef.current = data.gameId;
      }

      const winningNumber = Number(data.winningNumber);
      const winningColor = getNumberColor(winningNumber);
      const winningIndex = WHEEL_NUMBERS.indexOf(winningNumber);
      if (winningIndex < 0) return;

      setStartRotation(lastRotationRef.current);

      const spins = 6 + Math.random() * 3;
      // Calculate where the winning number needs to land: at the top (0deg)
      const slotAngle = 360 / WHEEL_NUMBERS.length;
      const targetAngle = 360 - winningIndex * slotAngle;
      // Calculate how much to rotate from current position, always clockwise (positive)
      const currentAngleMod = ((lastRotationRef.current % 360) + 360) % 360;
      let delta = targetAngle - currentAngleMod;
      if (delta <= 0) delta += 360; // ensure always positive → always clockwise
      const newRotation =
        lastRotationRef.current + 360 * Math.floor(spins) + delta;
      lastRotationRef.current = newRotation;

      setIsSpinning(true);
      setSpinCountdown(0);
      setHighlightedWinningNumber(null);
      showingResultRef.current = true;

      // Play audio exactly when spinning starts
      playSpinAudio();

      setRotation(newRotation);

      // Show the result immediately after the spin animation
      window.setTimeout(async () => {
        const result: SpinResult = {
          number: winningNumber,
          color: winningColor,
          timestamp: new Date(),
        };

        setLastResult(result);
        setHistory((prev) => [result, ...prev].slice(0, 10));

        // Add winners to recent winners list
        if (data.winners && data.winners.length > 0) {
          const newWinners = data.winners.map((winner) => ({
            username: winner.username,
            amount: winner.amount,
            winningNumber: winner.winningNumber,
            timestamp: new Date(),
          }));
          setRecentWinners((prev) => [...newWinners, ...prev].slice(0, 10));
        }

        stopSpinAudio();
        setTicketedBets([]);
        setPendingSelections([]);
        setIsSpinning(false);
        spinningRoundGameIdRef.current = null;
        // Keep showingResultRef.current = true — will be cleared when display is done
        setHighlightedWinningNumber(winningNumber);

        // Show winners display if there are winners
        const hasWinners = data.winners && data.winners.length > 0;
        if (hasWinners) {
          setShowWinnersDisplay(true);
        }

        // Extend display time if there are winners
        const highlightDuration = WINNING_NUMBER_HIGHLIGHT_MS;
        const winnersDisplayDuration = hasWinners
          ? WINNING_NUMBER_HIGHLIGHT_MS + WINNER_DISPLAY_EXTENSION_MS
          : WINNING_NUMBER_HIGHLIGHT_MS;

        // Hide highlighted number after highlight duration
        window.setTimeout(() => {
          setHighlightedWinningNumber((current) =>
            current === winningNumber ? null : current,
          );
          // If no winners, end the result display phase now
          if (!hasWinners) {
            showingResultRef.current = false;
            // Apply any pending round start that arrived during display
            const deferredStart = pendingRoundStartRef.current;
            if (deferredStart) {
              pendingRoundStartRef.current = null;
              applyRoundStarted(deferredStart);
            }
          }
        }, highlightDuration);

        // Hide winners display after winners display duration (separate timeout)
        if (hasWinners) {
          window.setTimeout(() => {
            setShowWinnersDisplay(false);
            showingResultRef.current = false;
            // Apply any pending round start that arrived during display
            const deferredStart = pendingRoundStartRef.current;
            if (deferredStart) {
              pendingRoundStartRef.current = null;
              applyRoundStarted(deferredStart);
            }
          }, winnersDisplayDuration);
        }

        // Wheel stays at the winning position — no reset needed
        // The next spin will calculate its rotation relative to this position

        // Don't apply pending round start here — let the highlight/winners
        // timeouts handle it so the result stays visible long enough

        if (pendingNextRoundGameIdRef.current) {
          syncActiveGame(pendingNextRoundGameIdRef.current);
          pendingNextRoundGameIdRef.current = null;
        }

        refreshRef.current();
      }, SPIN_ANIMATION_MS);
    };

    const handleRoundTimer = (data: SocketRoundTimer) => {
      // Ignore timer updates while we're displaying the spin result/winners
      // — the next round's countdown must not hide the wheel prematurely
      if (showingResultRef.current) return;

      const currentGameId = currentGameIdRef.current;
      const spinningGameId = spinningRoundGameIdRef.current;

      if (
        data?.gameId &&
        data.gameId !== currentGameId &&
        data.gameId !== spinningGameId
      ) {
        return;
      }

      if (typeof data?.roundEndsAt === "number") {
        const currentRoundEndsAt = latestRoundEndsAtRef.current;
        if (
          typeof currentRoundEndsAt === "number" &&
          data.roundEndsAt < currentRoundEndsAt
        ) {
          return;
        }

        setRoundEndsAt(data.roundEndsAt);
        latestRoundEndsAtRef.current = data.roundEndsAt;
      }

      if (typeof data?.secondsRemaining === "number") {
        if (typeof data?.roundEndsAt === "number") {
          setSpinCountdown(getSecondsFromRoundEnd(data.roundEndsAt));
        } else {
          setSpinCountdown(data.secondsRemaining);
        }
      }

      if (typeof data?.isRoundSpinning === "boolean") {
        setIsSpinning(data.isRoundSpinning);
      }
    };

    const handleRoundStarted = async (data: SocketRoundStarted) => {
      if (!data?.gameId) return;

      // Defer if still spinning OR still displaying the result/winners
      if (isSpinningRef.current || showingResultRef.current) {
        pendingRoundStartRef.current = data;
        return;
      }

      await applyRoundStarted(data);
    };

    const handleRoundSpinning = (data: SocketRoundSpinning) => {
      if (data?.gameId && data.gameId !== currentGameIdRef.current) {
        return;
      }

      if (data?.gameId) {
        spinningRoundGameIdRef.current = data.gameId;
      }

      // Clear recent winners when new round starts spinning
      setRecentWinners([]);
      setPendingSelections([]);
      setShowWinnersDisplay(false); // Hide winners display when new round starts

      setIsSpinning(true);
      setSpinCountdown(0);
    };

    if (socket) {
      socket.on("game-updated", handleGameUpdated);
      socket.on("spin-result", handleSpinResult);
      socket.on("round-timer", handleRoundTimer);
      socket.on("round-started", handleRoundStarted);
      socket.on("round-spinning", handleRoundSpinning);
    }

    return () => {
      if (socket) {
        socket.off("game-updated", handleGameUpdated);
        socket.off("spin-result", handleSpinResult);
        socket.off("round-timer", handleRoundTimer);
        socket.off("round-started", handleRoundStarted);
        socket.off("round-spinning", handleRoundSpinning);
        api.leaveGame();
        api.disconnect();
      }
    };
  }, [loadGameData, syncActiveGame, playSpinAudio, stopSpinAudio]);

  useEffect(() => {
    return () => {
      stopSpinAudio();
    };
  }, [stopSpinAudio]);

  useEffect(() => {
    if (!roundEndsAt) {
      setSpinCountdown(null);
      return;
    }

    if (isSpinning) {
      setSpinCountdown(0);
      return;
    }

    const updateCountdown = () => {
      setSpinCountdown(getSecondsFromRoundEnd(roundEndsAt));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [roundEndsAt, isSpinning]);

  const placeBet = (type: string, value: string | number, odds: number) => {
    if (isSpinning) {
      setActionError(
        "Spin is running. Wait for result before placing a new bet.",
      );
      return;
    }

    if (typeof spinCountdown === "number" && spinCountdown <= 0) {
      setActionError(
        "Betting window is closed. Wait for the next round countdown.",
      );
      return;
    }

    if (!gameId) {
      setActionError("Game session is not ready. Tap Reload Game.");
      return;
    }

    if (selectedChip <= 0) {
      setActionError("Invalid chip amount selected.");
      return;
    }

    const selectedValue = String(value);
    setActionError(null);

    setPendingSelections((prev) => {
      const currentPendingStake = prev.reduce(
        (sum, bet) => sum + bet.amount,
        0,
      );

      if (type === "exact") {
        const existingExactIndex = prev.findIndex(
          (bet) => bet.type === "exact",
        );

        if (existingExactIndex >= 0) {
          const existingExact = prev[existingExactIndex];
          const selectedNumbers = String(existingExact.value)
            .split(",")
            .map((entry) => Number(entry.trim()))
            .filter(
              (entry) => Number.isInteger(entry) && entry >= 0 && entry <= 36,
            );

          const exactNumber = Number(selectedValue);
          if (
            !Number.isInteger(exactNumber) ||
            exactNumber < 0 ||
            exactNumber > 36
          ) {
            setActionError("Invalid exact number selected.");
            return prev;
          }

          if (selectedNumbers.includes(exactNumber)) {
            const nextSelectedNumbers = selectedNumbers.filter(
              (num) => num !== exactNumber,
            );
            if (nextSelectedNumbers.length === 0) {
              return prev.filter((bet) => bet.type !== "exact");
            }

            const updated = [...prev];
            updated[existingExactIndex] = {
              ...existingExact,
              value: nextSelectedNumbers.join(","),
              odds: 36 / nextSelectedNumbers.length,
            };
            return updated;
          }

          if (selectedNumbers.length >= 5) {
            setActionError("Maximum exact selections is 5 per ticket.");
            return prev;
          }

          const nextSelectedNumbers = [...selectedNumbers, exactNumber];
          const updated = [...prev];
          updated[existingExactIndex] = {
            ...existingExact,
            value: nextSelectedNumbers.join(","),
            odds: 36 / nextSelectedNumbers.length,
          };
          return updated;
        }

        if (currentPendingStake + selectedChip > balance) {
          setActionError(
            "Insufficient balance for selected chip. Choose a lower chip.",
          );
          return prev;
        }

        return [
          ...prev,
          {
            type: "exact",
            value: selectedValue,
            amount: selectedChip,
            odds: 36,
            status: "pending",
          },
        ];
      }

      const existingIndex = prev.findIndex(
        (bet) => bet.type === type && String(bet.value) === selectedValue,
      );
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex);
      }

      if (currentPendingStake + selectedChip > balance) {
        setActionError(
          "Insufficient balance for selected chip. Choose a lower chip.",
        );
        return prev;
      }

      return [
        ...prev,
        {
          type,
          value,
          amount: selectedChip,
          odds,
          status: "pending",
        },
      ];
    });
  };

  const acceptPendingBets = async () => {
    if (isSpinning || pendingSelections.length === 0 || !gameId) return;

    const totalPendingStake = pendingSelections.reduce(
      (sum, bet) => sum + bet.amount,
      0,
    );
    if (totalPendingStake > balance) {
      setActionError("Insufficient balance to accept all selected bets.");
      return;
    }

    setActionError(null);
    lastTicketAcceptAtRef.current = Date.now();

    // Optimistic UI update: move pending to ticketed immediately
    const snapshotPending = [...pendingSelections];
    setTicketedBets((prev) => [...prev, ...snapshotPending]);
    setPendingSelections([]);

    try {
      // Fire all bet requests in parallel instead of sequentially
      await Promise.all(
        snapshotPending.map((selection) =>
          apiRef.current.placeBet(
            selection.type,
            selection.value,
            selection.amount,
            selection.odds,
          ),
        ),
      );

      // Refresh server data in the background (non-blocking)
      loadGameData().catch((err) =>
        console.error("Background refresh failed:", err),
      );
      refresh();
    } catch (error) {
      console.error("Failed to accept pending bets:", error);
      setActionError(`Accept failed: ${extractApiErrorMessage(error)}`);
      // Refresh to get accurate state after partial failure
      loadGameData().catch((err) =>
        console.error("Recovery refresh failed:", err),
      );
      refresh();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#141415] text-white flex items-center justify-center">
        <div className="relative flex items-center justify-center w-48 h-48">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-38 h-38 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin-slow"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-30 h-30 border-3 border-blue-400/20 border-b-blue-400 rounded-full animate-spin-reverse"></div>
          </div>
          <div className="relative z-10 text-center px-8">
            <div className="text-3xl font-black tracking-wider animate-pulse-fast">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-blue-300">
                SPIN WIN
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-40 overflow-hidden overscroll-none flex flex-col bg-[#141415] pb-16`}
    >
      {/* Hidden audio element for spinning sound */}
      <audio
        ref={spinAudioRef}
        src={SPIN_AUDIO_SRC}
        preload="auto"
        style={{ display: "none" }}
      />
      <div className="w-full flex-1 flex flex-col pt-16 min-h-0 overflow-y-auto overflow-x-hidden pb-4">
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#141415] border-b-2 border-slate-800/60 px-2 py-1">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between h-12 sm:h-14">
              {/* Left: Balance and Deposit */}
              <div className="flex-1 flex flex-col items-start leading-tight">
                <div className="inline-flex flex-col w-[85px]">
                  <span
                    className="text-[14px] sm:text-xs font-semibold text-green-600 cursor-pointer whitespace-nowrap"
                    onClick={() => setShowBalance(!showBalance)}
                  >
                    {showBalance ? `${balance?.toFixed(2) || "0.00"}` : "****"}{" "}
                    ETB
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate("/deposit")}
                    className="flex items-center justify-center gap-1 rounded-md bg-green-700 py-0.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-300 transition hover:bg-green-500 w-full"
                  >
                    <Banknote size={13} />
                    Deposit
                  </button>
                </div>
              </div>

              {/* Center: Timer */}
              <div className="flex items-center justify-center shrink-0">
                <div className="relative w-10 h-10 sm:w-10 sm:h-10">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin-slow"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] sm:text-xs font-black font-mono text-red-400 animate-pulse">
                      {formatCountdown(spinCountdown)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Buttons */}
              <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2">
                <button
                  onClick={() => setShowHowItWorks(true)}
                  className="group relative px-2 sm:px-3 rounded-lg border border-slate-700/60 hover:bg-slate-800 transition-all duration-300 h-8 sm:h-9 flex items-center justify-center"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="text-[10px] font-medium text-amber-300 group-hover:text-white whitespace-nowrap">
                      How works
                    </span>
                  </span>
                </button>

                <button
                  onClick={initialize}
                  className="group relative rounded-lg border border-slate-700/60 hover:bg-slate-800 transition-all duration-300 h-8 sm:h-9 aspect-square flex items-center justify-center"
                  title="Refresh game"
                >
                  <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 group-hover:text-white transition-all duration-300 group-hover:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded-lg">
            {actionError}
            <button
              onClick={() => setActionError(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(340px,1fr)] gap-6 flex-1 px-1 sm:px-4">
          <div
            className={`space-y-6 flex flex-col w-full ${showWheel ? "m-auto" : ""}`}
          >
            {showWheel && (
              <div className=" p-6 ">
                <div className="relative w-full max-w-[620px] aspect-square mx-auto mb-2 overflow-hidden">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7c3f16,#2b1408_68%)] shadow-2xl border-4 border-[#3a1d0e] "></div>
                  {/* Top indicator arrow */}
                  <div
                    className="absolute left-1/2 top-0 z-40 px-1 py-0.5 rounded-b-lg bg-[#3a1d0e] border-b-2 border-amber-400/80 shadow-lg"
                    style={{ transform: "translate(-50%, -45%)" }}
                  >
                    <div className="relative">
                      {/* <div className="absolute -inset-2 bg-red-400 rounded-full blur-md animate-pulse"></div> */}
                      <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] relative"></div>
                    </div>
                  </div>
                  <div className="absolute inset-2 rounded-full border-2 border-[#d7b06a] bg-[radial-gradient(circle,#172033_52%,#090d14_100%)] "></div>

                  <motion.div
                    className="absolute inset-3 rounded-full drop-shadow-lg"
                    initial={false}
                    animate={{ rotate: rotation }}
                    transition={{
                      type: "tween",
                      duration: SPIN_ANIMATION_DURATION_S,
                      // Strong ease-out tail: wheel visibly slows near the ending slot.
                      ease: SPIN_EASE,
                    }}
                  >
                    {SECTOR_GROUPS.map((sector) => {
                      const angle =
                        ((sector.startWheelIndex - 0.5) * 360) /
                        WHEEL_NUMBERS.length;
                      return (
                        <div
                          key={`boundary-${sector.label}`}
                          className="absolute inset-0"
                          style={{ transform: `rotate(${angle}deg)` }}
                        >
                          <div className="absolute left-1/2 top-1.5 w-1 h-[43%] bg-amber-200/90 -translate-x-1/2 origin-top" />
                        </div>
                      );
                    })}

                    <div
                      className="absolute inset-0"
                      style={{
                        transform: `rotate(${((WHEEL_NUMBERS.length - 0.5) * 360) / WHEEL_NUMBERS.length}deg)`,
                      }}
                    >
                      <div className="absolute left-1/2 top-1.5 w-1 h-[43%] bg-amber-200/90 -translate-x-1/2 origin-top" />
                    </div>

                    {WHEEL_NUMBERS.map((num, index) => {
                      const color = getNumberColor(num);
                      const angle = (index * 360) / WHEEL_NUMBERS.length;

                      return (
                        <div
                          key={num}
                          className="absolute inset-0"
                          style={{ transform: `rotate(${angle}deg)` }}
                        >
                          <div
                            className={`absolute left-1/2 top-1.5 -translate-x-1/2 w-5 sm:w-6 h-10 sm:h-12 border border-yellow-700/70 shadow-lg flex items-start justify-center pt-1 transition-all duration-300 ${
                              color === "red"
                                ? "bg-red-600"
                                : color === "black"
                                  ? "bg-black"
                                  : "bg-green-500"
                            } ${highlightedWinningNumber === num ? "scale-[1.15] ring-2 ring-yellow-200 ring-offset-1 ring-offset-slate-900 animate-pulse z-30" : ""}`}
                            style={{
                              clipPath:
                                "polygon(0% 0%, 100% 0%, 78% 100%, 22% 100%)",
                            }}
                          >
                            <span
                              className="text-[12px] sm:text-[13px] font-bold text-white leading-none"
                              style={{ transform: `rotate(${-angle}deg)` }}
                            >
                              {num}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div
                      className="absolute inset-[18%] rounded-full border-2 border-amber-800/80 shadow-inner"
                      style={{ backgroundImage: sectorGradient }}
                    >
                      {SECTOR_GROUPS.map((sector) => {
                        const centerAngle =
                          ((sector.startWheelIndex + 2.5) * 360) /
                          WHEEL_NUMBERS.length;
                        const radian = (centerAngle * Math.PI) / 180;
                        const x = 50 + 37 * Math.cos(radian - Math.PI / 2);
                        const y = 50 + 37 * Math.sin(radian - Math.PI / 2);

                        return (
                          <div
                            key={sector.label}
                            className="absolute z-20"
                            style={{
                              left: `${x}%`,
                              top: `${y}%`,
                              transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                            }}
                          >
                            <span className="text-[24px] sm:text-[28px] font-black text-amber-950 drop-shadow-sm leading-none">
                              {sector.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`absolute inset-[33%] rounded-full bg-[radial-gradient(circle,#ffe17b_10%,#ebb726_60%,#d99c10_100%)] border-2 border-yellow-700/80 shadow-inner flex items-center justify-center ${!isSpinning && highlightedWinningNumber !== null ? "ring-4 ring-yellow-300/70 shadow-[0_0_20px_rgba(250,204,21,0.5)]" : ""}`}
                      style={{ transform: `rotate(${-rotation}deg)` }}
                    >
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-xl flex flex-col items-center justify-center border-2 border-yellow-200 transition-all duration-500 ${
                          !isSpinning && highlightedWinningNumber !== null
                            ? "bg-gradient-to-br from-yellow-400 to-amber-600 scale-110"
                            : "bg-gradient-to-br from-amber-700 to-yellow-500"
                        }`}
                      >
                        {isSpinning ||
                        (isSpinPhase && highlightedWinningNumber === null) ? (
                          <span className="text-2xl sm:text-3xl font-extrabold leading-none text-white animate-pulse">
                            ?
                          </span>
                        ) : lastResult ? (
                          <>
                            <span
                              className={`text-xl sm:text-2xl font-extrabold leading-none text-white ${
                                highlightedWinningNumber !== null
                                  ? "animate-bounce"
                                  : ""
                              }`}
                            >
                              {lastResult.number}
                            </span>
                            <span
                              className={`text-[8px] sm:text-[10px] font-bold uppercase leading-none mt-0.5 ${
                                lastResult.color === "red"
                                  ? "text-red-200"
                                  : lastResult.color === "black"
                                    ? "text-gray-200"
                                    : "text-green-200"
                              }`}
                            >
                              {lastResult.color}
                            </span>
                          </>
                        ) : (
                          <span className="text-2xl sm:text-3xl font-extrabold leading-none text-white">
                            ?
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Hide BettingBoard whenever the wheel is visible */}
            {!showWheel && (
              <BettingBoard
                placeBet={placeBet}
                currentBet={selectedChip}
                bets={pendingSelections}
              />
            )}
          </div>

          {/* Show winners panel only after spinning completes during extended display */}
          {showWinnersDisplay && (
            <div className=" rounded p-2 border border-slate-500">
              <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Some Winners
                </span>
                <span className="text-sm font-mono text-amber-300">
                  Spin #{lastSpinId ?? "--"}
                </span>
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentWinners.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">
                    No recent winners
                  </p>
                ) : (
                  recentWinners.map((winner, index) => (
                    <motion.div
                      key={`${winner.username}-${winner.timestamp.getTime()}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                          {winner.winningNumber}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {winner.username}
                          </p>
                          <p className="text-xs text-slate-400">
                            Won on {getNumberColor(winner.winningNumber)}{" "}
                            {winner.winningNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">
                          ${winner.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(winner.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-black">
          <div className="relative w-full border-t-2 border-emerald-900 bg-gray-950 text-white shadow-2xl">
            <div className="h-16 px-2 sm:px-3 flex items-center justify-between gap-2">
              <div className="h-12 px-1 rounded-md bg-sky-950/40 flex items-center border">
                <div className="text-left leading-tight">
                  <p className="text-base text-xs  rounded font-mono">
                    {pendingSelections.length} Pending
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={acceptPendingBets}
                  disabled={isSpinning || pendingSelections.length === 0}
                  className={
                    `h-11 sm:h-13 px-6 rounded-md bg-emerald-600 hover:bg-emerald-600 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2 transition-all duration-300 ` +
                    (pendingSelections.length > 0 && !isSpinning
                      ? " animate-pulse ring-2 ring-amber-400 ring-offset-2"
                      : "")
                  }
                  title="Accept selected bets"
                  aria-label="Accept selected bets"
                >
                  <span className="text-sm sm:text-base font-semibold border-gray-200 px-3 rounded">
                    Bet
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/games")}
                  className="h-11 sm:h-12 px-2 rounded-md bg-emerald-950/45 hover:bg-emerald-950/70 border border-emerald-800 text-slate-200 flex items-center justify-center gap-1 transition-colors"
                  title="Back to games"
                  aria-label="Back to games"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px] sm:text-xs font-medium">
                    Back
                  </span>
                </button>

                <div className="h-12 px-2 rounded-md bg-emerald-950/45 text-slate-100 flex items-center gap-1 border">
                  <button
                    type="button"
                    onClick={decreaseChip}
                    disabled={selectedChipIndex <= 0}
                    className="w-8 h-8 rounded bg-emerald-900/70 hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Decrease stake"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="min-w-10 text-center text-base sm:text-lg font-bold leading-none">
                    {selectedChip}
                  </span>

                  <button
                    type="button"
                    onClick={increaseChip}
                    disabled={selectedChipIndex >= chipValues.length - 1}
                    className="w-8 h-8 rounded bg-emerald-900/70 hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Increase stake"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="max-h-48 overflow-y-auto px-3 pb-3">
                {pendingSelections.length === 0 &&
                ticketedBets.length === 0 ? null : (
                  <div className="space-y-2">
                    {pendingSelections.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-emerald-200/90 mb-1">
                          Pending Bets
                        </p>
                        <div className="space-y-1">
                          {pendingSelections.map((bet, index) => (
                            <div
                              key={`pending-${index}`}
                              className="grid grid-cols-4 gap-2 text-xs border-b border-emerald-900 pb-1"
                            >
                              <span>{bet.amount.toFixed(2)}</span>
                              <span className="truncate">
                                {bet.type === "exact"
                                  ? `#${bet.value}`
                                  : bet.value}
                              </span>
                              <span>{bet.odds}</span>
                              <span>{(bet.amount * bet.odds).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {ticketedBets.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-emerald-200/90 mb-1">
                          Ticketed Bets
                        </p>
                        <div className="space-y-1">
                          {ticketedBets.map((bet, index) => (
                            <div
                              key={`ticketed-${index}`}
                              className="grid grid-cols-4 gap-2 text-xs border-b border-emerald-900 pb-1"
                            >
                              <span>{bet.amount.toFixed(2)}</span>
                              <span className="truncate">
                                {bet.type === "exact"
                                  ? `#${bet.value}`
                                  : bet.value}
                              </span>
                              <span>{bet.odds}</span>
                              <span>{(bet.amount * bet.odds).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {pendingSelections.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-100 flex justify-between">
                    <span>Pending Return</span>
                    <span className="font-bold">
                      ETB{pendingPotentialReturn.toFixed(2)}
                    </span>
                  </div>
                )}
                {ticketedBets.length > 0 && (
                  <div className="mt-1 text-xs text-emerald-100/90 flex justify-between">
                    <span>Ticketed Return</span>
                    <span className="font-bold">
                      ETB{ticketedPotentialReturn.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showHowItWorks && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowHowItWorks(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold mb-4">How it works</h3>
                <PayoutTable />
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SpinWinGame;
