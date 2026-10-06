"use client";
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  Search,
  X,
  Layers,
  PackageCheck,
  CheckCircle,
  RotateCcw,
  Receipt,
  Clock,
  Network,
  Camera,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Eye,
  ArrowUpRight,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import EvidenceGraph from "../../components/EvidenceGraph";
import EvidenceTimeline from "../../components/EvidenceTimeline";
import { TableSkeletonRows, EvidenceCardSkeleton } from "../../components/LoadingSkeleton";

export default function EvidencePage() {
  const { currentCompany } = useWorkspace();
  const [evidenceList, setEvidenceList] = useState([]);
  const [chargesList, setChargesList] = useState([]);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("records"); // "records" | "graph" | "timeline"
  const [viewLayout, setViewLayout] = useState("table"); // "table" | "cards"
  const [activeChargeId, setActiveChargeId] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [expandedJson, setExpandedJson] = useState(false);

  // Load primary evidence records and reference charges for mapping
  const loadEvidence = async () => {
    try {
      setLoading(true);
      setError(null);
      const [evidenceData, chargesData] = await Promise.all([
        api.getEvidenceList(currentCompany, {
          source_type: sourceFilter !== "ALL" ? sourceFilter.toLowerCase() : undefined,
        }),
        api.getCharges(currentCompany).catch(() => []),
      ]);
      setEvidenceList(evidenceData || []);
      setChargesList(chargesData || []);
    } catch (err) {
      console.error("Failed to load evidence:", err);
      setError(err.message || "Failed to load operational evidence logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [currentCompany, sourceFilter]);

  useEffect(() => {
    if (!selectedRecord) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedRecord(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRecord]);

  // Index charges by unit_id, shipment_id, order_id for instant relational mapping
  const chargeLookup = useMemo(() => {
    const byUnit = {};
    const byShipment = {};
    const byOrder = {};

    chargesList.forEach((c) => {
      if (c.unit_id) byUnit[c.unit_id] = c;
      if (c.shipment_id) byShipment[c.shipment_id] = c;
      if (c.order_id) byOrder[c.order_id] = c;
    });

    return { byUnit, byShipment, byOrder };
  }, [chargesList]);

  // Helper to find associated charge for an evidence record
  const getLinkedCharge = (record) => {
    if (!record) return null;
    return (
      (record.unit_id && chargeLookup.byUnit[record.unit_id]) ||
      (record.shipment_id && chargeLookup.byShipment[record.shipment_id]) ||
      (record.order_id && chargeLookup.byOrder[record.order_id]) ||
      null
    );
  };

  // Filter evidence based on search query across ID, Unit, SKU, Description, Finding
  const filteredEvidence = useMemo(() => {
    if (!search.trim()) return evidenceList;
    const s = search.toLowerCase().trim();
    return evidenceList.filter((e) => {
      return (
        e.evidence_id?.toLowerCase().includes(s) ||
        e.unit_id?.toLowerCase().includes(s) ||
        e.sku?.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s) ||
        e.source_type?.toLowerCase().includes(s) ||
        e.finding?.toLowerCase().includes(s) ||
        e.shipment_id?.toLowerCase().includes(s) ||
        e.order_id?.toLowerCase().includes(s)
      );
    });
  }, [evidenceList, search]);

  // Compute metrics strictly derived from the real loaded data
  const metrics = useMemo(() => {
    const total = evidenceList.length;
    const receiving = evidenceList.filter(
      (e) => e.source_type?.toLowerCase() === "receiving"
    ).length;
    const prep = evidenceList.filter(
      (e) => e.source_type?.toLowerCase() === "prep"
    ).length;
    const pack = evidenceList.filter(
      (e) => e.source_type?.toLowerCase() === "pack"
    ).length;
    const returns = evidenceList.filter(
      (e) => e.source_type?.toLowerCase() === "returns"
    ).length;
    const passCount = evidenceList.filter(
      (e) => e.finding?.toUpperCase() === "PASS"
    ).length;
    const failCount = evidenceList.filter(
      (e) => e.finding?.toUpperCase() === "FAIL"
    ).length;

    return {
      total,
      receiving,
      prep,
      pack,
      returns,
      packReturns: pack + returns,
      passCount,
      failCount,
      passRate: total > 0 ? Math.round((passCount / total) * 100) : 0,
    };
  }, [evidenceList]);

  // Charges that have evidence for Graph & Timeline selection
  const chargesWithEvidence = useMemo(() => {
    return chargesList.filter((c) => c.unit_id || c.shipment_id);
  }, [chargesList]);

  // Load Graph and Timeline data when active charge changes or tab switches
  const loadGraphAndTimeline = async (chargeId) => {
    if (!chargeId) return;
    try {
      setGraphLoading(true);
      const [gData, invData] = await Promise.all([
        api.getEvidenceGraph(chargeId, currentCompany).catch(() => null),
        api.getInvestigation(chargeId, currentCompany).catch(() => null),
      ]);
      setGraphData(gData);
      setTimelineData(invData?.timeline || []);
    } catch (err) {
      console.error("Failed to load graph/timeline:", err);
    } finally {
      setGraphLoading(false);
    }
  };

  // Set default active charge once charges load
  useEffect(() => {
    if (!activeChargeId && chargesWithEvidence.length > 0) {
      setActiveChargeId(chargesWithEvidence[0].charge_id);
    }
  }, [chargesWithEvidence, activeChargeId]);

  useEffect(() => {
    if (activeChargeId && (activeTab === "graph" || activeTab === "timeline")) {
      loadGraphAndTimeline(activeChargeId);
    }
  }, [activeChargeId, activeTab, currentCompany]);

  // Jump to graph or timeline for a specific record
  const inspectInGraph = (record) => {
    const linked = getLinkedCharge(record);
    if (linked) {
      setActiveChargeId(linked.charge_id);
      loadGraphAndTimeline(linked.charge_id);
      setActiveTab("graph");
      setSelectedRecord(null);
    } else if (chargesWithEvidence.length > 0) {
      setActiveChargeId(chargesWithEvidence[0].charge_id);
      loadGraphAndTimeline(chargesWithEvidence[0].charge_id);
      setActiveTab("graph");
      setSelectedRecord(null);
    }
  };

  const inspectInTimeline = (record) => {
    const linked = getLinkedCharge(record);
    if (linked) {
      setActiveChargeId(linked.charge_id);
      loadGraphAndTimeline(linked.charge_id);
      setActiveTab("timeline");
      setSelectedRecord(null);
    } else if (chargesWithEvidence.length > 0) {
      setActiveChargeId(chargesWithEvidence[0].charge_id);
      loadGraphAndTimeline(chargesWithEvidence[0].charge_id);
      setActiveTab("timeline");
      setSelectedRecord(null);
    }
  };

  // Source badge styling
  const getSourceBadge = (source) => {
    const s = source?.toLowerCase();
    switch (s) {
      case "receiving":
        return {
          pill: "bg-sky-50 text-sky-800 border-sky-200",
          icon: <PackageCheck className="w-3 h-3 text-sky-600" />,
        };
      case "prep":
        return {
          pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle className="w-3 h-3 text-emerald-600" />,
        };
      case "pack":
        return {
          pill: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: <Layers className="w-3 h-3 text-indigo-600" />,
        };
      case "returns":
        return {
          pill: "bg-purple-50 text-purple-800 border-purple-200",
          icon: <RotateCcw className="w-3 h-3 text-purple-600" />,
        };
      default:
        return {
          pill: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <FileText className="w-3 h-3 text-gray-500" />,
        };
    }
  };

  // Finding badge styling
  const getFindingBadge = (finding) => {
    const f = finding?.toUpperCase();
    if (f === "PASS") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (f === "FAIL") {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (f === "UNCERTAIN") {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const handleResetFilters = () => {
    setSearch("");
    setSourceFilter("ALL");
  };

  const hasActiveFilters = sourceFilter !== "ALL" || Boolean(search.trim());

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={loadEvidence} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full page-enter">
        {/* ============================================================ */}
        {/* 1. PAGE HEADER                                               */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-sans">
                Evidence Intelligence Workspace
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl leading-relaxed">
              Immutable physical logs recorded across Receiving, Prep, Pack, and Returns lines. Trace proof chains from operational custody to channel fee deductions and defensible claims.
            </p>
            {/* Mental model provenance banner */}
            <div className="flex items-center space-x-1.5 mt-2.5 text-[11px] font-mono text-gray-500 overflow-x-auto py-0.5">
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded font-semibold text-gray-700">SOURCE</span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-2 py-0.5 bg-[#FFF9F2] border border-[#FF9900]/40 rounded font-bold text-[#E88A00]">EVIDENCE</span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded font-semibold text-gray-700">CHARGE</span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded font-semibold text-emerald-800">CLAIM</span>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-2 rounded-lg shadow-subtle flex items-center space-x-2 self-start sm:self-auto font-mono">
            {loading ? (
              <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
            ) : (
              <span>
                Total Records: <strong className="font-bold text-gray-900">{filteredEvidence.length}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. SUMMARY KPI STRIP                                         */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Evidence Records */}
          <div className="bg-white border-2 border-[#FF9900] rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#E88A00] uppercase tracking-wide">
                Total Logs
              </span>
              <FileText className="w-4 h-4 text-[#FF9900]" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-extrabold font-sans tabular-nums text-gray-900">
              {loading ? "--" : metrics.total}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Physical event records</div>
          </div>

          {/* Card 2: Receiving Audits */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Receiving Audits
              </span>
              <PackageCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : metrics.receiving}
            </div>
            <div className="text-[11px] text-sky-700 font-medium mt-0.5">Inbound arrival scans</div>
          </div>

          {/* Card 3: Prep Compliance */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Prep Compliance
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : metrics.prep}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Polybag & label proof</div>
          </div>

          {/* Card 4: Pack & Returns */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Pack & Returns
              </span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loading ? "--" : metrics.packReturns}
            </div>
            <div className="text-[11px] text-indigo-700 font-medium mt-0.5">Outbound & reverse logs</div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. WORKSPACE VIEW SWITCHER & CONTROLS                         */}
        {/* ============================================================ */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-subtle">
          {/* View Mode Tabs */}
          <div className="flex items-center space-x-1 border border-gray-200 p-1 rounded-lg bg-gray-50 self-start">
            <button
              onClick={() => setActiveTab("records")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "records"
                  ? "bg-white text-gray-900 shadow-xs font-bold border border-gray-200/80"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Evidence Records</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                {filteredEvidence.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "graph"
                  ? "bg-white text-gray-900 shadow-xs font-bold border border-gray-200/80"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Network className="w-3.5 h-3.5 text-[#FF9900]" />
              <span>Relationship Graph</span>
            </button>

            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "timeline"
                  ? "bg-white text-gray-900 shadow-xs font-bold border border-gray-200/80"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Custody Timeline</span>
            </button>
          </div>

          {/* Contextual selector for Graph & Timeline */}
          {(activeTab === "graph" || activeTab === "timeline") && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500 font-medium whitespace-nowrap">Focus Target:</span>
              <select
                value={activeChargeId || ""}
                onChange={(e) => setActiveChargeId(e.target.value)}
                className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs font-mono font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
              >
                {chargesWithEvidence.map((c) => (
                  <option key={c.charge_id} value={c.charge_id}>
                    {c.charge_id} &bull; {c.unit_id || c.shipment_id} (${c.amount?.toFixed(2)} - {c.reason})
                  </option>
                ))}
              </select>
              {activeChargeId && (
                <Link
                  href={`/investigations/${activeChargeId}`}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 text-xs font-medium transition"
                  title="Open investigation detail"
                >
                  <span>Investigate</span>
                  <ArrowUpRight className="w-3 h-3 text-gray-500" />
                </Link>
              )}
            </div>
          )}

          {/* Table / Cards toggle (only visible in records tab) */}
          {activeTab === "records" && (
            <div className="flex items-center space-x-1 border border-gray-200 p-1 rounded-lg bg-gray-50 self-end md:self-auto">
              <button
                onClick={() => setViewLayout("table")}
                className={`p-1.5 rounded text-xs transition ${
                  viewLayout === "table"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/80 font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="Dense table view"
                aria-label="Table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewLayout("cards")}
                className={`p-1.5 rounded text-xs transition ${
                  viewLayout === "cards"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/80 font-bold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
                title="Card grid view"
                aria-label="Card grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Error notification banner if any */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadEvidence}
              className="px-3 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. VIEW CONTENT: RECORDS / GRAPH / TIMELINE                  */}
        {/* ============================================================ */}
        {activeTab === "records" && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-subtle">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by Evidence ID, Unit ID, SKU, or Description..."
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

              {/* Source Filter Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
                {["ALL", "RECEIVING", "PREP", "PACK", "RETURNS"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSourceFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      sourceFilter === f
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
                {sourceFilter !== "ALL" && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 shadow-xs">
                    <span>Source: {sourceFilter}</span>
                    <button
                      onClick={() => setSourceFilter("ALL")}
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

            {/* Loading State */}
            {loading ? (
              viewLayout === "table" ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-subtle">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="py-3 px-4">Evidence ID</th>
                        <th className="py-3 px-4">Source Line</th>
                        <th className="py-3 px-4">Unit / Tracking</th>
                        <th className="py-3 px-4">Connected Charge</th>
                        <th className="py-3 px-4">Finding</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TableSkeletonRows rows={6} cols={7} />
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <EvidenceCardSkeleton key={i} />
                  ))}
                </div>
              )
            ) : filteredEvidence.length === 0 ? (
              /* Empty State */
              <div className="py-16 text-center bg-white rounded-xl border border-gray-200 p-8 shadow-subtle space-y-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto text-gray-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">No operational evidence records found</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  There are no physical logs matching your current search or source filters.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-subtle transition"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : viewLayout === "table" ? (
              /* Table Layout */
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-subtle">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="py-3 px-4">Evidence ID</th>
                        <th className="py-3 px-4">Source Line</th>
                        <th className="py-3 px-4">Unit / Tracking</th>
                        <th className="py-3 px-4">Connected Charge</th>
                        <th className="py-3 px-4">Finding</th>
                        <th className="py-3 px-4">Log Summary</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {filteredEvidence.map((ev) => {
                        const sourceConfig = getSourceBadge(ev.source_type);
                        const findingClass = getFindingBadge(ev.finding);
                        const linkedCharge = getLinkedCharge(ev);

                        return (
                          <tr
                            key={ev.id}
                            className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                            onClick={() => setSelectedRecord(ev)}
                          >
                            {/* Evidence ID */}
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-gray-900 group-hover:text-[#E88A00] transition-colors">
                                {ev.evidence_id}
                              </span>
                            </td>

                            {/* Source Type */}
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${sourceConfig.pill}`}
                              >
                                {sourceConfig.icon}
                                <span>{ev.source_type?.toUpperCase()}</span>
                              </span>
                            </td>

                            {/* Unit ID */}
                            <td className="py-3 px-4">
                              <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                {ev.unit_id || "N/A"}
                              </span>
                            </td>

                            {/* Connected Charge */}
                            <td className="py-3 px-4">
                              {linkedCharge ? (
                                <div className="space-y-0.5">
                                  <Link
                                    href={`/investigations/${linkedCharge.charge_id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-mono font-semibold text-[#E88A00] hover:underline flex items-center space-x-1"
                                    title="Open investigation for linked charge"
                                  >
                                    <span>{linkedCharge.charge_id}</span>
                                    <ArrowUpRight className="w-3 h-3 inline" />
                                  </Link>
                                  <div className="text-[10px] text-gray-500 truncate max-w-[140px]">
                                    ${linkedCharge.amount?.toFixed(2)} &bull; {linkedCharge.reason}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">Unlinked</span>
                              )}
                            </td>

                            {/* Finding */}
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${findingClass}`}
                              >
                                {ev.finding}
                              </span>
                            </td>

                            {/* Log Summary */}
                            <td className="py-3 px-4 max-w-xs">
                              <p className="text-gray-600 line-clamp-1 truncate" title={ev.description}>
                                {ev.description}
                              </p>
                            </td>

                            {/* Timestamp */}
                            <td className="py-3 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                              {ev.timestamp || "Pre-shipment"}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div
                                className="flex items-center justify-end space-x-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => setSelectedRecord(ev)}
                                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition"
                                  title="Inspect details"
                                  aria-label="Inspect details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => inspectInGraph(ev)}
                                  className="p-1.5 text-gray-500 hover:text-[#FF9900] hover:bg-[#FFF9F2] rounded transition"
                                  title="View in relationship graph"
                                  aria-label="View in graph"
                                >
                                  <Network className="w-4 h-4" />
                                </button>
                                {linkedCharge && (
                                  <Link
                                    href={`/investigations/${linkedCharge.charge_id}`}
                                    className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                                    title="Open investigation"
                                    aria-label="Open investigation"
                                  >
                                    <ArrowUpRight className="w-4 h-4" />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Grid Layout */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvidence.map((ev) => {
                  const sourceConfig = getSourceBadge(ev.source_type);
                  const findingClass = getFindingBadge(ev.finding);
                  const linkedCharge = getLinkedCharge(ev);

                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedRecord(ev)}
                      className="p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-subtle cursor-pointer transition-all duration-150 space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${sourceConfig.pill}`}
                          >
                            {sourceConfig.icon}
                            <span>{ev.source_type?.toUpperCase()}</span>
                          </span>
                          <h4 className="font-mono font-bold text-xs text-gray-900 mt-1.5">
                            {ev.evidence_id}
                          </h4>
                        </div>
                        <span
                          className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded border ${findingClass}`}
                        >
                          {ev.finding}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 line-clamp-2 leading-relaxed min-h-[36px]">
                        {ev.description}
                      </div>

                      {/* Connected Charge Strip if linked */}
                      {linkedCharge && (
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono">
                          <span className="text-gray-400">Charge:</span>
                          <span className="text-[#E88A00] font-semibold">{linkedCharge.charge_id}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-500">
                        <span className="text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                          {ev.unit_id || "N/A"}
                        </span>
                        <span>{ev.timestamp || "Pre-shipment"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. VIEW CONTENT: RELATIONSHIP GRAPH                          */}
        {/* ============================================================ */}
        {activeTab === "graph" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Target Fee: <span className="font-mono text-[#E88A00]">{activeChargeId || "None Selected"}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualizing multi-hop traversal from assessed channel fee through physical custody to operational logs.
                </p>
              </div>

              {activeChargeId && (
                <Link
                  href={`/investigations/${activeChargeId}`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#FF9900] hover:bg-[#E88A00] text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Open Full Investigation</span>
                </Link>
              )}
            </div>

            {graphLoading ? (
              <div className="p-12 text-center bg-white rounded-xl border border-gray-200 text-gray-500 text-xs shadow-subtle space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#FF9900]" />
                <div>Computing multi-hop evidence relationships...</div>
              </div>
            ) : (
              <EvidenceGraph graphData={graphData} />
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 6. VIEW CONTENT: CUSTODY TIMELINE                            */}
        {/* ============================================================ */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Chronological Progression: <span className="font-mono text-sky-700">{activeChargeId || "None Selected"}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Chronological inspection checkpoints demonstrating unbroken chain of custody prior to deduction.
                </p>
              </div>

              {activeChargeId && (
                <Link
                  href={`/investigations/${activeChargeId}`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-500" />
                  <span>View Investigation</span>
                </Link>
              )}
            </div>

            {graphLoading ? (
              <div className="p-12 text-center bg-white rounded-xl border border-gray-200 text-gray-500 text-xs shadow-subtle space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-600" />
                <div>Loading chronological event stream...</div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-subtle">
                <EvidenceTimeline timeline={timelineData} />
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. EVIDENCE INTELLIGENCE DETAIL MODAL                        */}
        {/* ============================================================ */}
        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedRecord(null)}
          >
            <div
              className="bg-white w-full max-w-xl rounded-2xl border border-gray-200 shadow-modal p-6 relative space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="evidence-detail-modal-title"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        getSourceBadge(selectedRecord.source_type).pill
                      }`}
                    >
                      {getSourceBadge(selectedRecord.source_type).icon}
                      <span>{selectedRecord.source_type?.toUpperCase()} EVIDENCE</span>
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getFindingBadge(
                        selectedRecord.finding
                      )}`}
                    >
                      {selectedRecord.finding}
                    </span>
                  </div>
                  <h3 id="evidence-detail-modal-title" className="text-base font-bold text-gray-900 font-mono mt-1">
                    {selectedRecord.evidence_id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Provenance Chain Path */}
              {(() => {
                const linkedCharge = getLinkedCharge(selectedRecord);
                return (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      Provenance Proof Path
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                      <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                        {selectedRecord.source_type?.toUpperCase()}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="px-2 py-0.5 bg-[#FFF9F2] border border-[#FF9900]/40 rounded font-bold text-[#E88A00]">
                        {selectedRecord.evidence_id}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                        {selectedRecord.unit_id || "Unit Unspecified"}
                      </span>
                      {linkedCharge && (
                        <>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <Link
                            href={`/investigations/${linkedCharge.charge_id}`}
                            className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold hover:underline flex items-center space-x-1"
                          >
                            <span>{linkedCharge.charge_id}</span>
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Operational Log Description */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1">
                <div className="font-semibold text-gray-900">Operational Log Description:</div>
                <p className="text-gray-700 leading-relaxed">{selectedRecord.description}</p>
              </div>

              {/* Core Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Unit / Tracking ID</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5 truncate">
                    {selectedRecord.unit_id || "N/A"}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Shipment / PO</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5 truncate">
                    {selectedRecord.shipment_id || "N/A"}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Order Reference</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5 truncate">
                    {selectedRecord.order_id || "N/A"}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Catalog SKU</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5 truncate">
                    {selectedRecord.sku || "N/A"}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Operator / Station</div>
                  <div className="font-mono font-bold text-gray-900 mt-0.5 truncate">
                    {selectedRecord.operator_id || "automated_audit"}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Recorded At</div>
                  <div className="font-mono font-semibold text-gray-900 mt-0.5 truncate">
                    {selectedRecord.timestamp || "Pre-shipment"}
                  </div>
                </div>
              </div>

              {/* Photo attachments if present */}
              {selectedRecord.photo_refs && (
                <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1.5">
                  <div className="text-[11px] font-semibold text-gray-700 flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-gray-500" />
                    <span>Physical Proof Citations</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecord.photo_refs.split(";").map((ref, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[11px] font-mono text-gray-700 flex items-center space-x-1"
                      >
                        <Camera className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[200px]">{ref.split("/").pop()}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Charge Card if linked */}
              {(() => {
                const linkedCharge = getLinkedCharge(selectedRecord);
                if (!linkedCharge) return null;
                return (
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Receipt className="w-4 h-4 text-amber-700" />
                        <span className="text-xs font-bold text-gray-900">
                          Connected Financial Deduction:
                        </span>
                        <span className="font-mono font-bold text-[#E88A00]">
                          {linkedCharge.charge_id}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-gray-900">
                        ${linkedCharge.amount?.toFixed(2)} USD
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Reason: <strong className="capitalize">{linkedCharge.reason.replace(/_/g, " ")}</strong> &bull; Assessment: <strong className="text-emerald-700">{linkedCharge.assessment || "UNASSESSED"}</strong>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <Link
                        href={`/investigations/${linkedCharge.charge_id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#FF9900] hover:bg-[#E88A00] text-white rounded-lg text-xs font-semibold shadow-xs transition"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Inspect Charge Dossier</span>
                      </Link>
                      <button
                        onClick={() => inspectInGraph(selectedRecord)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition"
                      >
                        <Network className="w-3.5 h-3.5 text-[#FF9900]" />
                        <span>View Graph</span>
                      </button>
                      <button
                        onClick={() => inspectInTimeline(selectedRecord)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition"
                      >
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>View Timeline</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Raw JSON Payload (collapsible) */}
              <div>
                <button
                  onClick={() => setExpandedJson(!expandedJson)}
                  className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 flex items-center space-x-1 py-1"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                      expandedJson ? "rotate-90" : ""
                    }`}
                  />
                  <span>Raw Stored Metadata {expandedJson ? "(Click to Collapse)" : "(Click to Expand)"}</span>
                </button>
                {expandedJson && (
                  <pre className="p-3 rounded-xl bg-gray-50 text-[10px] font-mono text-gray-700 max-h-48 overflow-y-auto mt-1 border border-gray-200 leading-normal">
                    {JSON.stringify(selectedRecord.raw_payload || {}, null, 2)}
                  </pre>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => inspectInGraph(selectedRecord)}
                    className="inline-flex items-center space-x-1 text-xs text-gray-600 hover:text-[#E88A00] font-medium"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Open in Graph</span>
                  </button>
                  <span className="text-gray-300">&bull;</span>
                  <button
                    onClick={() => inspectInTimeline(selectedRecord)}
                    className="inline-flex items-center space-x-1 text-xs text-gray-600 hover:text-sky-700 font-medium"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Open in Timeline</span>
                  </button>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
