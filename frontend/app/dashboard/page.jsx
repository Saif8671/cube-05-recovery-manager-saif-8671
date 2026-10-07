"use client";
import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  DollarSign,
  ShieldCheck,
  FileQuestion,
  ArrowUpRight,
  TrendingUp,
  ExternalLink,
  Shield,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import { MetricCardSkeleton, TableSkeletonRows } from "../../components/LoadingSkeleton";

// Helper to extract clean verdict display name (e.g. "Contradicted" from "Contradicted (Recoverable)")
const cleanVerdictName = (name) => {
  if (!name) return "";
  return name.replace(/\s*\([^)]*\)/g, "").trim();
};

// Helper to wrap long category labels into two lines cleanly
const splitCategoryLabel = (label, maxLength = 16) => {
  if (!label) return ["", ""];
  if (label.includes(" / ")) {
    const parts = label.split(" / ");
    return [parts[0] + " /", parts.slice(1).join(" / ")];
  }
  if (label.includes("/")) {
    const parts = label.split("/");
    return [parts[0] + " /", parts.slice(1).join("/")];
  }
  if (label.length <= maxLength) {
    return [label, ""];
  }
  const words = label.split(" ");
  if (words.length <= 1) {
    return [label, ""];
  }
  let bestIdx = 1;
  let bestDiff = Infinity;
  const target = label.length / 2;
  let currentLen = 0;
  for (let i = 0; i < words.length - 1; i++) {
    currentLen += words[i].length + (i > 0 ? 1 : 0);
    const diff = Math.abs(currentLen - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i + 1;
    }
  }
  return [words.slice(0, bestIdx).join(" "), words.slice(bestIdx).join(" ")];
};

// Custom YAxis tick component for category chart with clean multi-line wrapping
const CategoryYAxisTick = ({ x, y, payload }) => {
  const text = String(payload?.value || "");
  const [line1, line2] = splitCategoryLabel(text, 16);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        textAnchor="end"
        fill="#374151"
        fontSize={11}
        fontWeight={500}
      >
        {line2 ? (
          <>
            <tspan x={-8} dy="-0.45em">{line1}</tspan>
            <tspan x={-8} dy="1.15em">{line2}</tspan>
          </>
        ) : (
          <tspan x={-8} dy="0.32em">{line1}</tspan>
        )}
      </text>
    </g>
  );
};

// Custom light-theme tooltips for Recharts
const CustomVerdictTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const item = data.payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-elevated p-2.5 text-xs text-gray-900 min-w-[130px]">
        <div className="flex items-center space-x-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-subtle"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-semibold text-gray-900">
            {item.displayName || data.name}
          </span>
        </div>
        <div className="text-gray-600 mt-1.5 flex items-center justify-between font-mono">
          <span className="text-[11px] text-gray-500">Verdicts:</span>
          <span className="font-bold text-gray-900">{data.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomCategoryTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-elevated p-2.5 text-xs text-gray-900 min-w-[140px]">
        <div className="font-semibold text-gray-900">{label || data.name}</div>
        <div className="text-gray-600 mt-1.5 flex items-center justify-between font-mono">
          <span className="text-[11px] text-gray-500">Deductions:</span>
          <span className="font-bold text-[#FF9900]">{data.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { currentCompany } = useWorkspace();
  const [metrics, setMetrics] = useState(null);
  const [recentCharges, setRecentCharges] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, c] = await Promise.all([
        api.getDashboardSummary(currentCompany),
        api.getCharges(currentCompany, { limit: 6 }),
      ]);
      setMetrics(m);
      setRecentCharges(c);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  // Financial currency formatting helper
  const formatAmount = (amt) => {
    if (amt === undefined || amt === null) return "$0.00";
    if (amt < 0) return `-$${Math.abs(amt).toFixed(2)}`;
    return `$${amt.toFixed(2)}`;
  };

  // Enterprise semantic status token styling
  const getBadgeClass = (assessment) => {
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

  // Aggregate verdict total for header display
  const totalVerdicts = metrics?.status_distribution?.reduce(
    (acc, curr) => acc + (curr.value || 0),
    0
  );

  // Ranked verdicts descending by count
  const sortedVerdicts = React.useMemo(() => {
    if (!metrics?.status_distribution) return [];
    return [...metrics.status_distribution]
      .map((item) => ({
        ...item,
        displayName: cleanVerdictName(item.name),
        value: item.value || 0,
        color: item.color || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [metrics?.status_distribution]);

  // Ranked categories descending by count
  const sortedCategories = React.useMemo(() => {
    if (!metrics?.charge_type_distribution) return [];
    return [...metrics.charge_type_distribution]
      .map((item) => ({
        ...item,
        count: item.count || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [metrics?.charge_type_distribution]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={loadData} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 w-full max-w-7xl mx-auto page-enter">
        {/* ============================================================ */}
        {/* 1. HERO PAGE HEADER                                          */}
        {/* ============================================================ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Forensic Engine Online</span>
              </span>
              <span className="text-gray-300">&bull;</span>
              <span className="text-[11px] font-mono text-gray-500 flex items-center space-x-1">
                <Shield className="w-3 h-3 text-emerald-600 inline mr-0.5" />
                <span>Audit Trail:</span>
                <span className="text-gray-900 font-semibold">Active RLS</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-sans">
              Recovery Operations Center
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
              Forensic operational evidence matching against channel fee deductions.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href="/recovery"
              className="btn-primary group relative overflow-hidden"
            >
              <span>View Recoverable Claims</span>
              <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. FINANCIAL RECOVERY INTELLIGENCE (KPI DECK)                */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2 text-[11px] uppercase tracking-wider font-bold text-gray-500 font-mono">
              <Activity className="w-3.5 h-3.5 text-[#FF9900]" />
              <span>Financial Recovery Intelligence</span>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              Live Ledger Status
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                {/* CARD 1: Total Deductions Assessed */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-subtle hover:border-gray-300 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                        Total Deductions Assessed
                      </span>
                      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 font-sans tabular-nums tracking-tight pt-1">
                        ${metrics?.total_fees?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 group-hover:text-gray-900 group-hover:border-gray-300 transition-colors">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs text-gray-500">
                    <span>
                      Across <strong className="font-semibold text-gray-900 font-mono">{metrics?.total_charges_count || 0}</strong> financial line items
                    </span>
                  </div>
                </div>

                {/* CARD 2: Defensible Recovery Pipeline (Hero Card with Amazon Accent) */}
                <div className="bg-white border-2 border-[#FF9900] rounded-xl p-5 shadow-subtle hover:shadow-elevated transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-bold text-[#E88A00] tracking-wide uppercase">
                          Defensible Recovery Pipeline
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900] animate-pulse" />
                      </div>
                      <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 font-sans tabular-nums tracking-tight pt-1">
                        ${metrics?.potential_recovery?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF9900] group-hover:scale-105 transition-transform shadow-subtle">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-orange-100 flex items-center text-xs text-gray-700 font-medium">
                    <span>
                      <strong className="font-bold text-gray-900 font-mono">{metrics?.contradicted_count || 0}</strong> charges contradicted by proof
                    </span>
                  </div>
                </div>

                {/* CARD 3: Claim Precision Rate */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-subtle hover:border-gray-300 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                        Claim Precision Rate
                      </span>
                      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 font-sans tabular-nums tracking-tight pt-1">
                        {metrics?.claim_precision_rate || 100}%
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs text-gray-500">
                    <span>Zero ungrounded disputes submitted</span>
                  </div>
                </div>

                {/* CARD 4: Conservative Skips */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-subtle hover:border-gray-300 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                        Conservative Skips
                      </span>
                      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 font-sans tabular-nums tracking-tight pt-1">
                        {(metrics?.silent_count || 0) + (metrics?.uncertain_count || 0)}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                      <FileQuestion className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs text-gray-500 font-mono">
                    <span>
                      <strong className="text-gray-700">{metrics?.silent_count || 0}</strong> Silent &bull;{" "}
                      <strong className="text-amber-600 font-semibold">{metrics?.uncertain_count || 0}</strong> Uncertain
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. FORENSIC ANALYTICS GRID (VERDICT & CATEGORY RANKED BARS)  */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CHART 1: Assessment Verdicts (Horizontal Ranked Bar Chart) */}
          <div
            className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-subtle flex flex-col justify-between"
            role="region"
            aria-label="Evidence Assessment Verdicts"
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Evidence Assessment Verdicts
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Distribution of forensic match verdicts across all processed deductions.
                </p>
              </div>
              {totalVerdicts !== undefined && (
                <span className="text-[11px] font-mono text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 font-semibold shrink-0">
                  {totalVerdicts} Audited
                </span>
              )}
            </div>

            <div className="py-4 h-[320px] w-full flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center space-y-3 text-gray-400">
                  <div className="w-8 h-8 border-2 border-orange-200 border-t-[#FF9900] rounded-full animate-spin" />
                  <span className="text-xs font-mono">Synthesizing verdicts...</span>
                </div>
              ) : sortedVerdicts.length > 0 && totalVerdicts > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedVerdicts}
                    layout="vertical"
                    margin={{ top: 8, right: 35, left: 10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#9CA3AF"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                      allowDecimals={false}
                      domain={[0, (dataMax) => Math.max(1, Math.ceil((dataMax || 0) * 1.15))]}
                    />
                    <YAxis
                      dataKey="displayName"
                      type="category"
                      stroke="#374151"
                      tick={{ fill: "#374151", fontSize: 12, fontWeight: 500 }}
                      width={125}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                      interval={0}
                    />
                    <Tooltip content={<CustomVerdictTooltip />} cursor={{ fill: "#F9FAFB" }} />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      animationDuration={800}
                      barSize={20}
                    >
                      {sortedVerdicts.map((entry, index) => (
                        <Cell key={`verdict-cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        offset={8}
                        fill="#111827"
                        fontSize={12}
                        fontWeight={600}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                  <FileQuestion className="w-8 h-8 text-gray-300" />
                  <span className="text-xs font-medium text-gray-500">
                    No assessment verdicts available
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CHART 2: Deductions by Category (Horizontal Ranked Bar Chart) */}
          <div
            className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-subtle flex flex-col justify-between"
            role="region"
            aria-label="Deductions by Category"
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Deductions by Category
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Top marketplace fee categories assessed for this seller.
                </p>
              </div>
              <span className="text-[11px] font-mono text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 font-semibold shrink-0">
                {metrics?.charge_type_distribution?.length || 0} Categories
              </span>
            </div>

            <div className="py-4 h-[320px] w-full flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center space-y-3 text-gray-400">
                  <div className="w-8 h-8 border-2 border-orange-200 border-t-[#FF9900] rounded-full animate-spin" />
                  <span className="text-xs font-mono">Aggregating categories...</span>
                </div>
              ) : sortedCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedCategories}
                    layout="vertical"
                    margin={{ top: 8, right: 35, left: 10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#9CA3AF"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                      allowDecimals={false}
                      domain={[0, (dataMax) => Math.max(1, Math.ceil((dataMax || 0) * 1.15))]}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#374151"
                      width={135}
                      tickLine={false}
                      axisLine={{ stroke: "#E5E7EB" }}
                      interval={0}
                      tick={<CategoryYAxisTick />}
                    />
                    <Tooltip content={<CustomCategoryTooltip />} cursor={{ fill: "#F9FAFB" }} />
                    <Bar
                      dataKey="count"
                      fill="#FF9900"
                      radius={[0, 4, 4, 0]}
                      animationDuration={800}
                      barSize={16}
                    >
                      <LabelList
                        dataKey="count"
                        position="right"
                        offset={8}
                        fill="#111827"
                        fontSize={11}
                        fontWeight={600}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-gray-400">
                  <FileQuestion className="w-8 h-8 text-gray-300" />
                  <span className="text-xs font-medium text-gray-500">
                    No deduction categories available
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. RECENT FINANCIAL DEDUCTIONS (HERO FORENSIC TABLE)         */}
        {/* ============================================================ */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-subtle">
          <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Recent Financial Deductions
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click any row to open the complete forensic investigation.
              </p>
            </div>
            <Link
              href="/charges"
              className="text-xs text-gray-800 hover:text-gray-900 font-semibold flex items-center space-x-1.5 transition-colors self-start sm:self-center bg-gray-50 hover:bg-gray-100 border border-gray-300 px-3 py-1.5 rounded-lg group shadow-subtle"
            >
              <span>Explore All Charges</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider font-semibold border-b border-gray-200 text-[11px] font-mono">
                <tr>
                  <th className="py-3.5 px-5">Charge ID</th>
                  <th className="py-3.5 px-5">Unit / Shipment</th>
                  <th className="py-3.5 px-5">Deduction Reason</th>
                  <th className="py-3.5 px-5 text-right">Fee Amount</th>
                  <th className="py-3.5 px-5">Forensic Assessment</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <TableSkeletonRows rows={5} cols={6} />
                ) : recentCharges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-400">
                      No deductions recorded for this workspace yet.
                    </td>
                  </tr>
                ) : (
                  recentCharges.map((c) => {
                    const badge = getBadgeClass(c.assessment);
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="py-4 px-5 font-mono font-medium text-gray-900">
                          <span className="bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-[11px] text-gray-800 font-semibold group-hover:border-gray-300 transition-colors">
                            {c.charge_id}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-mono text-gray-900 font-semibold text-xs">
                            {c.unit_id || "N/A"}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                            {c.shipment_id || c.order_id || ""}
                          </div>
                        </td>
                        <td className="py-4 px-5 capitalize font-medium text-gray-800">
                          {c.reason.replace(/_/g, " ")}
                        </td>
                        <td className="py-4 px-5 text-right font-sans font-bold text-gray-900 tabular-nums text-xs">
                          {formatAmount(c.amount)}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{c.assessment}</span>
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
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
