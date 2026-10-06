"use client";
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  Receipt,
  RotateCcw,
  DollarSign,
  TrendingUp,
  FileQuestion,
  ShieldCheck,
  X,
} from "lucide-react";
import { TableSkeletonRows } from "../../components/LoadingSkeleton";

export default function ChargesPage() {
  const { currentCompany } = useWorkspace();
  const [charges, setCharges] = useState([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadCharges = async () => {
    try {
      setLoading(true);
      const data = await api.getCharges(currentCompany, {
        search: submittedSearch || undefined,
        assessment: assessmentFilter !== "ALL" ? assessmentFilter : undefined,
      });
      setCharges(data || []);
    } catch (err) {
      console.error("Failed to load charges:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharges();
  }, [currentCompany, assessmentFilter, submittedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(search.trim());
  };

  const handleClearSearch = () => {
    setSearch("");
    setSubmittedSearch("");
  };

  const handleResetFilters = () => {
    setSearch("");
    setSubmittedSearch("");
    setAssessmentFilter("ALL");
  };

  // Derive summary metrics from real loaded dataset
  const summary = useMemo(() => {
    const totalCount = charges.length;
    const totalAmount = charges.reduce((acc, c) => acc + (c.amount || 0), 0);
    const contradictedCount = charges.filter((c) => c.assessment === "CONTRADICTED").length;
    const silentCount = charges.filter((c) => c.assessment === "SILENT").length;
    const uncertainCount = charges.filter((c) => c.assessment === "UNCERTAIN").length;

    return {
      totalCount,
      totalAmount,
      contradictedCount,
      silentCount,
      uncertainCount,
    };
  }, [charges]);

  // Semantic status token styling
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
      case "DUPLICATE":
        return {
          pill: "bg-orange-50 text-orange-800 border-orange-200",
          dot: "bg-orange-500",
        };
      case "ALREADY_REIMBURSED":
        return {
          pill: "bg-blue-50 text-blue-800 border-blue-200",
          dot: "bg-blue-500",
        };
      default:
        return {
          pill: "bg-gray-100 text-gray-700 border-gray-200",
          dot: "bg-gray-400",
        };
    }
  };

  const hasActiveFilters = assessmentFilter !== "ALL" || Boolean(submittedSearch);

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
                Charges Explorer
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Filter and investigate channel deductions across inbound, inventory loss, and returns.
            </p>
          </div>

          <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-lg shadow-subtle flex items-center space-x-2 self-start sm:self-auto font-mono">
            {loading ? (
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
            ) : (
              <span>
                Total Records: <strong className="font-bold text-gray-900">{charges.length}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. COMPACT SUMMARY KPI STRIP                                 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Total Charges
              </span>
              <Receipt className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : summary.totalCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Assessed line items</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Total Amount
              </span>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : `$${summary.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Gross deductions</div>
          </div>

          <div className="bg-white border-2 border-[#FF9900] rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#E88A00] uppercase tracking-wide">
                Contradicted
              </span>
              <TrendingUp className="w-4 h-4 text-[#FF9900]" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-extrabold font-sans tabular-nums text-gray-900">
              {loading ? "--" : summary.contradictedCount}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Defensible claims</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Conservative Skips
              </span>
              <FileQuestion className="w-4 h-4 text-gray-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : summary.silentCount + summary.uncertainCount}
            </div>
            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
              {summary.silentCount} Silent &bull; {summary.uncertainCount} Uncertain
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. SEARCH & FILTER TOOLBAR                                   */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-subtle space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Charge ID, Unit ID, Shipment ID, or Reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-900 placeholder-gray-400 input-focus transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Assessment Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {["ALL", "CONTRADICTED", "SILENT", "UNCERTAIN", "SUPPORTED"].map((f) => {
                const isActive = assessmentFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setAssessmentFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#FF9900] ${
                      isActive
                        ? "bg-orange-50 text-gray-950 border border-orange-300 shadow-subtle"
                        : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Chips & Clear Action */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
              <span className="font-medium text-gray-600">Active filters:</span>

              {assessmentFilter !== "ALL" && (
                <span className="inline-flex items-center space-x-1 bg-orange-50 border border-orange-200 text-gray-900 px-2.5 py-0.5 rounded-md font-semibold">
                  <span>Verdict: {assessmentFilter}</span>
                  <button
                    onClick={() => setAssessmentFilter("ALL")}
                    className="hover:text-red-600 ml-1"
                    aria-label="Remove filter"
                  >
                    &times;
                  </button>
                </span>
              )}

              {submittedSearch && (
                <span className="inline-flex items-center space-x-1 bg-gray-100 border border-gray-200 text-gray-900 px-2.5 py-0.5 rounded-md font-semibold">
                  <span>Query: "{submittedSearch}"</span>
                  <button
                    onClick={handleClearSearch}
                    className="hover:text-red-600 ml-1"
                    aria-label="Remove search filter"
                  >
                    &times;
                  </button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1 text-gray-500 hover:text-red-600 ml-auto font-medium hover:underline text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset all filters</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 4. CHARGES DATA TABLE                                        */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider font-semibold border-b border-gray-200 text-[11px] font-mono">
                <tr>
                  <th className="py-3.5 px-4">Charge ID</th>
                  <th className="py-3.5 px-4">Unit ID</th>
                  <th className="py-3.5 px-4">Shipment / Order</th>
                  <th className="py-3.5 px-4">SKU / FNSKU</th>
                  <th className="py-3.5 px-4">Deduction Reason</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Posted Date</th>
                  <th className="py-3.5 px-4">Verdict</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <TableSkeletonRows rows={8} cols={9} />
                ) : charges.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <Receipt className="w-8 h-8 text-gray-300 mx-auto" />
                        <div className="font-semibold text-gray-900 text-sm">No charges found</div>
                        <p className="text-xs text-gray-500">
                          No deductions match your current filter or search criteria.
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="btn-secondary text-xs mt-3 px-3 py-1.5"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  charges.map((c) => {
                    const badge = getBadgeConfig(c.assessment);
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50/80 transition-colors group cursor-default"
                      >
                        {/* Charge ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                          <span className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-[11px] text-gray-900 font-semibold group-hover:border-gray-300 transition-colors">
                            {c.charge_id}
                          </span>
                        </td>

                        {/* Unit ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-800">
                          {c.unit_id ? (
                            <span className="text-gray-900">{c.unit_id}</span>
                          ) : (
                            <span className="text-gray-400">&mdash;</span>
                          )}
                        </td>

                        {/* Shipment / Order */}
                        <td className="py-3.5 px-4 font-mono text-gray-600 text-xs">
                          {c.shipment_id || c.order_id || <span className="text-gray-400">&mdash;</span>}
                        </td>

                        {/* SKU / FNSKU */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900">{c.sku || <span className="text-gray-400">&mdash;</span>}</div>
                          {c.fnsku && (
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{c.fnsku}</div>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 capitalize text-gray-800 font-medium text-xs">
                          {c.reason ? c.reason.replace(/_/g, " ") : "Deduction"}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-sans font-bold text-gray-900 tabular-nums text-xs">
                          ${c.amount?.toFixed(2) || "0.00"}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-gray-500 font-mono text-xs">
                          {c.charge_date || <span className="text-gray-400">&mdash;</span>}
                        </td>

                        {/* Verdict */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{c.assessment}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/investigations/${c.charge_id}`}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold border border-gray-300 hover:border-gray-400 transition-colors group-hover:border-[#FF9900] group-hover:text-[#E88A00] shadow-subtle"
                          >
                            <span>Investigate</span>
                            <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
