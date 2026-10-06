"use client";
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  FileCheck2,
  Search,
  RotateCcw,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  X,
  ShieldAlert,
} from "lucide-react";
import ClaimPackageModal from "../../components/ClaimPackageModal";
import { TableSkeletonRows } from "../../components/LoadingSkeleton";

export default function ClaimsPage() {
  const { currentCompany } = useWorkspace();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadClaims = async () => {
    try {
      setLoading(true);
      const data = await api.getClaims(currentCompany);
      setClaims(data || []);
    } catch (err) {
      console.error("Failed to load claims:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [currentCompany]);

  const handleOpenClaim = (c) => {
    setSelectedClaim(c);
    setClaimModalOpen(true);
  };

  const handleStatusChange = async (claimId, newStatus) => {
    try {
      await api.updateClaimStatus(claimId, newStatus, currentCompany);
      await loadClaims();
    } catch (err) {
      alert(`Failed to update claim status: ${err.message}`);
    }
  };

  const handleClearSearch = () => {
    setSearch("");
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  // Derive summary metrics from real loaded dataset
  const summary = useMemo(() => {
    const totalCount = claims.length;
    const totalPipeline = claims.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const paidClaims = claims.filter(
      (c) => c.status?.toUpperCase() === "PAID" || c.status?.toUpperCase() === "RECOVERED"
    );
    const paidAmount = paidClaims.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const paidCount = paidClaims.length;

    const submittedClaims = claims.filter(
      (c) => c.status?.toUpperCase() === "SUBMITTED"
    );
    const submittedAmount = submittedClaims.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const submittedCount = submittedClaims.length;

    const draftClaims = claims.filter(
      (c) => !c.status || c.status?.toUpperCase() === "DRAFT"
    );
    const draftAmount = draftClaims.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const draftCount = draftClaims.length;

    return {
      totalCount,
      totalPipeline,
      paidAmount,
      paidCount,
      submittedAmount,
      submittedCount,
      draftAmount,
      draftCount,
    };
  }, [claims]);

  // Filtered claims based on search and status
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      // Status filter
      if (statusFilter !== "ALL") {
        const s = c.status?.toUpperCase() || "DRAFT";
        if (statusFilter === "PAID" && s !== "PAID" && s !== "RECOVERED") return false;
        if (statusFilter !== "PAID" && s !== statusFilter) return false;
      }

      // Search query
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const claimIdMatch = c.claim_id?.toLowerCase().includes(query);
        const chargeIdMatch = c.charge_id?.toLowerCase().includes(query);
        const reasonMatch = c.audit_packet?.charge_metadata?.reason
          ?.toLowerCase()
          .includes(query);

        if (!claimIdMatch && !chargeIdMatch && !reasonMatch) return false;
      }

      return true;
    });
  }, [claims, statusFilter, search]);

  const hasActiveFilters = statusFilter !== "ALL" || Boolean(search.trim());

  // Status badge styling helper
  const getStatusClasses = (status) => {
    const s = status?.toUpperCase() || "DRAFT";
    switch (s) {
      case "SUBMITTED":
        return "bg-sky-50 text-sky-800 border-sky-300 focus:ring-sky-400";
      case "PAID":
      case "RECOVERED":
        return "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0] focus:ring-emerald-400";
      case "REJECTED":
        return "bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-400";
      case "DRAFT":
      default:
        return "bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-400";
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={loadClaims} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full page-enter">
        {/* ============================================================ */}
        {/* 1. COMPACT PAGE HEADER                                       */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-sans">
                Claims & Audit Dossiers
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Frozen claim packages with immutable physical proof citations. Change filing status to track recovery progress.
            </p>
          </div>

          <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-lg shadow-subtle flex items-center space-x-3 self-start sm:self-auto font-mono">
            {loading ? (
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            ) : (
              <span>
                Total Pipeline: <strong className="font-bold text-gray-900">${summary.totalPipeline.toFixed(2)} USD</strong> ({claims.length} packages)
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. COMPACT SUMMARY KPI STRIP                                 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Pipeline Value */}
          <div className="bg-white border-2 border-[#FF9900] rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#E88A00] uppercase tracking-wide">
                Total Pipeline
              </span>
              <DollarSign className="w-4 h-4 text-[#FF9900]" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-extrabold font-sans tabular-nums text-gray-900">
              {loading ? "--" : `$${summary.totalPipeline.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {summary.totalCount} active claim dossiers
            </div>
          </div>

          {/* Card 2: Recovered Revenue */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Recovered / Paid
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-[#15803d]">
              {loading ? "--" : `$${summary.paidAmount.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {summary.paidCount} settled claims
            </div>
          </div>

          {/* Card 3: Submitted */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                In Review
              </span>
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : `$${summary.submittedAmount.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {summary.submittedCount} filed with channel
            </div>
          </div>

          {/* Card 4: Drafts */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Drafts (Unfiled)
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : `$${summary.draftAmount.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {summary.draftCount} pending submission
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. SEARCH & FILTER TOOLBAR                                   */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-subtle space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Claim ID, Charge ID, or Reason..."
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
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {["ALL", "DRAFT", "SUBMITTED", "PAID", "REJECTED"].map((st) => {
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#FF9900] ${
                      isActive
                        ? "bg-orange-50 text-gray-950 border border-orange-300 shadow-subtle"
                        : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {st === "ALL"
                      ? "ALL CLAIMS"
                      : st === "PAID"
                      ? "PAID / RECOVERED"
                      : st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Chips & Clear Action */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
              <span className="font-medium text-gray-600">Active filters:</span>

              {statusFilter !== "ALL" && (
                <span className="inline-flex items-center space-x-1 bg-orange-50 border border-orange-200 text-gray-900 px-2.5 py-0.5 rounded-md font-semibold">
                  <span>Status: {statusFilter}</span>
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className="hover:text-red-600 ml-1"
                    aria-label="Remove status filter"
                  >
                    &times;
                  </button>
                </span>
              )}

              {search.trim() && (
                <span className="inline-flex items-center space-x-1 bg-gray-100 border border-gray-200 text-gray-900 px-2.5 py-0.5 rounded-md font-semibold">
                  <span>Query: "{search}"</span>
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
        {/* 4. CLAIMS DATA TABLE                                         */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider font-semibold border-b border-gray-200 text-[11px] font-mono">
                <tr>
                  <th className="py-3.5 px-4">Claim ID</th>
                  <th className="py-3.5 px-4">Deduction Charge</th>
                  <th className="py-3.5 px-4 text-right">Recovery Amount</th>
                  <th className="py-3.5 px-4">Filing Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <TableSkeletonRows rows={6} cols={6} />
                ) : filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <FileCheck2 className="w-8 h-8 text-gray-300 mx-auto" />
                        <div className="font-semibold text-gray-900 text-sm">No claims found</div>
                        <p className="text-xs text-gray-500">
                          {hasActiveFilters
                            ? "No claims match your current filter or search criteria."
                            : "No claims generated for this company workspace yet. Visit Recovery Opportunities to generate claims."}
                        </p>
                        {hasActiveFilters ? (
                          <button
                            onClick={handleResetFilters}
                            className="btn-secondary text-xs mt-3 px-3 py-1.5"
                          >
                            Reset filters
                          </button>
                        ) : (
                          <Link
                            href="/recovery"
                            className="btn-primary inline-flex items-center space-x-1.5 text-xs mt-3 px-3.5 py-1.5"
                          >
                            <span>Go to Recovery Pipeline</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((c) => {
                    const s = c.status?.toUpperCase() || "DRAFT";
                    const statusClass = getStatusClasses(s);

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50/80 transition-colors group cursor-default"
                      >
                        {/* Claim ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                          <span className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-[11px] text-gray-900 font-semibold group-hover:border-gray-300 transition-colors">
                            {c.claim_id}
                          </span>
                        </td>

                        {/* Deduction Charge */}
                        <td className="py-3.5 px-4 font-mono text-gray-800">
                          <Link
                            href={`/investigations/${c.charge_id}`}
                            className="text-gray-900 hover:text-[#E88A00] hover:underline font-semibold inline-flex items-center space-x-1"
                          >
                            <span>{c.charge_id}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#FF9900]" />
                          </Link>
                          {c.audit_packet?.charge_metadata?.reason && (
                            <div className="text-[10px] text-gray-500 font-sans capitalize mt-0.5">
                              {c.audit_packet.charge_metadata.reason.replace(/_/g, " ")}
                            </div>
                          )}
                        </td>

                        {/* Recovery Amount */}
                        <td className="py-3.5 px-4 text-right font-sans font-bold text-gray-900 tabular-nums text-xs">
                          ${c.amount?.toFixed(2) || "0.00"} {c.currency || "USD"}
                        </td>

                        {/* Filing Status Select */}
                        <td className="py-3.5 px-4">
                          <div className="relative inline-block">
                            <select
                              value={s}
                              onChange={(e) => handleStatusChange(c.claim_id, e.target.value)}
                              className={`appearance-none pl-2.5 pr-7 py-1 rounded-lg text-[11px] font-bold uppercase border cursor-pointer focus:outline-none focus:ring-2 transition-all shadow-subtle ${statusClass}`}
                            >
                              <option value="DRAFT">DRAFT (Unfiled)</option>
                              <option value="SUBMITTED">SUBMITTED (In Review)</option>
                              <option value="PAID">PAID / RECOVERED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-2 pointer-events-none" />
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-gray-500 font-mono text-xs">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : "Today"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenClaim(c)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold border border-gray-300 hover:border-gray-400 transition-colors group-hover:border-[#FF9900] group-hover:text-[#E88A00] shadow-subtle"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-[#FF9900]" />
                            <span>View Dossier</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Claim Package Dossier Modal */}
        <ClaimPackageModal
          isOpen={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          claim={selectedClaim}
          onStatusChange={loadClaims}
        />
      </main>
    </div>
  );
}
