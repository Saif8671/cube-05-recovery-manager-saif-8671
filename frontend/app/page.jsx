"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import {
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  Receipt,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Layers,
  Database,
  Search,
  Check,
  FileText,
  AlertTriangle,
  Lock,
  Boxes,
  Menu,
  X,
  PackageCheck,
  RotateCcw,
  Sparkles,
  GitCommit,
  Clock,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeVerdict, setActiveVerdict] = useState("CONTRADICTED");

  // Multi-tenant workspace context (preserving existing tenant logic)
  const { currentCompany, currentCompanyName } = useWorkspace() || {};

  // Live Operations Snapshot state (sourced from database ledger if available, else neutral state)
  const [snapshot, setSnapshot] = useState({
    totalFees: null,
    totalChargesCount: null,
    potentialRecovery: null,
    contradictedCount: null,
    claimsCount: null,
    loading: true,
  });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch actual application data for live operations snapshot without inventing numbers
  useEffect(() => {
    let isMounted = true;

    async function loadSnapshotData() {
      try {
        const companyId = currentCompany || "org_demo_alpha";
        const [summaryRes, claimsRes] = await Promise.allSettled([
          api.getDashboardSummary(companyId),
          api.getClaims(companyId),
        ]);

        if (!isMounted) return;

        let totalFees = null;
        let totalChargesCount = null;
        let potentialRecovery = null;
        let contradictedCount = null;
        let claimsCount = null;

        if (summaryRes.status === "fulfilled" && summaryRes.value) {
          const s = summaryRes.value;
          if (typeof s.total_fees === "number") totalFees = s.total_fees;
          if (typeof s.total_charges_count === "number") totalChargesCount = s.total_charges_count;
          if (typeof s.potential_recovery === "number") potentialRecovery = s.potential_recovery;
          if (typeof s.contradicted_count === "number") contradictedCount = s.contradicted_count;
        }

        if (claimsRes.status === "fulfilled" && Array.isArray(claimsRes.value)) {
          claimsCount = claimsRes.value.length;
        }

        setSnapshot({
          totalFees,
          totalChargesCount,
          potentialRecovery,
          contradictedCount,
          claimsCount,
          loading: false,
        });
      } catch (err) {
        console.error("Live operations snapshot fetch error:", err);
        if (isMounted) {
          setSnapshot((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    loadSnapshotData();
    return () => {
      isMounted = false;
    };
  }, [currentCompany]);

  // Four assessment outcomes specification
  const outcomesData = {
    CONTRADICTED: {
      key: "CONTRADICTED",
      badge: "DISPUTE ELIGIBLE",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      dotClass: "bg-emerald-600",
      activeRing: "ring-2 ring-emerald-500 border-emerald-500",
      title: "Physical evidence contradicts the fee",
      description:
        "Warehouse or operational records provide evidence that conflicts with the marketplace's stated defect or deduction reason.",
      footer:
        "Action: Claim can be created with linked evidence and supporting rationale.",
      sampleDeduction: {
        type: "Inbound Defect Penalty",
        fee: "$38.00 USD",
        reason: "Alleged missing barcode and suffocation warning label on polybag",
      },
      sampleEvidence: {
        type: "Prep Line Optical Inspection",
        recordId: "PRP-TC07",
        finding: "High-resolution prep scan confirms compliant 1.5 mil polybag with scannable FNSKU and certified suffocation warning pre-handoff.",
      },
      sampleAction:
        "Claim prepared for review with attached pre-shipment compliance scan and deterministic audit rationale.",
    },
    SUPPORTED: {
      key: "SUPPORTED",
      badge: "FEE VALID",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
      dotClass: "bg-rose-600",
      activeRing: "ring-2 ring-rose-500 border-rose-500",
      title: "Evidence supports the fee",
      description:
        "Available operational records substantiate that the reported defect or violation occurred.",
      footer:
        "Action: No dispute is generated; the non-claim rationale is preserved in the audit trail.",
      sampleDeduction: {
        type: "Carton Overhang Surcharge",
        fee: "$24.50 USD",
        reason: "Carton dimensions exceeded standard tier pallet overhang limits",
      },
      sampleEvidence: {
        type: "Receiving Dock Pallet Dimension Log",
        recordId: "RCV-DIM-019",
        finding: "Outbound staging scan confirms pallet dimension measured 49.2 inches wide (standard threshold is 48.0 inches).",
      },
      sampleAction:
        "No dispute created. The fee is marked valid and preserved in the audit trail to prevent ungrounded dispute filings.",
    },
    SILENT: {
      key: "SILENT",
      badge: "UNSUBSTANTIATED",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
      dotClass: "bg-amber-600",
      activeRing: "ring-2 ring-amber-500 border-amber-500",
      title: "No corroborating evidence found",
      description:
        "No relevant warehouse or operational evidence was found for the charge, shipment, unit, or SKU.",
      footer:
        "Action: No claim generated; the case remains documented as unsubstantiated.",
      sampleDeduction: {
        type: "Unplanned Prep Service Fee",
        fee: "$19.00 USD",
        reason: "Marketplace applied automated polybagging without operational documentation",
      },
      sampleEvidence: {
        type: "Multi-Hop Evidence Search",
        recordId: "SRCH-NO-HIT",
        finding: "Zero pre-shipment prep logs, packing bench photos, or dimension scans exist for unit SKU-ALPHA-82.",
      },
      sampleAction:
        "Conservative skip. Zero speculative claims are generated. Case is cataloged with full non-claim rationale.",
    },
    UNCERTAIN: {
      key: "UNCERTAIN",
      badge: "HUMAN REVIEW",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-300",
      dotClass: "bg-blue-600",
      activeRing: "ring-2 ring-blue-500 border-blue-500",
      title: "Evidence is conflicting or ambiguous",
      description:
        "Available records provide conflicting signals or insufficient certainty to support a defensible automated decision.",
      footer:
        "Action: Route for human review instead of generating an unsupported dispute.",
      sampleDeduction: {
        type: "Inbound Quantity Discrepancy",
        fee: "$65.00 USD",
        reason: "Discrepancy reported: 48 units manifest vs. 46 units checked in",
      },
      sampleEvidence: {
        type: "Warehouse Inbound Scan vs. Carrier BOL",
        recordId: "BOL-REV-551",
        finding: "Pack bench scan recorded 48 units dispatched. Carrier receipt records 47 cartons at transfer point.",
      },
      sampleAction:
        "Ambiguous evidence threshold. Routed to human operations queue for investigation rather than filing an unverified claim.",
    },
  };

  const activeData = outcomesData[activeVerdict] || outcomesData.CONTRADICTED;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827] font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
      {/* ============================================================ */}
      {/* 1. BRAND / HEADER                                            */}
      {/* ============================================================ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 select-none ${
          scrolled
            ? "h-16 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-sm"
            : "h-20 bg-white/90 backdrop-blur-sm border-b border-[#E5E7EB]/80"
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="flex items-center space-x-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900] rounded-lg p-1"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center shadow-subtle shrink-0 group-hover:border-[#FF9900] transition-colors overflow-hidden p-1">
              <img
                src="/brand/recovery-manager-logo.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-[#111827] tracking-tight text-base sm:text-lg">
              Recovery Manager
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-semibold text-[#4B5563]">
            <a
              href="#problem"
              className="px-3 py-1.5 rounded-md hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors focus-visible:ring-2 focus-visible:ring-[#FF9900] focus:outline-none"
            >
              The Problem
            </a>
            <a
              href="#outcomes"
              className="px-3 py-1.5 rounded-md hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors focus-visible:ring-2 focus-visible:ring-[#FF9900] focus:outline-none"
            >
              4 Outcomes
            </a>
            <a
              href="#pipeline"
              className="px-3 py-1.5 rounded-md hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors focus-visible:ring-2 focus-visible:ring-[#FF9900] focus:outline-none"
            >
              How It Works
            </a>
            <a
              href="#traceability"
              className="px-3 py-1.5 rounded-md hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors focus-visible:ring-2 focus-visible:ring-[#FF9900] focus:outline-none"
            >
              Traceability
            </a>
          </nav>

          {/* Header Action & Mobile Menu Toggle */}
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-[#111827] bg-[#FF9900] hover:bg-[#E88A00] transition-colors rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF9900] focus:outline-none"
            >
              <span>Enter Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] border border-[#E5E7EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E5E7EB] px-4 pt-2 pb-4 space-y-1 shadow-elevated">
            <a
              href="#problem"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
            >
              The Problem
            </a>
            <a
              href="#outcomes"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
            >
              4 Outcomes
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
            >
              How It Works
            </a>
            <a
              href="#traceability"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-semibold text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
            >
              Traceability
            </a>
            <div className="pt-2 border-t border-[#E5E7EB]">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-[#FF9900] hover:bg-[#E88A00] text-[#111827] text-sm font-semibold shadow-sm"
              >
                <span>Enter Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="pt-20">
        {/* ============================================================ */}
        {/* 2. HERO SECTION                                              */}
        {/* ============================================================ */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-white border-b border-[#E5E7EB]">
          {/* Subtle background enterprise grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#F3F4F6_1px,transparent_1px),linear-gradient(to_bottom,#F3F4F6_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-50" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              {/* Eyebrow */}
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-[#B45309]">
                <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
                <span className="tracking-wider uppercase text-[11px] font-semibold">
                  DETERMINISTIC MARKETPLACE DISPUTE AUTOMATION
                </span>
              </div>

              {/* Main Headline (Strict single H1 with Inter 700/800) */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#111827] leading-[1.15]">
                Evidence first, claim second.
              </h1>

              {/* Supporting Message */}
              <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed max-w-2xl mx-auto font-normal">
                Recovery Manager is an internal operations console for marketplace fee dispute recovery.
                We corroborate marketplace charges against warehouse evidence before creating a claim.
                When physical proof is missing or conflicting, the system does not invent an answer.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#FF9900] hover:bg-[#E88A00] text-[#111827] font-semibold text-sm shadow-subtle flex items-center justify-center space-x-2 transition-all duration-150 group focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF9900] focus:outline-none"
                >
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#pipeline"
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-white hover:bg-[#F7F8FA] text-[#111827] font-semibold text-sm border border-[#D1D5DB] flex items-center justify-center space-x-2 transition-all duration-150 shadow-subtle focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#D1D5DB] focus:outline-none"
                >
                  <span>How It Works</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. LIVE OPERATIONS SNAPSHOT                                   */}
        {/* ============================================================ */}
        <section className="py-12 border-b border-[#E5E7EB] bg-[#F7F8FA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9900] block">
                  Live Operations Snapshot
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight mt-0.5">
                  Real-time operational ledger metrics.
                </h2>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-[#E5E7EB] text-xs text-[#4B5563] shadow-subtle self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Current workspace:{" "}
                  <strong className="text-[#111827] font-semibold">
                    {currentCompanyName || "Live Ledger"}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Metric 1 */}
              <div className="p-5 sm:p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-subtle flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                      INGESTED MARKETPLACE CHARGES
                    </span>
                    <Receipt className="w-4 h-4 text-[#6B7280]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-[#111827] tracking-tight pt-1">
                    {snapshot.loading ? (
                      "—"
                    ) : snapshot.totalFees !== null ? (
                      `$${Number(snapshot.totalFees).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    ) : (
                      "—"
                    )}
                  </div>
                  {snapshot.totalChargesCount !== null && (
                    <div className="text-xs text-[#6B7280]">
                      Across {snapshot.totalChargesCount} evaluated charges
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-[#F3F4F6] text-[11px] font-medium text-[#4B5563] flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Live from database ledger</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="p-5 sm:p-6 rounded-xl bg-white border-2 border-[#FF9900] shadow-subtle flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
                      IDENTIFIED RECOVERY POTENTIAL
                    </span>
                    <TrendingUp className="w-4 h-4 text-[#FF9900]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-[#111827] tracking-tight pt-1">
                    {snapshot.loading ? (
                      "—"
                    ) : snapshot.potentialRecovery !== null ? (
                      `$${Number(snapshot.potentialRecovery).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    ) : (
                      "—"
                    )}
                  </div>
                  {snapshot.contradictedCount !== null && (
                    <div className="text-xs text-[#067D68] font-semibold">
                      {snapshot.contradictedCount} charges eligible for dispute
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-orange-100 text-[11px] font-medium text-[#4B5563] flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#067D68] shrink-0" />
                  <span>Contradicted by warehouse proof</span>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="p-5 sm:p-6 rounded-xl bg-white border border-[#E5E7EB] shadow-subtle flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                      DISPUTE CLAIMS CREATED
                    </span>
                    <FileCheck2 className="w-4 h-4 text-[#6B7280]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-[#111827] tracking-tight pt-1">
                    {snapshot.loading ? (
                      "—"
                    ) : snapshot.claimsCount !== null ? (
                      snapshot.claimsCount
                    ) : (
                      "—"
                    )}
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    Claims prepared with evidence packages
                  </div>
                </div>
                <div className="pt-3 border-t border-[#F3F4F6] text-[11px] font-medium text-[#4B5563] flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>Created with linked evidence and audit trail</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. THE PROBLEM                                               */}
        {/* ============================================================ */}
        <section id="problem" className="py-20 bg-white border-b border-[#E5E7EB] scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF9900]">
                THE OPERATIONAL REALITY
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mt-1.5">
                Sellers get charged fees they cannot easily contest.
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] mt-3 leading-relaxed font-normal">
                Inbound defect penalties, prep violations, and carton weight surcharges can appear long after the
                underlying warehouse event. By the time a fee reaches a settlement report, the operational evidence
                needed to challenge it may be difficult to locate, connect, and verify.
              </p>
            </div>

            {/* Three Professional Problem Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Problem 01 */}
              <div className="p-6 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="text-xs font-bold text-[#FF9900] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded w-fit">
                  01
                </div>
                <h3 className="text-base font-bold text-[#111827]">Siloed Evidence</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  Scale logs, barcode scans, warehouse audits, photographs, and carrier records often live in separate
                  systems and are not directly connected to settlement line items.
                </p>
              </div>

              {/* Problem 02 */}
              <div className="p-6 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="text-xs font-bold text-[#FF9900] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded w-fit">
                  02
                </div>
                <h3 className="text-base font-bold text-[#111827]">Auto-Dispute Risk</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  Generating generic disputes without concrete evidence creates unnecessary rejection risk. Recovery
                  decisions should be grounded in observable operational records.
                </p>
              </div>

              {/* Problem 03 */}
              <div className="p-6 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="text-xs font-bold text-[#FF9900] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded w-fit">
                  03
                </div>
                <h3 className="text-base font-bold text-[#111827]">Strict Burden of Proof</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  A defensible dispute requires traceable evidence tied to the relevant shipment, order, SKU, unit, event,
                  and time window.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. FOUR ASSESSMENT OUTCOMES                                  */}
        {/* ============================================================ */}
        <section id="outcomes" className="py-20 bg-[#F7F8FA] border-b border-[#E5E7EB] scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF9900]">
                OUR CORE DIFFERENTIATOR
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mt-1.5">
                Every charge resolves into a clear operational outcome.
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] mt-3 leading-relaxed font-normal">
                Recovery Manager does not assume every fee should be disputed. Each evaluated charge is classified
                according to the evidence available, with unsupported or conflicting cases explicitly preserved rather
                than fabricated.
              </p>
            </div>

            {/* 2x2 Outcome Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OUTCOME 1 — CONTRADICTED */}
              <div
                role="button"
                tabIndex={0}
                aria-pressed={activeVerdict === "CONTRADICTED"}
                onClick={() => setActiveVerdict("CONTRADICTED")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveVerdict("CONTRADICTED");
                  }
                }}
                className={`p-6 rounded-xl bg-white border transition-all duration-150 cursor-pointer shadow-subtle flex flex-col justify-between space-y-4 focus:outline-none ${
                  activeVerdict === "CONTRADICTED"
                    ? "border-emerald-500 ring-2 ring-emerald-500 shadow-elevated"
                    : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>DISPUTE ELIGIBLE</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">CONTRADICTED</span>
                  </div>
                  <h3 className="text-base font-bold text-[#111827]">Physical evidence contradicts the fee</h3>
                  <p className="text-xs text-[#4B5563] mt-2.5 leading-relaxed font-normal">
                    Warehouse or operational records provide evidence that conflicts with the marketplace's stated defect or
                    deduction reason.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#F3F4F6] text-[11px] font-medium text-emerald-800 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                  Action: Claim can be created with linked evidence and supporting rationale.
                </div>
              </div>

              {/* OUTCOME 2 — SUPPORTED */}
              <div
                role="button"
                tabIndex={0}
                aria-pressed={activeVerdict === "SUPPORTED"}
                onClick={() => setActiveVerdict("SUPPORTED")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveVerdict("SUPPORTED");
                  }
                }}
                className={`p-6 rounded-xl bg-white border transition-all duration-150 cursor-pointer shadow-subtle flex flex-col justify-between space-y-4 focus:outline-none ${
                  activeVerdict === "SUPPORTED"
                    ? "border-rose-500 ring-2 ring-rose-500 shadow-elevated"
                    : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      <span>FEE VALID</span>
                    </span>
                    <span className="text-[11px] font-bold text-rose-700">SUPPORTED</span>
                  </div>
                  <h3 className="text-base font-bold text-[#111827]">Evidence supports the fee</h3>
                  <p className="text-xs text-[#4B5563] mt-2.5 leading-relaxed font-normal">
                    Available operational records substantiate that the reported defect or violation occurred.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#F3F4F6] text-[11px] font-medium text-rose-800 bg-rose-50/60 p-2.5 rounded-lg border border-rose-200">
                  Action: No dispute is generated; the non-claim rationale is preserved in the audit trail.
                </div>
              </div>

              {/* OUTCOME 3 — SILENT */}
              <div
                role="button"
                tabIndex={0}
                aria-pressed={activeVerdict === "SILENT"}
                onClick={() => setActiveVerdict("SILENT")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveVerdict("SILENT");
                  }
                }}
                className={`p-6 rounded-xl bg-white border transition-all duration-150 cursor-pointer shadow-subtle flex flex-col justify-between space-y-4 focus:outline-none ${
                  activeVerdict === "SILENT"
                    ? "border-amber-500 ring-2 ring-amber-500 shadow-elevated"
                    : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                      <span>UNSUBSTANTIATED</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">SILENT</span>
                  </div>
                  <h3 className="text-base font-bold text-[#111827]">No corroborating evidence found</h3>
                  <p className="text-xs text-[#4B5563] mt-2.5 leading-relaxed font-normal">
                    No relevant warehouse or operational evidence was found for the charge, shipment, unit, or SKU.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#F3F4F6] text-[11px] font-medium text-amber-800 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                  Action: No claim generated; the case remains documented as unsubstantiated.
                </div>
              </div>

              {/* OUTCOME 4 — UNCERTAIN */}
              <div
                role="button"
                tabIndex={0}
                aria-pressed={activeVerdict === "UNCERTAIN"}
                onClick={() => setActiveVerdict("UNCERTAIN")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveVerdict("UNCERTAIN");
                  }
                }}
                className={`p-6 rounded-xl bg-white border transition-all duration-150 cursor-pointer shadow-subtle flex flex-col justify-between space-y-4 focus:outline-none ${
                  activeVerdict === "UNCERTAIN"
                    ? "border-blue-500 ring-2 ring-blue-500 shadow-elevated"
                    : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      <span>HUMAN REVIEW</span>
                    </span>
                    <span className="text-[11px] font-bold text-blue-700">UNCERTAIN</span>
                  </div>
                  <h3 className="text-base font-bold text-[#111827]">Evidence is conflicting or ambiguous</h3>
                  <p className="text-xs text-[#4B5563] mt-2.5 leading-relaxed font-normal">
                    Available records provide conflicting signals or insufficient certainty to support a defensible automated
                    decision.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#F3F4F6] text-[11px] font-medium text-blue-800 bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                  Action: Route for human review instead of generating an unsupported dispute.
                </div>
              </div>
            </div>

            {/* Interactive Verdict Demonstration Panel */}
            <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E7EB] gap-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-[#FF9900]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                    Interactive Verdict Inspection
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    &bull; Active Selection: <strong className="text-[#111827]">{activeData.key}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-[#6B7280] bg-[#F7F8FA] border border-[#E5E7EB] px-2 py-0.5 rounded w-fit font-medium">
                  Illustrative Demonstration
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Stated Marketplace Fee
                  </span>
                  <div className="font-bold text-[#111827] text-sm">{activeData.sampleDeduction.type}</div>
                  <div className="tabular-nums text-xs font-bold text-[#C40000]">{activeData.sampleDeduction.fee}</div>
                  <p className="text-[#6B7280] text-[11px]">{activeData.sampleDeduction.reason}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Warehouse Floor Proof
                  </span>
                  <div className="font-bold text-[#111827] text-sm">{activeData.sampleEvidence.type}</div>
                  <div className="text-xs text-blue-700">
                    Record: <span className="font-mono font-semibold">{activeData.sampleEvidence.recordId}</span>
                  </div>
                  <p className="text-[#4B5563] text-[11px]">{activeData.sampleEvidence.finding}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Audit Disposition
                  </span>
                  <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-bold border w-fit"
                    style={{
                      backgroundColor:
                        activeVerdict === "CONTRADICTED" ? "#ECFDF5" :
                        activeVerdict === "SUPPORTED" ? "#FEE2E2" :
                        activeVerdict === "SILENT" ? "#FEF3C7" : "#EFF6FF",
                      color:
                        activeVerdict === "CONTRADICTED" ? "#067D68" :
                        activeVerdict === "SUPPORTED" ? "#C40000" :
                        activeVerdict === "SILENT" ? "#B45309" : "#2563EB",
                      borderColor:
                        activeVerdict === "CONTRADICTED" ? "#A7F3D0" :
                        activeVerdict === "SUPPORTED" ? "#FECACA" :
                        activeVerdict === "SILENT" ? "#FDE68A" : "#BFDBFE",
                    }}
                  >
                    <span>{activeData.badge}</span>
                  </div>
                  <p className="text-[#4B5563] text-[11px] leading-relaxed pt-1">{activeData.sampleAction}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. RECOVERY PIPELINE                                         */}
        {/* ============================================================ */}
        <section id="pipeline" className="py-20 bg-white border-b border-[#E5E7EB] scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF9900]">
                RECOVERY PIPELINE
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mt-1.5">
                From raw records to defensible recovery decisions.
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] mt-3 leading-relaxed font-normal">
                A structured workflow connects financial deductions with operational evidence before a claim is
                prepared.
              </p>
            </div>

            {/* Five Pipeline Stages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Stage 01 */}
              <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#B45309] bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                    01
                  </span>
                  <Database className="w-4 h-4 text-[#6B7280]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">INGEST</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  Upload marketplace fee reports, carrier files, and operational audit records.
                </p>
              </div>

              {/* Stage 02 */}
              <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#B45309] bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                    02
                  </span>
                  <Search className="w-4 h-4 text-[#6B7280]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">MATCH</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  Connect charges with shipment IDs, order IDs, SKUs, units, and other available identifiers.
                </p>
              </div>

              {/* Stage 03 */}
              <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#B45309] bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                    03
                  </span>
                  <Layers className="w-4 h-4 text-[#6B7280]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">ASSESS</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  Evaluate observable evidence against the stated deduction reason.
                </p>
              </div>

              {/* Stage 04 */}
              <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#B45309] bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                    04
                  </span>
                  <ShieldCheck className="w-4 h-4 text-[#6B7280]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">VALIDATE</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  Apply deterministic rules, time windows, duplicate checks, and threshold validation where supported.
                </p>
              </div>

              {/* Stage 05 */}
              <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] shadow-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#B45309] bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                    05
                  </span>
                  <FileCheck2 className="w-4 h-4 text-[#6B7280]" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">CLAIM OR LOG</h3>
                <p className="text-xs text-[#4B5563] leading-relaxed font-normal">
                  Prepare a claim for review when evidence supports recovery, or preserve a documented non-claim rationale.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex items-center justify-between text-xs text-[#4B5563]">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
                <span>
                  <strong>Evidence-driven recovery pipeline:</strong> Every operational stage preserves verifiable record references.
                </span>
              </div>
              <Link
                href="/dashboard"
                className="text-[#FF9900] hover:text-[#E88A00] font-semibold hidden sm:inline-flex items-center space-x-1"
              >
                <span>Open Pipeline Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. TRACEABILITY                                              */}
        {/* ============================================================ */}
        <section id="traceability" className="py-20 bg-[#F7F8FA] border-b border-[#E5E7EB] scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF9900]">
                UNBROKEN AUDIT TRAIL
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mt-1.5">
                Trace every recovery decision back to its source.
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] mt-3 leading-relaxed font-normal">
                Every supported recovery decision should be traceable from the claim to the underlying charge, matching
                identifiers, evidence records, and assessment outcome.
              </p>
            </div>

            {/* Illustrative Example Label */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111827]">
                Provenential Lineage Graph: Claim &rarr; Charge &rarr; Context &rarr; Evidence &rarr; Decision
              </span>
              <span className="text-[10px] uppercase bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold">
                Illustrative Example
              </span>
            </div>

            {/* Provenance Chain Container */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-subtle space-y-6">
              {/* Chain Node 1: Recovery Claim */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#067D68] shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Recovery Claim</span>
                      <span className="text-[10px] font-mono bg-white border border-[#E5E7EB] px-1.5 py-0.2 rounded text-[#2563EB] font-semibold">
                        CLM-2026-0884
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] mt-0.5 font-normal">
                      Prepared with formal dispute narrative dossier, factual comparison, and proof citations.
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right text-xs shrink-0">
                  <span className="text-[#067D68] font-bold tabular-nums">$38.00 Recoverable</span>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center -my-3">
                <div className="w-6 h-6 rounded-full bg-white border border-[#D1D5DB] flex items-center justify-center text-[#6B7280] shadow-sm">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chain Node 2: Marketplace Charge */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF9900] shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Marketplace Charge</span>
                      <span className="text-[10px] font-mono bg-white border border-[#E5E7EB] px-1.5 py-0.2 rounded text-[#111827] font-semibold">
                        CH-TC07-DUPLICATE
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] mt-0.5 font-normal">
                      Inbound Defect Fee &bull; Alleged packaging non-compliance &bull; Settlement report item.
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right text-xs shrink-0">
                  <span className="text-[#C40000] font-bold tabular-nums">$38.00 Deduction</span>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center -my-3">
                <div className="w-6 h-6 rounded-full bg-white border border-[#D1D5DB] flex items-center justify-center text-[#6B7280] shadow-sm">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chain Node 3: Shipment / Order / SKU */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Shipment / Order / SKU</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                      <span className="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[#4B5563]">
                        Shipment: <strong className="text-[#111827] font-mono">FBA17Z9K2L</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[#4B5563]">
                        Order: <strong className="text-[#111827] font-mono">#114-883109</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[#4B5563]">
                        SKU: <strong className="text-[#111827] font-mono">SKU-WIDGET-01</strong>
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-[#E5E7EB] rounded text-[#4B5563]">
                        Unit: <strong className="text-[#2563EB] font-mono">UNIT-TC07</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left md:text-right text-xs text-[#6B7280] shrink-0 font-medium">
                  Resolved via Entity Matcher
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center -my-3">
                <div className="w-6 h-6 rounded-full bg-white border border-[#D1D5DB] flex items-center justify-center text-[#6B7280] shadow-sm">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chain Node 4: Evidence Record */}
              <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#067D68] shrink-0">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">Evidence Record</span>
                      <span className="text-[10px] font-mono bg-white border border-[#E5E7EB] px-1.5 py-0.2 rounded text-[#067D68] font-semibold">
                        PRP-TC07
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] mt-0.5 font-normal">
                      Prep station optical scan &bull; Polybag present & sealed &bull; Certified warning printed.
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right text-xs text-[#067D68] font-bold shrink-0">
                  PASS (Compliant)
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center -my-3">
                <div className="w-6 h-6 rounded-full bg-white border border-[#D1D5DB] flex items-center justify-center text-[#6B7280] shadow-sm">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chain Node 5: Assessment */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-emerald-300 flex items-center justify-center text-[#067D68] shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Assessment Decision</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold">
                        CONTRADICTED
                      </span>
                    </div>
                    <p className="text-xs text-emerald-950 mt-0.5 font-medium">
                      Physical evidence refutes channel fee. Claim dossier assembled with complete provenance link.
                    </p>
                  </div>
                </div>
                <div className="text-left md:text-right text-xs text-emerald-800 font-bold shrink-0">
                  Defensible Claim
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 8. FINAL CTA                                                 */}
        {/* ============================================================ */}
        <section className="py-20 bg-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
            {/* Recovery Manager Brand Logo in Final CTA */}
            <div className="w-12 h-12 mx-auto rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-subtle p-1.5 mb-2 overflow-hidden">
              <img
                src="/brand/recovery-manager-logo.png"
                alt="Recovery Manager"
                className="w-full h-full object-contain"
              />
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#111827] tracking-tight">
              Launch Recovery Operations
            </h2>
            <p className="text-sm sm:text-base text-[#4B5563] max-w-2xl mx-auto leading-relaxed font-normal">
              Audit marketplace charges, inspect supporting evidence, review assessment decisions, prepare defensible
              claims, and track recovery with complete provenance.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#FF9900] hover:bg-[#E88A00] text-[#111827] font-semibold text-sm shadow-subtle flex items-center justify-center space-x-2 transition-all duration-150 group focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF9900] focus:outline-none"
              >
                <span>Enter Dashboard Console</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 9. FOOTER                                                    */}
      {/* ============================================================ */}
      <footer className="py-10 border-t border-[#E5E7EB] bg-[#F7F8FA] text-xs text-[#6B7280]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center shadow-subtle p-1 overflow-hidden shrink-0">
              <img
                src="/brand/recovery-manager-logo.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-[#111827]">Recovery Manager</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-[11px] text-[#4B5563] font-medium">
            <Link href="/dashboard" className="hover:text-[#111827] transition-colors">Operations Console</Link>
            <Link href="/charges" className="hover:text-[#111827] transition-colors">Charges Ledger</Link>
            <Link href="/recovery" className="hover:text-[#111827] transition-colors">Recovery Pipeline</Link>
            <Link href="/evidence" className="hover:text-[#111827] transition-colors">Evidence Logs</Link>
            <Link href="/claims" className="hover:text-[#111827] transition-colors">Claims & Audit</Link>
            <Link href="/data-sources" className="hover:text-[#111827] transition-colors">Data Ingestion</Link>
          </div>

          <div className="text-[11px] text-[#6B7280]">
            Deterministic Recovery &bull; Multi-Tenant RLS
          </div>
        </div>
      </footer>
    </div>
  );
}
