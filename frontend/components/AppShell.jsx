"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  // When visiting the landing page (/), render full-width without the dashboard sidebar
  if (isLanding) {
    return (
      <div className="min-h-screen w-full bg-white text-gray-900 overflow-x-hidden">
        {children}
      </div>
    );
  }

  // When visiting dashboard or internal routes, render the fixed sidebar + main area shell
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900">
      {/* 1. FIXED SIDEBAR: Fixed to LEFT, full viewport height, non-scrolling, w-64 */}
      <Sidebar />

      {/* 2. MAIN AREA: Begins exactly at sidebar right edge, width = viewport - sidebar */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden bg-[#F7F8FA]">
        {children}
      </div>
    </div>
  );
}
