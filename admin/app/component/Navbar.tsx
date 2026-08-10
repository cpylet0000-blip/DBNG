"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  Coins,
  Menu,
  Power,
  LayoutDashboard,
  HistoryIcon,
  Banknote,
  Flag,
  Gamepad2,
  Gift,
  User2,
  Settings,
  ArrowDownCircle,
  Trophy,
} from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("/dashboard");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Close menu when clicking/touching outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_URL + "/admin/logout_admin",
        {},
        { withCredentials: true },
      );
    } catch {}

    // Clear localStorage token
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("admin_token");
    }

    // Clear axios default header
    delete axios.defaults.headers.common["Authorization"];

    router.push("/");
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/adminrequestspanel", label: "Requests", icon: Banknote },
    { href: "/transaction_history", label: "Transactions", icon: HistoryIcon },
    { href: "/transfers", label: "Transfers", icon: ArrowDownCircle },
    { href: "/flagsfeature", label: "Flags", icon: Flag },
    { href: "/rewardPlayers", label: "Reward Players", icon: Gift },
    { href: "/spinwin", label: "SpinWin", icon: Coins },

    { href: "/users", label: "Users", icon: User2 },
    { href: "/usersgamesbeforewin", label: "Games Before Win", icon: Gamepad2 },
    { href: "/gameroom", label: "Game Room", icon: Gamepad2 },
    { href: "/bonus", label: "Bonus", icon: Gift },
    { href: "/settings/demo-bot", label: "Demo Bot", icon: Gamepad2 },
    { href: "/settings", label: "Settings", icon: Settings },
    //{ href: "/earnings", label: "earnings", icon: Gift },
    //{ href: "/post-lottery", label: "Lottery", icon: Award },
    // { href: "/get-bot", label: "Bot", icon: BotMessageSquare },
  ];

  return (
    <nav className="w-full bg-white border-b border-gray-100 fixed top-0 left-0 z-50 shadow-sm">
      <div className="px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="flex items-center group"
              onClick={() => setActiveItem("/dashboard")}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-indigo-600 rounded-lg blur opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
                <span className="text-xl font-bold tracking-tight relative bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Dawit Games
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - COMPACT and PROFESSIONAL */}
          <div className="hidden lg:flex items-center space-x-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setActiveItem(item.href)}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
                    transition-all duration-200 ease-out
                    ${
                      isActive
                        ? "text-gray-900 bg-linear-to-r from-gray-50 to-gray-100/50 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/50"
                    }
                  `}
                >
                  <Icon
                    size={16}
                    className={`
                      transition-colors duration-200
                      ${isActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700"}
                    `}
                  />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop Logout */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-all duration-200 group"
              aria-label="Logout"
            >
              <Power
                size={16}
                className="text-gray-500 group-hover:text-gray-700 transition-colors"
              />
              <span>Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 lg:hidden transition-all duration-200"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <Menu size={20} className="text-gray-700" />
            </button>

            {/* Mobile Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 lg:hidden transition-all duration-200"
              aria-label="Logout"
            >
              <Power size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu - COMPACT and ELEGANT */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed inset-x-0 top-16 bg-white border-t border-gray-100 shadow-lg lg:hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="px-2 py-3 space-y-1 max-h-[calc(100vh-5rem)] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setActiveItem(item.href);
                    setMenuOpen(false);
                  }}
                  className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg mx-2
                    transition-all duration-150
                    ${
                      isActive
                        ? "text-gray-900 bg-linear-to-r from-gray-50 to-gray-100/50"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50/50"
                    }
                  `}
                >
                  <div
                    className={`
                    p-1.5 rounded-md transition-colors duration-200
                    ${
                      isActive
                        ? "bg-linear-to-br from-blue-50 to-indigo-50 text-blue-600"
                        : "bg-gray-50 text-gray-500 group-hover:text-gray-700"
                    }
                  `}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-linear-to-r from-blue-500 to-indigo-500" />
                  )}
                </Link>
              );
            })}

            {/* Mobile Logout Item */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50/50 rounded-lg mx-2 w-full transition-all duration-150"
            >
              <div className="p-1.5 rounded-md bg-gray-50 text-gray-500">
                <Power size={18} />
              </div>
              <span className="flex-1 text-left">Logout</span>
            </button>
          </div>

          {/* Subtle bottom linear */}
          <div className="h-1 bg-linear-to-r from-transparent via-blue-100/50 to-transparent" />
        </div>
      )}
    </nav>
  );
}
