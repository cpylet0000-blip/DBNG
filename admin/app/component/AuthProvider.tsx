'use client';

import { useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export function AuthProvider() {
  useEffect(() => {
    // Initialize auth on app load
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("admin_token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      // Set withCredentials for all requests
      axios.defaults.withCredentials = true;
    }
  }, []);

  return null; // This component doesn't render anything
}
