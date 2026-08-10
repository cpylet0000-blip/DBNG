'use client';

import axios from "axios";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Eye, EyeOff, Lock, LogIn } from "lucide-react";

// Recommended global axios config
axios.defaults.withCredentials = true;
// You can also set a base URL if all your requests share the same prefix
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      interface LoginResponse {
        token: string;
        [key: string]: unknown;
      }

      const res = await axios.post<LoginResponse>(
        `${BACKEND_URL}/login_admin`,
        {
          email,
          password,
          rememberMe,
        },
        { withCredentials: true }
      );

      const token = res.data?.token;
      if (token) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("admin_token", token);
        }
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      router.push("/dashboard");

    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError(err.response.data?.message || "Invalid credentials");
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError("Login failed");
        }
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen border-slate-900 border-2 flex items-center justify-center bg-linear-to-br from-blue-200 via-gray-400 to-gray-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating linear orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-linear-to-r from-amber-400/20 to-orange-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-linear-to-r from-emerald-400/20 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-linear-to-r from-violet-400/15 to-purple-400/10 rounded-full blur-3xl animate-pulse delay-500" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-linear(rgba(0,0,0,0.02)_1px,transparent_1px),linear-linear(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-size-[40px_40px] opacity-20" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-6">
        <form
          onSubmit={handleLogin}
          className="bg-white/90  backdrop-blur-xl border border-rose-200/50 rounded-xl p-8 shadow-2xl shadow-gray-200/30"
        >
          {/* Header */}
         

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Email Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 text-slate-900 py-3 border  border-gray-300 rounded-xl bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all duration-200"
                placeholder="Enter your email"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 text-slate-900 py-3 border border-gray-300 rounded-xl bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all duration-200"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="mb-8">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
              </div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                Keep me signed in
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-black to-gray-800 text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}