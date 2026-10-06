"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  FileCheck2,
  TrendingUp,
  FolderSync,
  Database,
  ChevronLeft,
  ChevronRight,
  Activity,
  X,
  Settings,
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Operations Center", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { name: "Charges Explorer", href: "/charges", icon: Receipt },
      { name: "Recovery Pipeline", href: "/recovery", icon: TrendingUp },
      { name: "Claims & Audit", href: "/claims", icon: FileCheck2 },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { name: "Evidence Records", href: "/evidence", icon: FolderSync },
    ],
  },
  {
    title: "DATA",
    items: [
      { name: "Data Ingestion", href: "/data-sources", icon: Database },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "System & Environment Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Listen for mobile sidebar toggle events from Navbar
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);

    window.addEventListener("rcy-toggle-mobile-sidebar", handleToggle);
    window.addEventListener("rcy-close-mobile-sidebar", handleClose);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("rcy-toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("rcy-close-mobile-sidebar", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isItemActive = (href) => {
    if (pathname === href) return true;
    if (href !== "/dashboard" && pathname?.startsWith(href)) return true;
    // Map investigation drilldown to Charges Explorer
    if (href === "/charges" && pathname?.startsWith("/investigations")) return true;
    return false;
  };

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col flex-1 justify-between min-h-0">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div
          className={`h-16 border-b border-gray-200 flex items-center shrink-0 ${
            !isMobile && collapsed ? "justify-center px-2" : "px-5 justify-between"
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-subtle shrink-0 p-1 overflow-hidden">
              <img
                src="/brand/recovery-manager-logo.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
              />
            </div>
            {(isMobile || !collapsed) && (
              <span className="font-bold text-gray-900 tracking-tight text-sm truncate">
                Recovery Manager
              </span>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="p-3 space-y-4 flex-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {(isMobile || !collapsed) && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!isMobile && collapsed ? item.name : undefined}
                    className={`relative flex items-center ${
                      !isMobile && collapsed ? "justify-center px-2" : "space-x-3 px-3"
                    } py-2 rounded-lg text-xs font-medium transition-colors group ${
                      active
                        ? "bg-orange-50/80 text-gray-900 font-semibold border border-orange-200/70"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    {/* Active Left Indicator Bar */}
                    {active && (isMobile || !collapsed) && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#FF9900] rounded-r-full" />
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        active ? "text-[#FF9900]" : "text-gray-500 group-hover:text-gray-800"
                      }`}
                    />
                    {(isMobile || !collapsed) && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="p-3 space-y-3 border-t border-gray-100 shrink-0">


        {/* Desktop Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200 text-xs"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center space-x-2">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px] font-medium">Collapse Sidebar</span>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP PERMANENT NAVIGATION RAIL (Visible on lg screens and wider) */}
      <aside
        className={`hidden lg:flex ${
          collapsed ? "w-[72px]" : "w-64"
        } h-screen bg-white border-r border-gray-200 flex-col justify-between shrink-0 select-none z-30 transition-all duration-200 ease-in-out`}
      >
        {renderNavContent(false)}
      </aside>

      {/* 2. MOBILE & TABLET RESPONSIVE DRAWER */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50 transform transition-transform duration-200 ease-in-out">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
