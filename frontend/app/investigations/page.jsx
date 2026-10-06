"use client";
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  Search,
  X,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  Filter,
  DollarSign,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
  ChevronRight,
  Eye,
} from "lucide-react";
import { TableSkeletonRows } from "../../components/LoadingSkeleton";

export default function InvestigationsQueuePage() {
  const { currentCompany } = useWorkspace();
  const [charges, setCharges] = useState([]);
  const [search, setSearch] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCharges = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCharges(currentCompany);
      setCharges(data || []);
    } catch (err) {
      console.error("Failed to load investigation queue:", err);
      setError(err.message || "Failed to load investigations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharges();
  }, [currentCompany]);

  // Derived KPI metrics
  const metrics = useMemo(() => {
    const total = charges.length;
    const contradicted = charges.filter((c) => c.assessment === "CONTRADICTED");
    const silent = charges.filter((c) => c.assessment === "SILENT");
    const uncertain = charges.filter((c) => c.assessment === "UNCERTAIN");
    const supported = charges.filter((c) => c.assessment === "SUPPORTED");

    const totalPotentialRecovery = contradicted.reduce(
      (sum, c) => sum + (c.claim_amount || c.amount || 0),
      0
    );

    return {
      total,
      contradictedCount: contradicted.length,
      silentCount: silent.length,
      uncertainCount: uncertain.length,
      supportedCount: supported.length,
      totalPotentialRecovery,
    };
  }, [charges]);

  // Filtered charges list
  const filteredCharges = useMemo(() => {
    return charges.filter((c) => {
      // Assessment filter
      if (assessmentFilter !== "ALL" && c.assessment !== assessmentFilter) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesId = c.charge_id?.toLowerCase().includes(q);
        const matchesUnit = c.unit_id?.toLowerCase().includes(q);
        const matchesShipment = c.shipment_id?.toLowerCase().includes(q);
        const matchesSku = c.sku?.toLowerCase().includes(q);
        const matchesReason = c.reason?.toLowerCase().includes(q);
        if (!matchesId && !matchesUnit && !matchesShipment && !matchesSku && !matchesReason) {
          return false;
        }
      }
      return true;
    });
  }, [charges, assessmentFilter, search]);

  const getBadgeConfig = (assessment) => {
    switch (assessment) {
      case "CONTRADICTED":
        return {
          pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "SUPPORTED":
        return {
          pill: "bg-rose-50 text-rose-800 border-rose-200",
          dot: "bg-rose-500",
        };
      case "SILENT":
        return {
          pill: "bg-gray-100 text-gray-700 border-gray-200",
          dot: "bg-gray-400",
        };
      case "UNCERTAIN":
        return {
          pill: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
        };
      default:
        return {
          pill: "bg-gray-100 text-gray-600 border-gray-200",
          dot: "bg-gray-300",
        };
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setAssessmentFilter("ALL");
  };

  const hasActiveFilters = assessmentFilter !== "ALL" || Boolean(search.trim());

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={loadCharges} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full page-enter">
        {/* ============================================================ */}
        {/* 1. COMPACT PAGE HEADER                                       */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-sans">
                Forensic Investigation Queue
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Automated multi-hop evidence evaluation queue. Review charge deductions contradicted by warehouse operational records.
            </p>
          </div>

          <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-lg shadow-subtle flex items-center space-x-2 self-start sm:self-auto font-mono">
            {loading ? (
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
            ) : (
              <span>
                Queue Records: <strong className="font-bold text-gray-900">{filteredCharges.length}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. COMPACT SUMMARY KPI STRIP                                 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Queue */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Evaluated Charges
              </span>
              <Receipt className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : metrics.total}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Total assessed fee items</div>
          </div>

          {/* Card 2: Contradicted (Defensible) */}
          <div className="bg-white border-2 border-[#FF9900] rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#E88A00] uppercase tracking-wide">
                Contradicted
              </span>
              <TrendingUp className="w-4 h-4 text-[#FF9900]" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-extrabold font-sans tabular-nums text-gray-900">
              {loading ? "--" : metrics.contradictedCount}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Defensible claims supported</div>
          </div>

          {/* Card 3: Potential Recovery */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Potential Recovery
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-emerald-700">
              {loading
                ? "--"
                : `$${metrics.totalPotentialRecovery.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">From contradicted deductions</div>
          </div>

          {/* Card 4: Silent / Incomplete */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Silent / No Proof
              </span>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-700">
              {loading ? "--" : metrics.silentCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Conservative auto-withheld</div>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadCharges}
              className="px-3 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. FILTERS & SEARCH TOOLBAR                                  */}
        {/* ============================================================ */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-subtle">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Charge ID, Unit ID, SKU, or Reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 h-10 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900] transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Assessment Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "CONTRADICTED", "SILENT", "UNCERTAIN", "SUPPORTED"].map((f) => (
              <button
                key={f}
                onClick={() => setAssessmentFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  assessmentFilter === f
                    ? "bg-[#FF9900] text-white shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white border border-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-gray-500 font-medium">Active Filters:</span>
            {assessmentFilter !== "ALL" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 shadow-xs">
                <span>Assessment: {assessmentFilter}</span>
                <button
                  onClick={() => setAssessmentFilter("ALL")}
                  className="hover:text-gray-900 ml-1"
                >
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </span>
            )}
            {search.trim() && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 shadow-xs">
                <span>Query: "{search}"</span>
                <button
                  onClick={() => setSearch("")}
                  className="hover:text-gray-900 ml-1"
                >
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#E88A00] hover:text-[#C87600] font-semibold underline underline-offset-2 ml-1"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. QUEUE TABLE                                               */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="py-3 px-4">Charge ID</th>
                  <th className="py-3 px-4">Deduction Reason</th>
                  <th className="py-3 px-4">Unit / Physical Tracking</th>
                  <th className="py-3 px-4 text-right">Fee Documented</th>
                  <th className="py-3 px-4">Forensic Assessment</th>
                  <th className="py-3 px-4">Claim Potential</th>
                  <th className="py-3 px-4">Posted Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {loading ? (
                  <TableSkeletonRows rows={6} cols={8} />
                ) : filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-500">
                      <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto text-gray-400 mb-2">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">No charges match the current filter</p>
                      <p className="text-xs text-gray-400 mt-1">Try resetting your search query or assessment filter.</p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-3 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-subtle transition"
                        >
                          Reset filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((c) => {
                    const badge = getBadgeConfig(c.assessment);
                    const isContradicted = c.assessment === "CONTRADICTED";

                    return (
                      <tr
                        key={c.charge_id}
                        className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                      >
                        {/* Charge ID */}
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">
                          <Link
                            href={`/investigations/${c.charge_id}`}
                            className="hover:text-[#E88A00] transition-colors flex items-center space-x-1"
                          >
                            <span>{c.charge_id}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#FF9900] transition-opacity" />
                          </Link>
                        </td>

                        {/* Deduction Reason */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 capitalize">
                            {c.reason ? c.reason.replace(/_/g, " ") : "Unknown"}
                          </div>
                          {c.sku && (
                            <div className="text-[10px] text-gray-400 font-mono">
                              SKU: {c.sku}
                            </div>
                          )}
                        </td>

                        {/* Unit / Tracking */}
                        <td className="py-3 px-4 font-mono text-gray-700">
                          {c.unit_id ? (
                            <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                              {c.unit_id}
                            </span>
                          ) : c.shipment_id ? (
                            <span className="text-gray-500">{c.shipment_id}</span>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>

                        {/* Fee Documented */}
                        <td className="py-3 px-4 text-right font-sans font-bold text-gray-900 tabular-nums">
                          ${(c.amount || 0).toFixed(2)}
                        </td>

                        {/* Assessment */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{c.assessment || "UNASSESSED"}</span>
                          </span>
                        </td>

                        {/* Claim Potential */}
                        <td className="py-3 px-4">
                          {isContradicted && c.claim_supported ? (
                            <span className="font-sans font-bold text-emerald-700 tabular-nums">
                              ${(c.claim_amount || c.amount || 0).toFixed(2)} USD
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Withheld ($0.00)</span>
                          )}
                        </td>

                        {/* Posted Date */}
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {c.charge_date || "N/A"}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            href={`/investigations/${c.charge_id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-gray-200 hover:border-[#FF9900] hover:text-[#E88A00] text-gray-700 rounded-lg text-xs font-semibold shadow-subtle transition"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#FF9900]" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
