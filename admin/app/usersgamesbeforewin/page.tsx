"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";

interface UserGameBeforeWin {
  id: string;
  username: string;
  name: string;
  telegramId: string;
  gamesBeforeFirstWin: number;
}

export default function UsersGamesBeforeWinPage() {
  const [users, setUsers] = useState<UserGameBeforeWin[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    axios
      .get(backendUrl + "/admin/usersGamesBeforeWin", {
        withCredentials: true,
      })
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((user) => {
    if (!filter) return true;
    return user.gamesBeforeFirstWin === Number(filter);
  });

  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <Navbar />

      <main className="flex-1 mt-16 max-w-6xl mx-auto w-full px-4 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">
              Games before first win
            </label>
            <input
              type="number"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. 3"
              className="w-28 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              Loading users...
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">
                    User ID
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">
                    Telegram
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">
                    GBFW
                  </th>
                </tr>
              </thead>

              <tbody>
                {pagedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-10 text-gray-400"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`border-b last:border-0 hover:bg-gray-50 transition`}
                    >
                      <td className="px-4 py-3 text-gray-600">
                        {user.id}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-blue-600">
                        {user.telegramId}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {user.gamesBeforeFirstWin}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-8">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Previous
            </button>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}