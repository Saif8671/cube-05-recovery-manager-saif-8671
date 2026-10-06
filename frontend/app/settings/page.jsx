"use client";
import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import {
  Settings,
  Server,
  Network,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function SettingsPage() {
  const { currentCompany, currentCompanyName } = useWorkspace();

  // Connectivity and Health states
  const [testing, setTesting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [testResult, setTestResult] = useState(null); // 'success' | 'failed' | 'unavailable' | null
  const [healthData, setHealthData] = useState({
    systemStatus: "Checking...",
    dbConnection: "Checking...",
    backendVersion: "Checking...",
    environment: typeof process !== "undefined" && process.env.NODE_ENV === "production" ? "Production" : "Development",
    latencyMs: null,
    lastChecked: null,
    error: null,
  });

  const [copiedUrl, setCopiedUrl] = useState(false);

  // Resolved public base URL as defined in lib/api.js
  const configuredApiBase =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    "https://rcy-recovery-backend.onrender.com/api/v1";

  // Derive root URL by safely trimming /api/v1
  const backendRootUrl = configuredApiBase.replace(/\/api\/v1\/?$/, "");

  // Real backend connectivity check function
  const runConnectivityCheck = useCallback(async () => {
    setTesting(true);
    const startTime = performance.now();

    try {
      // 1. Check database connectivity by querying existing /companies endpoint
      const companiesPromise = api.getCompanies();

      // 2. Fetch backend root metadata (FastAPI @app.get('/'))
      const rootPromise = fetch(backendRootUrl || "/", {
        method: "GET",
        headers: { Accept: "application/json" },
      })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      const [companiesSettled, rootSettled] = await Promise.allSettled([
        companiesPromise,
        rootPromise,
      ]);

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      const isCompanySuccess = companiesSettled.status === "fulfilled" && Array.isArray(companiesSettled.value);
      const rootData = rootSettled.status === "fulfilled" ? rootSettled.value : null;

      if (isCompanySuccess || rootData) {
        // Successful response from backend
        const statusVal = rootData?.status === "online" ? "OK" : isCompanySuccess ? "OK" : "Degraded";
        const dbStatusVal = isCompanySuccess ? "Connected" : "Unavailable";
        const versionVal = rootData?.version ? `v${rootData.version}` : "Not exposed";

        setHealthData({
          systemStatus: statusVal,
          dbConnection: dbStatusVal,
          backendVersion: versionVal,
          environment:
            typeof process !== "undefined" && process.env.NODE_ENV === "production"
              ? "Production"
              : "Development",
          latencyMs: latency,
          lastChecked: new Date(),
          error: null,
        });

        setTestResult("success");
      } else {
        // Both failed
        const rejectionReason =
          companiesSettled.status === "rejected"
            ? companiesSettled.reason?.message || "Connection refused"
            : "Backend unreachable";

        setHealthData((prev) => ({
          ...prev,
          systemStatus: "Offline",
          dbConnection: "Unavailable",
          backendVersion: "Not exposed",
          latencyMs: null,
          lastChecked: new Date(),
          error: rejectionReason,
        }));

        setTestResult("failed");
      }
    } catch (err) {
      console.error("Connectivity check encountered an error:", err);
      setHealthData((prev) => ({
        ...prev,
        systemStatus: "Offline",
        dbConnection: "Unavailable",
        backendVersion: "Not exposed",
        latencyMs: null,
        lastChecked: new Date(),
        error: err.message || "Failed to reach backend services.",
      }));
      setTestResult("failed");
    } finally {
      setTesting(false);
      setInitialLoading(false);
      // Automatically reset test button label back to default after 4 seconds
      setTimeout(() => {
        setTestResult(null);
      }, 4000);
    }
  }, [backendRootUrl]);

  // Initial connectivity check on mount
  useEffect(() => {
    runConnectivityCheck();
  }, [runConnectivityCheck]);

  // Copy helper
  const handleCopyUrl = (text) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const isHealthy = healthData.systemStatus === "OK" && healthData.dbConnection === "Connected";
  const isFailed = healthData.systemStatus === "Offline" || healthData.error !== null;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={runConnectivityCheck} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 w-full max-w-7xl mx-auto page-enter">
        {/* ============================================================ */}
        {/* 1. PAGE HEADER                                               */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#FF9900] shadow-xs shrink-0 mt-0.5">
              <Settings className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-mono text-gray-600 font-medium uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                  <span>Observability Console</span>
                </span>
                <span className="text-gray-300">&bull;</span>
                <span className="text-[11px] font-mono text-gray-500">
                  Workspace: <strong className="text-gray-900 font-semibold">{currentCompanyName}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 font-sans">
                System & Environment Settings
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
                Read-only configuration parameters and live backend service status
              </p>
            </div>
          </div>

          {/* Header Action: Test Connectivity */}
          <div className="flex items-center space-x-3 shrink-0 self-start sm:self-auto">
            <button
              onClick={runConnectivityCheck}
              disabled={testing}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FF9900] disabled:opacity-60 disabled:cursor-not-allowed ${
                testResult === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : testResult === "failed"
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
              aria-label="Test Backend Connectivity"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${
                  testing ? "animate-spin text-[#FF9900]" : testResult === "success" ? "text-emerald-600" : "text-gray-500"
                }`}
              />
              <span>
                {testing
                  ? "Testing…"
                  : testResult === "success"
                  ? "Connected"
                  : testResult === "failed"
                  ? "Connection Failed"
                  : "Test Connectivity"}
              </span>
            </button>
          </div>
        </div>

        {/* Inline Error / Retry Banner if connectivity failed */}
        {isFailed && !initialLoading && (
          <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-semibold">Unable to load system status: </span>
                <span className="font-mono text-[11px] text-rose-800">
                  {healthData.error || "Backend endpoint failed to respond."}
                </span>
              </div>
            </div>
            <button
              onClick={runConnectivityCheck}
              disabled={testing}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs shadow-xs shrink-0 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <RefreshCw className={`w-3 h-3 ${testing ? "animate-spin" : ""}`} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. BACKEND SERVICE HEALTH CARD                               */}
        {/* ============================================================ */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-subtle space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                <Server className="w-4 h-4 text-gray-800" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-900 font-mono">
                  BACKEND SERVICE HEALTH
                </h2>
                <p className="text-[11px] text-gray-500">
                  Direct operational heartbeat and datastore connectivity status
                </p>
              </div>
            </div>

            {/* Top-Right Status Badge */}
            <div>
              {initialLoading || testing ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Checking Status...</span>
                </span>
              ) : isHealthy ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Service Healthy</span>
                </span>
              ) : isFailed ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Service Offline</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span>Connectivity Unavailable</span>
                </span>
              )}
            </div>
          </div>

          {/* 4 Information Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: System Status */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center justify-between">
                <span>System Status</span>
                <Activity className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex items-center space-x-2">
                {initialLoading ? (
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        healthData.systemStatus === "OK"
                          ? "bg-emerald-500"
                          : healthData.systemStatus === "Checking..."
                          ? "bg-amber-400"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-base font-bold text-gray-900 font-mono">
                      {healthData.systemStatus}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {healthData.systemStatus === "OK" ? "FastAPI REST Engine Online" : "Service not responding"}
              </div>
            </div>

            {/* Tile 2: Database Connection */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center justify-between">
                <span>Database Connection</span>
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex items-center space-x-2">
                {initialLoading ? (
                  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        healthData.dbConnection === "Connected"
                          ? "bg-emerald-500"
                          : healthData.dbConnection === "Checking..."
                          ? "bg-amber-400"
                          : "bg-rose-500"
                      }`}
                    />
                    <span className="text-base font-bold text-gray-900 font-mono">
                      {healthData.dbConnection}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {healthData.dbConnection === "Connected"
                  ? "PostgreSQL Active Session"
                  : "Database query failed"}
              </div>
            </div>

            {/* Tile 3: Backend Version */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center justify-between">
                <span>Backend Version</span>
                <Layers className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex items-center space-x-2">
                {initialLoading ? (
                  <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <span className="text-base font-bold text-gray-900 font-mono">
                    {healthData.backendVersion}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                Semantic API Specification
              </div>
            </div>

            {/* Tile 4: Environment */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center justify-between">
                <span>Environment</span>
                <Cpu className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex items-center space-x-2">
                {initialLoading ? (
                  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <span className="text-base font-bold text-gray-900 font-sans">
                    {healthData.environment}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                Node runtime environment
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. NETWORK & BASE URL CONFIGURATION CARD                     */}
        {/* ============================================================ */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-subtle space-y-5">
          {/* Section Header */}
          <div className="flex items-center space-x-2.5 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
              <Network className="w-4 h-4 text-gray-800" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-900 font-mono">
                NETWORK & BASE URL CONFIGURATION
              </h2>
              <p className="text-[11px] text-gray-500">
                Client routing, upstream API base endpoints, and rewrite mappings
              </p>
            </div>
          </div>

          {/* Read-Only Configuration Rows */}
          <div className="divide-y divide-gray-100">
            {/* Row 1: Target Backend Base URL */}
            <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-md">
                <span className="text-xs font-semibold text-gray-900 block">
                  Target Backend Base URL
                </span>
                <span className="text-[11px] text-gray-500 block leading-relaxed">
                  Configured public API base URL consumed by frontend recovery services
                </span>
              </div>
              <div className="flex items-center space-x-2 max-w-full">
                <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-mono text-gray-800 break-all select-all shadow-2xs">
                  {configuredApiBase}
                </div>
                <button
                  onClick={() => handleCopyUrl(configuredApiBase)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors shrink-0"
                  title="Copy Base URL"
                  aria-label="Copy Base URL"
                >
                  {copiedUrl ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Row 2: Client-Side Proxy Rewrite */}
            <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-md">
                <span className="text-xs font-semibold text-gray-900 block">
                  Client-Side Proxy Rewrite
                </span>
                <span className="text-[11px] text-gray-500 block leading-relaxed">
                  Local Next.js rewrite rule configured in <code className="font-mono text-gray-700">next.config.mjs</code>
                </span>
              </div>
              <div className="flex items-center space-x-2 max-w-full">
                <div className="px-3 py-1.5 rounded-lg bg-orange-50/60 border border-orange-200/70 text-xs font-mono text-gray-900 break-all shadow-2xs">
                  /api/v1/:path* → http://127.0.0.1:8000/api/v1/:path*
                </div>
              </div>
            </div>

            {/* Row 3: Environment Variable Source */}
            <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-md">
                <span className="text-xs font-semibold text-gray-900 block">
                  Environment Variable Source
                </span>
                <span className="text-[11px] text-gray-500 block leading-relaxed">
                  Frontend public configuration key inspected at client bundle initialization
                </span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-1 rounded-md bg-gray-100 border border-gray-200 text-xs font-mono text-gray-800 font-semibold">
                  NEXT_PUBLIC_API_URL
                </span>
                <span className="text-[11px] text-gray-500">
                  {typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
                    ? "(Explicitly Set)"
                    : "(Default Fallback Active)"}
                </span>
              </div>
            </div>

            {/* Row 4: Network Transport & Protocol */}
            <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5 max-w-md">
                <span className="text-xs font-semibold text-gray-900 block">
                  Communication Protocol
                </span>
                <span className="text-[11px] text-gray-500 block leading-relaxed">
                  Cryptographic transport layer and payload serialization format
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 font-semibold">
                  REST / JSON over HTTPS
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. APPLICATION RUNTIME CARD                                  */}
        {/* ============================================================ */}
        <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-subtle space-y-5">
          {/* Section Header */}
          <div className="flex items-center space-x-2.5 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
              <Cpu className="w-4 h-4 text-gray-800" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-gray-900 font-mono">
                APPLICATION RUNTIME
              </h2>
              <p className="text-[11px] text-gray-500">
                Frontend framework, workspace tenancy context, and telemetry markers
              </p>
            </div>
          </div>

          {/* Runtime Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Field 1: Frontend Framework */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono block">
                Frontend Framework
              </span>
              <span className="text-sm font-semibold text-gray-900 block">
                Next.js 14.2.15 (React 18)
              </span>
              <span className="text-[11px] text-gray-500 block">
                App Router architecture
              </span>
            </div>

            {/* Field 2: API Client */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono block">
                API Client
              </span>
              <span className="text-sm font-semibold text-gray-900 block font-mono">
                Fetch API (lib/api.js)
              </span>
              <span className="text-[11px] text-gray-500 block">
                Standard promise-based client
              </span>
            </div>

            {/* Field 3: Application Environment */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono block">
                Application Environment
              </span>
              <span className="text-sm font-semibold text-gray-900 block">
                {healthData.environment}
              </span>
              <span className="text-[11px] text-gray-500 block">
                Node runtime environment mode
              </span>
            </div>

            {/* Field 4: Current Workspace */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono block">
                Current Workspace
              </span>
              <span className="text-sm font-semibold text-gray-900 block truncate">
                {currentCompanyName}
              </span>
              <span className="text-[11px] text-gray-500 font-mono block truncate">
                Tenant ID: {currentCompany}
              </span>
            </div>

            {/* Field 5: Tenant Context */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono block">
                Tenant Context
              </span>
              <span className="text-sm font-semibold text-emerald-700 block">
                Active RLS Partitioning
              </span>
              <span className="text-[11px] text-gray-500 block">
                Scoped to active organization
              </span>
            </div>

            {/* Field 6: Last Connectivity Check */}
            <div className="p-4 rounded-xl bg-[#F7F8FA] border border-gray-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center justify-between">
                <span>Last Connectivity Check</span>
                <Clock className="w-3.5 h-3.5 text-gray-400" />
              </span>
              <span className="text-sm font-semibold text-gray-900 block font-mono">
                {healthData.lastChecked
                  ? healthData.lastChecked.toLocaleTimeString()
                  : "Never checked"}
              </span>
              <span className="text-[11px] text-gray-500 block font-mono">
                {healthData.latencyMs !== null ? `${healthData.latencyMs}ms round-trip latency` : "No latency data"}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
