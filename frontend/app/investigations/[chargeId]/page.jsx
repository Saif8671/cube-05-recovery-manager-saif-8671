"use client";
import React, { useState, useEffect } from "react";
import Navbar from "../../../components/Navbar";
import { useWorkspace } from "../../../context/WorkspaceContext";
import { api } from "../../../lib/api";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Receipt,
  FileCheck2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Layers,
  Clock,
  Network,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  FolderSync,
} from "lucide-react";
import EvidenceTimeline from "../../../components/EvidenceTimeline";
import EvidenceGraph from "../../../components/EvidenceGraph";
import WhyNotClaimModal from "../../../components/WhyNotClaimModal";
import ClaimPackageModal from "../../../components/ClaimPackageModal";

export default function InvestigationDetailPage({ params }) {
  const { chargeId } = params;
  const { currentCompany } = useWorkspace();
  const [charge, setCharge] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline"); // "timeline" or "graph"

  // Modals
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [activeClaim, setActiveClaim] = useState(null);
  const [generatingClaim, setGeneratingClaim] = useState(false);

  const loadInvestigation = async () => {
    try {
      setLoading(true);
      const [cData, invData, gData] = await Promise.all([
        api.getChargeDetail(chargeId, currentCompany),
        api.getInvestigation(chargeId, currentCompany),
        api.getEvidenceGraph(chargeId, currentCompany),
      ]);
      setCharge(cData);
      setInvestigation(invData);
      setGraphData(gData);

      if (cData?.status === "CLAIMED") {
        try {
          const claims = await api.getClaims(currentCompany);
          const found = claims.find((cl) => cl.charge_id === chargeId);
          if (found) setActiveClaim(found);
        } catch (e) {
          console.error("Failed to preload existing claim:", e);
        }
      }
    } catch (err) {
      console.error("Failed to load investigation:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestigation();
  }, [chargeId, currentCompany]);

  const handleGenerateClaim = async () => {
    try {
      setGeneratingClaim(true);
      const claim = await api.createClaim(currentCompany, chargeId);
      setActiveClaim(claim);
      setClaimModalOpen(true);
      // Reload charge to reflect claimed status
      loadInvestigation();
    } catch (err) {
      alert(`Claim generation failed: ${err.message}`);
    } finally {
      setGeneratingClaim(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
        <Navbar />
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full page-enter">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center space-x-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-3 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Hero Card Skeleton */}
          <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center space-x-3">
                <div className="h-6 w-28 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-8 w-64 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
            </div>

            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="space-y-2">
                <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Metadata Grid Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-subtle">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 p-2">
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!charge) {
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
        <Navbar />
        <main className="p-8 max-w-2xl mx-auto w-full text-center space-y-4 pt-20">
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto text-gray-400 shadow-subtle">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Charge Not Found</h2>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            Charge <strong className="font-mono text-gray-800">{chargeId}</strong> was not found in the current company workspace.
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <Link
              href="/investigations"
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-subtle transition"
            >
              Back to Investigation Queue
            </Link>
            <Link
              href="/charges"
              className="px-4 py-2 bg-[#FF9900] hover:bg-[#E88A00] text-white rounded-lg text-xs font-semibold shadow-subtle transition"
            >
              Browse Charges Explorer
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Assessment styling
  const assessment = investigation?.assessment || "UNINVESTIGATED";
  const getBadgeConfig = (ass) => {
    switch (ass) {
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
          pill: "bg-gray-100 text-gray-700 border-gray-200",
          dot: "bg-gray-400",
        };
    }
  };

  const badge = getBadgeConfig(assessment);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={loadInvestigation} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full page-enter">
        {/* ============================================================ */}
        {/* 1. BREADCRUMB & NAVIGATION                                   */}
        {/* ============================================================ */}
        <div className="flex items-center space-x-2 text-xs text-gray-500 pb-2">
          <Link
            href="/investigations"
            className="hover:text-gray-900 flex items-center space-x-1.5 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Investigation Queue</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <Link
            href="/charges"
            className="hover:text-gray-900 transition-colors"
          >
            Charges
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-gray-900 font-mono font-bold">{charge.charge_id}</span>
        </div>

        {/* ============================================================ */}
        {/* 2. HERO ASSESSMENT & CLAIM ACTION CARD                       */}
        {/* ============================================================ */}
        <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.pill}`}
              >
                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                <span>{assessment}</span>
              </span>
              <span className="text-xs text-gray-700 font-mono bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200 font-semibold">
                {charge.charge_id}
              </span>
              <span className="text-xs text-gray-500">
                &bull; Posted: {charge.charge_date || "N/A"}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 capitalize font-sans">
              {charge.reason ? charge.reason.replace(/_/g, " ") : "Unknown Deduction"}
            </h1>

            <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
              Forensic multi-hop audit of channel fee deduction evaluated against physical checkpoint evidence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 self-stretch md:self-auto">
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Potential Recovery
              </div>
              <div className="text-2xl font-bold font-sans text-emerald-700 tabular-nums">
                ${investigation?.claim_amount?.toFixed(2) || "0.00"} {charge.currency}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Fee Documented: ${(charge.amount || 0).toFixed(2)}
              </div>
            </div>

            {investigation?.claim_supported ? (
              <button
                onClick={handleGenerateClaim}
                disabled={generatingClaim}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#FF9900] hover:bg-[#E88A00] text-white font-semibold text-xs rounded-lg shadow-xs transition whitespace-nowrap self-stretch sm:self-auto justify-center"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>
                  {generatingClaim
                    ? "Assembling Dossier..."
                    : charge?.status === "CLAIMED" || activeClaim
                    ? "View Claim Dossier"
                    : "Generate Claim Package"}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setWhyModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs border border-amber-200 shadow-xs transition self-stretch sm:self-auto justify-center"
              >
                <HelpCircle className="w-4 h-4 text-amber-700" />
                <span>Why Not Claim?</span>
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. CHARGE FACTS GRID                                         */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-4 rounded-xl border border-gray-200 shadow-subtle">
          <div className="p-2">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">
              Unit ID
            </span>
            <div className="font-mono text-gray-900 mt-1 font-semibold truncate">
              {charge.unit_id || "Unspecified"}
            </div>
          </div>
          <div className="p-2">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">
              FBA Shipment
            </span>
            <div className="font-mono text-gray-900 mt-1 font-semibold truncate">
              {charge.shipment_id || "N/A"}
            </div>
          </div>
          <div className="p-2">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">
              Order ID
            </span>
            <div className="font-mono text-gray-900 mt-1 font-semibold truncate">
              {charge.order_id || "N/A"}
            </div>
          </div>
          <div className="p-2">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] font-bold">
              Catalog SKU
            </span>
            <div className="font-mono text-gray-900 mt-1 font-semibold truncate">
              {charge.sku || "N/A"}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. AGENT FORENSIC REASONING CARD                             */}
        {/* ============================================================ */}
        <div className="p-5 rounded-xl bg-white border border-gray-200 space-y-2 shadow-subtle">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-gray-900">Forensic Evidence Reasoning</span>
          </div>

          <p className="text-xs text-gray-700 leading-relaxed pt-1 font-sans">
            {investigation?.reasoning || "Investigation pending analysis."}
          </p>

          {investigation?.unsupported_reason && (
            <div className="text-[11px] text-amber-900 font-mono mt-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-800">Conservative Refusal Rationale:</span>{" "}
              {investigation.unsupported_reason}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 5. TAB SWITCHER: TIMELINE VS GRAPH                           */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center p-1 bg-white border border-gray-200 rounded-lg space-x-1 shadow-subtle">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "timeline"
                  ? "bg-gray-100 text-gray-900 shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Operational Evidence Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "graph"
                  ? "bg-gray-100 text-gray-900 shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Network className="w-3.5 h-3.5 text-[#FF9900]" />
              <span>Interactive Evidence Graph</span>
            </button>
          </div>

          <Link
            href="/evidence"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs text-gray-500 hover:text-[#E88A00] font-medium transition"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Open in Evidence Workspace</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* ============================================================ */}
        {/* 6. TAB CONTENT VIEWS                                         */}
        {/* ============================================================ */}
        {activeTab === "timeline" ? (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-subtle">
              <EvidenceTimeline timeline={investigation?.timeline} />
            </div>

            {/* Forensic Relevance Breakdown (What Evidence Proves vs Cannot Prove) */}
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-subtle">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                    Forensic Relevance Breakdown (What Evidence Proves vs Cannot Prove)
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Itemized proof boundaries evaluated for each physical checkpoint log.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-gray-500 self-start sm:self-auto">
                  {investigation?.evidence_items?.length || 0} citations
                </span>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {!investigation?.evidence_items || investigation.evidence_items.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No operational evidence items found for this charge.
                  </div>
                ) : (
                  investigation.evidence_items.map((item, idx) => (
                    <div key={idx} className="p-4 space-y-2 hover:bg-gray-50/60 transition-colors">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="font-mono font-bold text-gray-900 flex items-center space-x-2">
                          <span className="text-[#E88A00]">{item.evidence_id}</span>
                          <span className="text-gray-300">&bull;</span>
                          <span className="uppercase text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                            {item.source_type}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-semibold font-mono border ${
                            item.finding === "PASS"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.finding === "FAIL"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          Finding: {item.finding}
                        </span>
                      </div>

                      <div className="text-gray-700 text-xs leading-relaxed bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100">
                        <span className="font-semibold text-emerald-800">Establishes: </span>
                        {item.establishes}
                      </div>

                      <div className="text-gray-600 text-xs leading-relaxed bg-amber-50/40 p-2.5 rounded-lg border border-amber-100">
                        <span className="font-semibold text-amber-800">Does NOT Establish: </span>
                        {item.does_not_establish}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <EvidenceGraph graphData={graphData} />
        )}

        {/* Modals */}
        <WhyNotClaimModal
          isOpen={whyModalOpen}
          onClose={() => setWhyModalOpen(false)}
          investigation={investigation}
          charge={charge}
        />

        <ClaimPackageModal
          isOpen={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          claim={activeClaim}
        />
      </main>
    </div>
  );
}
