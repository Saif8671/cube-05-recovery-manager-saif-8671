"use client";
import React, { useState } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  Check,
  RefreshCw,
  Menu,
} from "lucide-react";
import { api } from "../lib/api";

export default function Navbar({ onRefresh }) {
  const { currentCompany } = useWorkspace() || {};
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  const handleBatchAnalyze = async () => {
    try {
      setRunningBatch(true);
      setBatchResult(null);
      const companyId = currentCompany || "org_demo_alpha";
      const res = await api.batchInvestigate(companyId);
      setBatchResult(res);
      if (onRefresh) onRefresh();
      setTimeout(() => setBatchResult(null), 8000);
    } catch (err) {
      console.error("Batch investigation failed:", err);
      alert(`Recovery Agent run failed: ${err.message}`);
    } finally {
      setRunningBatch(false);
    }
  };

  const handleMobileMenuToggle = () => {
    window.dispatchEvent(new CustomEvent("rcy-toggle-mobile-sidebar"));
  };

  return (
    <header className="h-16 w-full bg-white border-b border-gray-200 sticky top-0 z-20 shrink-0 select-none">
      <div className="w-full h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left Side: Mobile Menu Button */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Navigation Drawer Toggle */}
          <button
            onClick={handleMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right Side: Primary Action */}
        <div className="flex items-center space-x-2 sm:space-x-3.5">
          {/* Run Recovery Agent Button */}
          <button
            onClick={handleBatchAnalyze}
            disabled={runningBatch}
            className="btn-primary h-9 px-3.5 sm:px-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF9900] disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 text-gray-950 ${
                runningBatch ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"
              }`}
            />
            <span className="hidden sm:inline">
              {runningBatch ? "Evaluating Evidence..." : "Run Recovery Agent"}
            </span>
            <span className="sm:hidden">
              {runningBatch ? "Evaluating..." : "Run Agent"}
            </span>
          </button>
        </div>
      </div>

      {/* Batch run result notification toast */}
      {batchResult && (
        <div className="absolute top-16 right-4 sm:right-8 mt-2 p-4 bg-white border border-gray-200 rounded-xl shadow-modal text-xs text-gray-900 z-50 flex items-center space-x-3 animate-fade-in-down max-w-md sm:max-w-lg">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600">
            <Check className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900">Recovery Agent Evaluation Complete</div>
            <div className="text-[11px] text-gray-600 font-mono mt-0.5 leading-relaxed">
              {batchResult.processed} evaluated &bull;{" "}
              <span className="text-emerald-700 font-bold">{batchResult.contradicted} Recoverable</span> &bull;{" "}
              {batchResult.silent} Silent &bull; {batchResult.uncertain} Uncertain &bull;{" "}
              {batchResult.supported} Supported
            </div>
          </div>
          <button
            onClick={() => setBatchResult(null)}
            className="text-gray-400 hover:text-gray-700 text-lg ml-2 shrink-0 p-1"
            aria-label="Dismiss alert"
          >
            &times;
          </button>
        </div>
      )}
    </header>
  );
}
