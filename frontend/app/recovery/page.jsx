"use client";
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  TrendingUp,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Search,
  X,
  DollarSign,
  Clock,
  ArrowUpRight,
  Check,
  AlertCircle,
  Filter,
  Sparkles,
  RefreshCw,
  FileText,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import ClaimPackageModal from "../../components/ClaimPackageModal";
import { TableSkeletonRows } from "../../components/LoadingSkeleton";

export default function RecoveryPipelinePage() {
  const { currentCompany } = useWorkspace();
  const [opportunities, setOpportunities] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | READY | DRAFT | SUBMITTED | PAID | REJECTED
  const [activeClaim, setActiveClaim] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  // Load opportunities and existing claims simultaneously
  const loadRecoveryData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [oppsData, claimsData] = await Promise.all([
        api.getRecoveryOpportunities(currentCompany),
        api.getClaims(currentCompany).catch(() => []),
      ]);
      setOpportunities(oppsData || []);
      setClaims(claimsData || []);
    } catch (err) {
      console.error("Failed to load recovery pipeline:", err);
      setError(err.message || "Failed to load recovery opportunities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecoveryData();
  }, [currentCompany]);

  // Index claims by charge_id for instant relationship resolution
  const claimsByCharge = useMemo(() => {
    const map = {};
    claims.forEach((c) => {
      if (c.charge_id) {
        map[c.charge_id] = c;
      }
    });
    return map;
  }, [claims]);

  // Attach real claim status to each opportunity
  const enrichedOpportunities = useMemo(() => {
    return opportunities.map((opp) => {
      const linkedClaim = claimsByCharge[opp.charge_id];
      const effectiveStatus = linkedClaim ? (linkedClaim.status || "DRAFT").toUpperCase() : "READY";
      return {
        ...opp,
        linkedClaim,
        effectiveStatus,
      };
    });
  }, [opportunities, claimsByCharge]);

  // Summary Metrics computed directly from real loaded data
  const summary = useMemo(() => {
    const totalPipeline = enrichedOpportunities.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const readyItems = enrichedOpportunities.filter((o) => o.effectiveStatus === "READY");
    const readyAmount = readyItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const draftItems = enrichedOpportunities.filter((o) => o.effectiveStatus === "DRAFT");
    const draftAmount = draftItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const submittedItems = enrichedOpportunities.filter((o) => o.effectiveStatus === "SUBMITTED");
    const submittedAmount = submittedItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const paidItems = enrichedOpportunities.filter((o) => o.effectiveStatus === "PAID");
    const paidAmount = paidItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return {
      totalCount: enrichedOpportunities.length,
      totalPipeline,
      readyCount: readyItems.length,
      readyAmount,
      draftCount: draftItems.length,
      draftAmount,
      submittedCount: submittedItems.length,
      submittedAmount,
      paidCount: paidItems.length,
      paidAmount,
    };
  }, [enrichedOpportunities]);

  // Filtered opportunities list
  const filteredOpportunities = useMemo(() => {
    return enrichedOpportunities.filter((opp) => {
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "READY" && opp.effectiveStatus !== "READY") return false;
        if (statusFilter === "DRAFT" && opp.effectiveStatus !== "DRAFT") return false;
        if (statusFilter === "SUBMITTED" && opp.effectiveStatus !== "SUBMITTED") return false;
        if (statusFilter === "PAID" && opp.effectiveStatus !== "PAID") return false;
        if (statusFilter === "REJECTED" && opp.effectiveStatus !== "REJECTED") return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesId = opp.charge_id?.toLowerCase().includes(q);
        const matchesUnit = opp.unit_id?.toLowerCase().includes(q);
        const matchesShipment = opp.shipment_id?.toLowerCase().includes(q);
        const matchesSku = opp.sku?.toLowerCase().includes(q);
        const matchesReason = opp.reason?.toLowerCase().includes(q);
        const matchesClaim = opp.linkedClaim?.claim_id?.toLowerCase().includes(q);
        if (!matchesId && !matchesUnit && !matchesShipment && !matchesSku && !matchesReason && !matchesClaim) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedOpportunities, statusFilter, search]);

  const handleQuickClaim = async (chargeId) => {
    try {
      setClaimingId(chargeId);
      const claim = await api.createClaim(currentCompany, chargeId);
      setActiveClaim(claim);
      setClaimModalOpen(true);
      loadRecoveryData();
    } catch (err) {
      alert(`Claim generation failed: ${err.message}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleViewClaim = (claim) => {
    setActiveClaim(claim);
    setClaimModalOpen(true);
  };

  const handleStatusChange = async (newStatus) => {
    if (!activeClaim) return;
    try {
      await api.updateClaimStatus(activeClaim.claim_id, newStatus, currentCompany);
      loadRecoveryData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "READY":
        return {
          pill: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
          label: "Ready to File",
        };
      case "DRAFT":
        return {
          pill: "bg-gray-100 text-gray-700 border-gray-200",
          dot: "bg-gray-400",
          label: "Dossier Drafted",
        };
      case "SUBMITTED":
        return {
          pill: "bg-sky-50 text-sky-800 border-sky-200",
          dot: "bg-sky-500",
          label: "Dispute Filed",
        };
      case "PAID":
      case "RECOVERED":
        return {
          pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Settled / Paid",
        };
      case "REJECTED":
        return {
          pill: "bg-rose-50 text-rose-800 border-rose-200",
          dot: "bg-rose-500",
          label: "Declined",
        };
      default:
        return {
          pill: "bg-gray-100 text-gray-600 border-gray-200",
          dot: "bg-gray-400",
          label: status,
        };
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  const hasActiveFilters = statusFilter !== "ALL" || Boolean(search.trim());

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={loadRecoveryData} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full page-enter">
        {/* ============================================================ */}
        {/* 1. COMPACT PAGE HEADER                                       */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-sans">
                Recovery Pipeline
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Active pipeline of channel deductions contradicted by operational warehouse proof. File defensible claims and track recovery through settlement.
            </p>
          </div>

          <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-lg shadow-subtle flex items-center space-x-2 self-start sm:self-auto font-mono">
            {loading ? (
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            ) : (
              <span>
                Pipeline Value: <strong className="font-bold text-gray-900">${summary.totalPipeline.toFixed(2)} USD</strong> ({summary.totalCount} items)
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. COMPACT SUMMARY KPI STRIP                                 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Pipeline */}
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
              {summary.totalCount} substantiated claims
            </div>
          </div>

          {/* Card 2: Ready for Action */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Ready to File
              </span>
              <FileCheck2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-amber-800">
              {loading ? "--" : `$${(summary.readyAmount + summary.draftAmount).toFixed(2)}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {summary.readyCount + summary.draftCount} unsubmitted dossiers
            </div>
          </div>

          {/* Card 3: Filed / In Progress */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Filed / Active
              </span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-sky-700">
              {loading ? "--" : `$${summary.submittedAmount.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {summary.submittedCount} under marketplace review
            </div>
          </div>

          {/* Card 4: Settled / Recovered */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Settled / Paid
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-emerald-700">
              {loading ? "--" : `$${summary.paidAmount.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {summary.paidCount} confirmed reimbursements
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. PIPELINE STAGE PROGRESSION STRIP                          */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Recovery Lifecycle Stages</span>
            <span className="font-mono text-gray-400 font-normal">Identified by Contradiction Engine</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">1. Identify</div>
              <div className="font-semibold text-gray-900 mt-0.5">Contradicted Fee</div>
              <div className="text-[11px] text-gray-500 font-mono mt-0.5">{summary.totalCount} detected</div>
            </div>

            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">2. Review</div>
              <div className="font-semibold text-gray-900 mt-0.5">Forensic Audit</div>
              <div className="text-[11px] text-gray-500 font-mono mt-0.5">100% verified proof</div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
              <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">3. File</div>
              <div className="font-semibold text-amber-900 mt-0.5">Ready to Claim</div>
              <div className="text-[11px] text-amber-800 font-mono mt-0.5">{summary.readyCount + summary.draftCount} available</div>
            </div>

            <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-200">
              <div className="text-[10px] text-sky-700 font-bold uppercase tracking-wide">4. Track</div>
              <div className="font-semibold text-sky-900 mt-0.5">Dispute Submitted</div>
              <div className="text-[11px] text-sky-800 font-mono mt-0.5">{summary.submittedCount} awaiting crediting</div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide">5. Recover</div>
              <div className="font-semibold text-emerald-900 mt-0.5">Reimbursed</div>
              <div className="text-[11px] text-emerald-800 font-mono mt-0.5">${summary.paidAmount.toFixed(2)} settled</div>
            </div>
          </div>
        </div>

        {/* Error notification banner if any */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadRecoveryData}
              className="px-3 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. FILTERS & SEARCH TOOLBAR                                  */}
        {/* ============================================================ */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-subtle">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Charge ID, Unit ID, SKU, Reason, or Claim ID..."
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

          {/* Status Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "READY", "DRAFT", "SUBMITTED", "PAID"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === f
                    ? "bg-[#FF9900] text-white shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white border border-gray-200"
                }`}
              >
                {f === "ALL"
                  ? "ALL"
                  : f === "READY"
                  ? "READY TO FILE"
                  : f === "DRAFT"
                  ? "DRAFTS"
                  : f === "SUBMITTED"
                  ? "FILED"
                  : "SETTLED"}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-gray-500 font-medium">Active Filters:</span>
            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 shadow-xs">
                <span>Status: {statusFilter}</span>
                <button
                  onClick={() => setStatusFilter("ALL")}
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
        {/* 5. RECOVERY OPPORTUNITIES TABLE                              */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="py-3 px-4">Charge / Target ID</th>
                  <th className="py-3 px-4">Unit / Physical Tracking</th>
                  <th className="py-3 px-4">Deduction Reason</th>
                  <th className="py-3 px-4 text-right">Recovery Amount</th>
                  <th className="py-3 px-4">Pipeline Status</th>
                  <th className="py-3 px-4">Proof Citations</th>
                  <th className="py-3 px-4">Defense Rationale</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {loading ? (
                  <TableSkeletonRows rows={6} cols={8} />
                ) : filteredOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-500">
                      <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto text-gray-400 mb-2">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">No recovery items available</p>
                      <p className="text-xs text-gray-400 mt-1">There are currently no recoverable items matching the current view.</p>
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
                  filteredOpportunities.map((opp) => {
                    const statusConfig = getStatusBadge(opp.effectiveStatus);
                    const isGenerating = claimingId === opp.charge_id;

                    return (
                      <tr
                        key={opp.charge_id}
                        className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                      >
                        {/* Charge ID */}
                        <td className="py-3 px-4">
                          <Link
                            href={`/investigations/${opp.charge_id}`}
                            className="font-mono font-bold text-gray-900 group-hover:text-[#E88A00] transition-colors flex items-center space-x-1"
                            title="Inspect investigation"
                          >
                            <span>{opp.charge_id}</span>
                            <ArrowUpRight className="w-3 h-3 text-[#FF9900] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          {opp.linkedClaim && (
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              Claim: <span className="text-gray-600">{opp.linkedClaim.claim_id}</span>
                            </div>
                          )}
                        </td>

                        {/* Unit / Physical Tracking */}
                        <td className="py-3 px-4">
                          {opp.unit_id ? (
                            <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                              {opp.unit_id}
                            </span>
                          ) : opp.shipment_id ? (
                            <span className="font-mono text-gray-500 text-[11px]">{opp.shipment_id}</span>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>

                        {/* Deduction Reason */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 capitalize">
                            {opp.reason ? opp.reason.replace(/_/g, " ") : "Operational Deduction"}
                          </div>
                          {opp.sku && (
                            <div className="text-[10px] text-gray-400 font-mono">
                              SKU: {opp.sku}
                            </div>
                          )}
                        </td>

                        {/* Recovery Amount */}
                        <td className="py-3 px-4 text-right font-sans font-bold text-emerald-700 tabular-nums">
                          ${(opp.amount || 0).toFixed(2)}{" "}
                          <span className="text-[10px] font-normal text-gray-500">{opp.currency || "USD"}</span>
                        </td>

                        {/* Pipeline Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                            <span>{statusConfig.label}</span>
                          </span>
                        </td>

                        {/* Proof Records */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-50 text-gray-700 font-mono text-[11px] border border-gray-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{opp.evidence_count} attached</span>
                          </span>
                        </td>

                        {/* Defense Rationale */}
                        <td className="py-3 px-4 max-w-xs">
                          <p
                            className="text-gray-600 line-clamp-1 truncate text-[11px] leading-relaxed"
                            title={opp.reasoning}
                          >
                            {opp.reasoning}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Review Investigation */}
                            <Link
                              href={`/investigations/${opp.charge_id}`}
                              className="px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-subtle transition flex items-center space-x-1"
                              title="Review forensic investigation"
                            >
                              <span>Review</span>
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </Link>

                            {/* Claim Action */}
                            {opp.linkedClaim ? (
                              <button
                                onClick={() => handleViewClaim(opp.linkedClaim)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold shadow-subtle transition flex items-center space-x-1"
                                title="View formal dispute package"
                              >
                                <FileCheck2 className="w-3.5 h-3.5 text-gray-600" />
                                <span>View Claim</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuickClaim(opp.charge_id)}
                                disabled={isGenerating}
                                className="px-3 py-1.5 bg-[#FF9900] hover:bg-[#E88A00] text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center space-x-1 disabled:opacity-50"
                                title="Generate formal reimbursement claim package"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" />
                                <span>{isGenerating ? "Generating..." : "Generate Claim"}</span>
                              </button>
                            )}
                          </div>
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
          claim={activeClaim}
          onStatusChange={handleStatusChange}
        />
      </main>
    </div>
  );
}
