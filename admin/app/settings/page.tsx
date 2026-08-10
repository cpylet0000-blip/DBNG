"use client";

import React, { useState } from "react";
import axios from "axios";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import {
  Mail,
  Lock,
  Key,
  ArrowLeft,
  Shield,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";

type BotConfig = {
  minCardId?: number;
  maxCardId?: number;
  simulatedPlayers?: number | "";
  minCards?: number | "";
  maxCards?: number | "";
  botDefaultStake?: number;
  enabled?: boolean;
  demoWinnerNames?: string[] | string;
};

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "verify">("details");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const initialEmail = process.env.NEXT_PUBLIC_USER_EMAIL || "";
  const [userEmail] = useState(initialEmail);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [botLoading, setBotLoading] = useState(false);

  // Mask email for display (e.g. j***e@gmail.com)
  function maskEmail(email: string) {
    if (!email) return "";
    const [user, domain] = email.split("@");
    if (user.length <= 2) return user[0] + "*@" + domain;
    const half = Math.ceil(user.length / 2);
    return (
      user.substring(0, half) + "*".repeat(user.length - half) + "@" + domain
    );
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!userEmail) {
      setError("Email not configured.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${backendUrl}/password-reset/request`, {
        email: userEmail,
      });
      setStep("verify");
    } catch {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${backendUrl}/password-reset/reset`, {
        email: userEmail,
        newPassword,
        otp,
        currentPassword,
      });
      setMessage("Your password has been changed successfully.");
      setOtp("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("details");
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response &&
        err.response.data &&
        err.response.data.error
      ) {
        setError(err.response.data.error);
      } else {
        setError("Verification failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${backendUrl}/admin/bots/config`, {
          withCredentials: true,
        });
        if (res.data && res.data.config) setBotConfig(res.data.config);
      } catch {
        // ignore
      }
    }
    load();
  }, [backendUrl]);

  const handleUpdateBotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botConfig) return;
    setBotLoading(true);
    try {
      const res = await axios.patch(
        `${backendUrl}/admin/bots/config`,
        botConfig,
        { withCredentials: true },
      );
      if (res.data && res.data.config) setBotConfig(res.data.config);
    } catch {
      // ignore for now
    } finally {
      setBotLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-neutral-50 to-white pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 border border-blue-100 mb-4">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
              Account Security
            </h1>
            <p className="text-sm text-neutral-500">
              Update your password securely
            </p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
            {error && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-600 text-xs font-medium">!</span>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-6">
              <h2 className="text-lg font-medium mb-3">Demo Bot Settings</h2>
              <form
                onSubmit={handleUpdateBotConfig}
                className="space-y-3 bg-neutral-50 p-4 rounded-md border border-neutral-200"
              >
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs">Min Card ID</label>
                  <input
                    type="number"
                    value={botConfig?.minCardId ?? ""}
                    onChange={(e) =>
                      setBotConfig({
                        ...botConfig,
                        minCardId: Number(e.target.value),
                      })
                    }
                    className="p-2 border rounded"
                  />
                  <label className="text-xs">Max Card ID</label>
                  <input
                    type="number"
                    value={botConfig?.maxCardId ?? ""}
                    onChange={(e) =>
                      setBotConfig({
                        ...botConfig,
                        maxCardId: Number(e.target.value),
                      })
                    }
                    className="p-2 border rounded"
                  />
                  <label className="text-xs">Active Bot Accounts</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={botConfig?.simulatedPlayers ?? ""}
                    onChange={(e) =>
                      setBotConfig({
                        ...botConfig,
                        simulatedPlayers:
                          e.target.value === ""
                            ? ""
                            : Math.max(1, Math.min(10, Number(e.target.value))),
                      })
                    }
                    className="p-2 border rounded"
                  />
                  <label className="text-xs">Min Cards</label>
                  <input
                    type="number"
                    value={botConfig?.minCards ?? ""}
                    min={2}
                    max={6}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = raw === "" ? "" : Number(raw);
                      const clamped =
                        typeof num === "number" && !Number.isNaN(num)
                          ? Math.max(2, Math.min(6, num))
                          : "";
                      setBotConfig({ ...botConfig, minCards: clamped });
                    }}
                    className="p-2 border rounded"
                  />
                  <label className="text-xs">Max Cards</label>
                  <input
                    type="number"
                    value={botConfig?.maxCards ?? ""}
                    min={2}
                    max={6}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = raw === "" ? "" : Number(raw);
                      const clamped =
                        typeof num === "number" && !Number.isNaN(num)
                          ? Math.max(2, Math.min(6, num))
                          : "";
                      setBotConfig({ ...botConfig, maxCards: clamped });
                    }}
                    className="p-2 border rounded"
                  />
                  <label className="text-xs">Default Stake</label>
                  <input
                    type="number"
                    value={botConfig?.botDefaultStake ?? ""}
                    onChange={(e) =>
                      setBotConfig({
                        ...botConfig,
                        botDefaultStake: Number(e.target.value),
                      })
                    }
                    className="p-2 border rounded"
                  />
                  <label className="text-xs">Demo Enabled</label>
                  <div className="flex items-center gap-3">
                    <input
                      id="demoEnabled"
                      type="checkbox"
                      checked={!!botConfig?.enabled}
                      onChange={(e) =>
                        setBotConfig({
                          ...botConfig,
                          enabled: e.target.checked,
                        })
                      }
                    />
                    <label htmlFor="demoEnabled" className="text-xs">
                      Enabled
                    </label>
                  </div>
                  <label className="text-xs">Demo Winner Names</label>
                  <textarea
                    value={
                      Array.isArray(botConfig?.demoWinnerNames)
                        ? botConfig.demoWinnerNames.join(", ")
                        : botConfig?.demoWinnerNames || ""
                    }
                    onChange={(e) =>
                      setBotConfig({
                        ...botConfig,
                        demoWinnerNames: e.target.value,
                      })
                    }
                    className="p-2 border rounded col-span-2"
                    rows={3}
                  />
                </div>
                <div className="pt-3 flex gap-3">
                  <button
                    disabled={botLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    {botLoading ? "Saving..." : "Save Bot Settings"}
                  </button>
                  <button
                    type="button"
                    disabled={botLoading}
                    onClick={async () => {
                      if (!botConfig) return;
                      setBotLoading(true);
                      try {
                        const res = await axios.patch(
                          `${backendUrl}/admin/bots/config`,
                          { ...botConfig, enabled: !botConfig.enabled },
                          { withCredentials: true },
                        );
                        if (res.data && res.data.config)
                          setBotConfig(res.data.config);
                      } catch {
                        // ignore
                      } finally {
                        setBotLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 text-neutral-800 rounded"
                  >
                    {botConfig?.enabled ? "Disable Demo" : "Enable Demo"}
                  </button>
                </div>
              </form>
            </div>

            {message && (
              <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700">{message}</p>
              </div>
            )}

            {step === "details" ? (
              <>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        Verification Required
                      </p>
                      <p className="text-xs text-blue-600">
                        A code will be sent to{" "}
                        <span className="font-medium">
                          {maskEmail(userEmail)}
                        </span>{" "}
                        to verify your identity.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label
                      className="block text-sm font-medium text-neutral-800"
                      htmlFor="currentPassword"
                    >
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-3.5 top-3 text-neutral-400"
                      />
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        className="w-full pl-11 pr-10 py-3 text-sm rounded-lg border border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-2.5 text-neutral-400 hover:text-blue-500"
                        tabIndex={-1}
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        aria-label={
                          showCurrentPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="block text-sm font-medium text-neutral-800"
                      htmlFor="newPassword"
                    >
                      New Password
                    </label>
                    <div className="relative">
                      <Key
                        size={18}
                        className="absolute left-3.5 top-3 text-neutral-400"
                      />
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        className="w-full pl-11 pr-10 py-3 text-sm rounded-lg border border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-2.5 text-neutral-400 hover:text-blue-500"
                        tabIndex={-1}
                        onClick={() => setShowNewPassword((v) => !v)}
                        aria-label={
                          showNewPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1.5">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="block text-sm font-medium text-neutral-800"
                      htmlFor="confirmPassword"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Key
                        size={18}
                        className="absolute left-3.5 top-3 text-neutral-400"
                      />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        className="w-full pl-11 pr-10 py-3 text-sm rounded-lg border border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-2.5 text-neutral-400 hover:text-blue-500"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 bg-linear-to-r from-blue-600 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending Code...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        Check Your Email
                      </p>
                      <p className="text-xs text-blue-600">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-medium">
                          {maskEmail(userEmail)}
                        </span>
                      </p>
                      <p className="text-xs text-blue-500 mt-1.5">
                        Expires in 10 minutes
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      className="block text-sm font-medium text-neutral-800 text-center"
                      htmlFor="otp"
                    >
                      Verification Code
                    </label>
                    <div className="flex justify-center">
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        className="w-56 px-5 py-4 text-xl font-semibold tracking-[0.5em] text-center rounded-xl border border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-neutral-50"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        required
                      />
                    </div>
                    <p className="text-center text-xs text-neutral-500">
                      6-digit code from your email
                    </p>
                  </div>

                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 bg-linear-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Verifying...
                        </>
                      ) : (
                        "Verify & Change Password"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="w-full py-2.5 px-4 text-sm font-medium text-neutral-600 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={16} />
                      Back to Password
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
