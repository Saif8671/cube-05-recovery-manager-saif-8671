"use client";
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { useWorkspace } from "../../context/WorkspaceContext";
import { api } from "../../lib/api";
import Link from "next/link";
import {
  UploadCloud,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileCheck,
  FolderOpen,
  ArrowRight,
  ShieldAlert,
  Database,
  Layers,
  Sparkles,
  Search,
  X,
  ExternalLink,
  ArrowUpRight,
  Download,
  Eye,
  RefreshCw,
  FileCode,
  Check,
  AlertTriangle,
  Receipt,
  FolderSync,
} from "lucide-react";
import { TableSkeletonRows } from "../../components/LoadingSkeleton";

export default function DataSourcesPage() {
  const { currentCompany } = useWorkspace();
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "charge_manual" | "evidence_manual"
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Search & filter for source inventory
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL | fee_report | receiving | prep | pack | returns
  const [selectedSourceDetail, setSelectedSourceDetail] = useState(null);

  // Manual Charge form state
  const [chargeForm, setChargeForm] = useState({
    charge_id: "",
    unit_id: "",
    shipment_id: "",
    order_id: "",
    sku: "",
    reason: "inbound_defect_fee",
    amount: "",
    charge_date: new Date().toISOString().split("T")[0],
  });
  const [chargeFeedback, setChargeFeedback] = useState(null);

  // Manual Evidence form state
  const [evidenceForm, setEvidenceForm] = useState({
    evidence_id: "",
    source_type: "prep",
    unit_id: "",
    shipment_id: "",
    order_id: "",
    sku: "",
    event_type: "fba_prep_compliance",
    finding: "PASS",
    description: "",
    timestamp: new Date().toISOString(),
  });
  const [evidenceFeedback, setEvidenceFeedback] = useState(null);

  const loadFiles = async () => {
    try {
      setLoadingFiles(true);
      setError(null);
      const data = await api.getUploadedFiles(currentCompany);
      setUploadedFiles(data || []);
    } catch (err) {
      console.error("Failed to load uploaded files:", err);
      setError(err.message || "Failed to load uploaded source documents.");
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportSuccess(null);
    setUploadError(null);
    setSelectedSourceDetail(null);
    loadFiles();
  }, [currentCompany]);

  useEffect(() => {
    if (!selectedSourceDetail) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedSourceDetail(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSourceDetail]);

  // Derived real summary metrics from uploaded files
  const summary = useMemo(() => {
    const totalFiles = uploadedFiles.length;
    const totalRows = uploadedFiles.reduce((acc, f) => acc + (f.row_count || 0), 0);
    const feeReports = uploadedFiles.filter((f) => f.file_type === "fee_report");
    const operationalLogs = uploadedFiles.filter((f) => f.file_type !== "fee_report");

    return {
      totalFiles,
      totalRows,
      feeReportsCount: feeReports.length,
      operationalLogsCount: operationalLogs.length,
    };
  }, [uploadedFiles]);

  // Filtered source documents
  const filteredFiles = useMemo(() => {
    return uploadedFiles.filter((f) => {
      if (typeFilter !== "ALL" && f.file_type !== typeFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = f.filename?.toLowerCase().includes(q);
        const matchesType = f.file_type?.toLowerCase().includes(q);
        const matchesStatus = f.upload_status?.toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesStatus) {
          return false;
        }
      }
      return true;
    });
  }, [uploadedFiles, typeFilter, search]);

  // File select & preview
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setImportSuccess(null);
    setPreviewData(null);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("company_id", currentCompany);

    try {
      setUploading(true);
      const preview = await api.previewUpload(formData);
      setPreviewData(preview);
    } catch (err) {
      setUploadError(`Preview validation failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("company_id", currentCompany);

    try {
      setImporting(true);
      setUploadError(null);
      const res = await api.importFile(formData);
      setImportSuccess(res);
      setPreviewData(null);
      setSelectedFile(null);
      loadFiles();
    } catch (err) {
      setUploadError(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Submit manual charge
  const handleSubmitCharge = async (e) => {
    e.preventDefault();
    setChargeFeedback(null);
    try {
      await api.createManualCharge({
        ...chargeForm,
        amount: parseFloat(chargeForm.amount) || 0.0,
        company_id: currentCompany,
      });
      setChargeFeedback({
        type: "success",
        message: `Charge ${chargeForm.charge_id} created successfully and added to the financial ledger!`,
      });
      setChargeForm({
        charge_id: "",
        unit_id: "",
        shipment_id: "",
        order_id: "",
        sku: "",
        reason: "inbound_defect_fee",
        amount: "",
        charge_date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      setChargeFeedback({
        type: "error",
        message: `Failed to create charge: ${err.message}`,
      });
    }
  };

  // Submit manual evidence
  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    setEvidenceFeedback(null);
    try {
      await api.createManualEvidence({
        ...evidenceForm,
        company_id: currentCompany,
      });
      setEvidenceFeedback({
        type: "success",
        message: `Evidence record ${evidenceForm.evidence_id} created successfully with vector embeddings!`,
      });
      setEvidenceForm({
        evidence_id: "",
        source_type: "prep",
        unit_id: "",
        shipment_id: "",
        order_id: "",
        sku: "",
        event_type: "fba_prep_compliance",
        finding: "PASS",
        description: "",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setEvidenceFeedback({
        type: "error",
        message: `Failed to create evidence: ${err.message}`,
      });
    }
  };

  const getSourceTypeBadge = (type) => {
    switch (type) {
      case "fee_report":
        return {
          pill: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Receipt className="w-3 h-3 text-amber-600" />,
          label: "Fee Deduction Report",
        };
      case "receiving":
        return {
          pill: "bg-sky-50 text-sky-800 border-sky-200",
          icon: <FileSpreadsheet className="w-3 h-3 text-sky-600" />,
          label: "Receiving Custody Log",
        };
      case "prep":
        return {
          pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
          label: "Prep Compliance Log",
        };
      case "pack":
        return {
          pill: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: <Layers className="w-3 h-3 text-indigo-600" />,
          label: "Pack Sheet Verification",
        };
      case "returns":
        return {
          pill: "bg-purple-50 text-purple-800 border-purple-200",
          icon: <FileText className="w-3 h-3 text-purple-600" />,
          label: "Customer Returns Log",
        };
      default:
        return {
          pill: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <FileCode className="w-3 h-3 text-gray-500" />,
          label: type || "Document",
        };
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "PROCESSED").toUpperCase();
    if (s === "FAILED" || s === "ERROR") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>{s}</span>
        </span>
      );
    }
    if (s === "PROCESSING" || s === "PENDING") {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <RefreshCw className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
          <span>{s}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>{s}</span>
      </span>
    );
  };

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
  };

  const hasActiveFilters = typeFilter !== "ALL" || Boolean(search.trim());

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F8FA]">
      <Navbar onRefresh={loadFiles} />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full page-enter">
        {/* ============================================================ */}
        {/* 1. COMPACT PAGE HEADER                                       */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-sans">
                Data Sources Workspace
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Ingest channel deduction reports and physical warehouse custody logs feeding the audit ledger under strict tenant isolation.
            </p>
            {/* Conceptual Workflow Provenance Banner */}
            <div className="flex items-center space-x-1.5 mt-2.5 text-[11px] font-mono text-gray-500 overflow-x-auto py-0.5">
              <span className="px-2 py-0.5 bg-[#FFF9F2] border border-[#FF9900]/40 rounded font-bold text-[#E88A00]">DATA SOURCE</span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded font-semibold text-gray-700">INGESTION</span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded font-semibold text-gray-700">EVIDENCE / FINANCIAL DATA</span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded font-semibold text-gray-700">INVESTIGATION</span>
              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded font-semibold text-emerald-800">RECOVERY</span>
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-lg shadow-subtle flex items-center space-x-2 self-start sm:self-auto font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Tenant Workspace: <strong className="font-bold text-gray-900">{currentCompany}</strong>
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. COMPACT SUMMARY KPI STRIP                                 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Documents */}
          <div className="bg-white border-2 border-[#FF9900] rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#E88A00] uppercase tracking-wide">
                Tracked Sources
              </span>
              <Database className="w-4 h-4 text-[#FF9900]" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loadingFiles ? "--" : summary.totalFiles}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Ingested source documents</div>
          </div>

          {/* Card 2: Total Records Ingested */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Records Ingested
              </span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loadingFiles ? "--" : summary.totalRows.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Rows committed to ledger</div>
          </div>

          {/* Card 3: Fee Deduction Reports */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Fee Reports
              </span>
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loadingFiles ? "--" : summary.feeReportsCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Marketplace deduction files</div>
          </div>

          {/* Card 4: Operational Custody Logs */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Custody Proof Logs
              </span>
              <Layers className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans tabular-nums text-gray-900">
              {loadingFiles ? "--" : summary.operationalLogsCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">Receiving, prep & pack sheets</div>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadFiles}
              className="px-3 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. WORKSPACE TAB SELECTOR                                    */}
        {/* ============================================================ */}
        <div className="flex items-center p-1 bg-white border border-gray-200 rounded-xl max-w-fit space-x-1 shadow-subtle">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "upload"
                ? "bg-gray-100 text-gray-900 shadow-xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <UploadCloud className="w-4 h-4 text-[#FF9900]" />
            <span>Upload Document (CSV, XLSX, PDF, JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab("charge_manual")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "charge_manual"
                ? "bg-gray-100 text-gray-900 shadow-xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-gray-500" />
            <span>Add Single Charge</span>
          </button>
          <button
            onClick={() => setActiveTab("evidence_manual")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "evidence_manual"
                ? "bg-gray-100 text-gray-900 shadow-xs font-bold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-gray-500" />
            <span>Add Single Evidence</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 4. TAB 1: FILE INGESTION PIPELINE & AUDIT LOG               */}
        {/* ============================================================ */}
        {activeTab === "upload" && (
          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-gray-300 hover:border-[#FF9900] bg-white hover:bg-[#FFF9F2]/30 rounded-xl p-8 sm:p-10 text-center transition-all shadow-subtle group">
              <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-200 text-[#FF9900] flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Upload Channel or Operational Report</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-lg mx-auto leading-relaxed">
                Universal parser automatically classifies fee reports, receiving custody logs, prep inspection reports, pack sheets, and customer returns (.csv, .xlsx, .pdf, .json).
              </p>

              <div className="flex items-center justify-center gap-2 mt-4 text-[11px] font-mono text-gray-500">
                <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200">CSV</span>
                <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200">XLSX</span>
                <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200">PDF</span>
                <span className="px-2 py-0.5 rounded bg-gray-50 border border-gray-200">JSON</span>
              </div>

              <div className="mt-6">
                <label className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#FF9900] hover:bg-[#E88A00] text-white font-semibold text-xs rounded-lg shadow-xs transition cursor-pointer">
                  <FolderOpen className="w-4 h-4" />
                  <span>Select & Inspect File</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.json,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {uploading && (
                <div className="inline-flex items-center space-x-2 text-xs text-[#E88A00] mt-4 bg-orange-50 border border-orange-200 px-3.5 py-1.5 rounded-full animate-fade-in font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF9900]" />
                  <span>Parsing schemas & pre-validating headers...</span>
                </div>
              )}
            </div>

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-rose-600 hover:text-rose-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Import Result Banner */}
            {importSuccess && (
              <div
                className={`p-4 rounded-xl text-xs border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle animate-fade-in ${
                  importSuccess.charges_imported === 0 && importSuccess.evidence_records_imported === 0
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-start sm:items-center space-x-3">
                  {importSuccess.charges_imported === 0 && importSuccess.evidence_records_imported === 0 ? (
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    </div>
                  )}
                  <div>
                    {importSuccess.message ? (
                      <div className="font-semibold">{importSuccess.message}</div>
                    ) : (
                      <div className="font-medium">
                        Processed <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-900 font-bold">{importSuccess.filename}</code>:{" "}
                        <strong className="text-emerald-700 font-bold">{importSuccess.charges_imported || 0}</strong> new charges,{" "}
                        <strong className="text-emerald-700 font-bold">{importSuccess.evidence_records_imported || 0}</strong> new evidence records committed.
                      </div>
                    )}
                    {importSuccess.duplicate_charges_skipped > 0 && (
                      <div className="text-[11px] text-amber-800 mt-1 flex items-center space-x-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Ledger Deduplication:</strong> {importSuccess.duplicate_charges_skipped} rows matched existing Charge IDs and were skipped to protect against double-charging claims.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 self-start sm:self-center">
                  <span className="font-mono text-[10px] text-gray-600 bg-white px-2.5 py-1 rounded border border-gray-200">
                    Tenant: {currentCompany}
                  </span>
                  <button
                    onClick={() => setImportSuccess(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Ingestion Preview & Column Validation */}
            {previewData && (
              <div className="rounded-xl bg-white border border-gray-200 p-5 sm:p-6 space-y-4 shadow-subtle animate-scale-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#E88A00] font-bold bg-[#FFF9F2] border border-[#FF9900]/30 px-2 py-0.5 rounded">
                      Detected Schema: {previewData.file_type?.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 mt-1.5">Ingestion Pre-Validation Preview</h3>
                    <p className="text-xs text-gray-500">Review mapped headers and record samples before committing to the immutable ledger.</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-emerald-700 font-bold font-mono text-sm">{previewData.valid_rows}</span>{" "}
                    <span className="text-gray-500">valid rows</span> &bull;{" "}
                    <span className="text-gray-700 font-mono font-medium">{previewData.columns_detected?.length} columns</span>
                  </div>
                </div>

                {/* Column tags */}
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Detected Column Schema:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {previewData.columns_detected?.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded text-[10px] font-mono bg-gray-50 border border-gray-200 text-gray-700"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sample Preview Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-gray-50 text-gray-600 uppercase font-mono border-b border-gray-200">
                      <tr>
                        {previewData.columns_detected?.slice(0, 6).map((col, idx) => (
                          <th key={idx} className="p-2.5 border-r border-gray-200 last:border-r-0 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 bg-white">
                      {previewData.sample_preview?.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50/60 transition">
                          {previewData.columns_detected?.slice(0, 6).map((col, cIdx) => (
                            <td key={cIdx} className="p-2.5 truncate max-w-xs font-mono text-gray-800 border-r border-gray-100 last:border-r-0">
                              {String(row[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setPreviewData(null)}
                    className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-subtle transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FF9900] hover:bg-[#E88A00] text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>{importing ? "Importing to Ledger..." : "Confirm & Ingest Data"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Inventory Toolbar (Search & Type Filter) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-subtle">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search uploaded source documents by filename or type..."
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

              <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
                {["ALL", "fee_report", "receiving", "prep", "pack"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      typeFilter === t
                        ? "bg-[#FF9900] text-white shadow-xs font-bold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-white border border-gray-200"
                    }`}
                  >
                    {t === "ALL" ? "ALL SOURCES" : t.toUpperCase().replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="text-gray-500 font-medium">Active Filters:</span>
                {typeFilter !== "ALL" && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-gray-700 shadow-xs">
                    <span>Type: {typeFilter}</span>
                    <button
                      onClick={() => setTypeFilter("ALL")}
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
                  Reset filters
                </button>
              </div>
            )}

            {/* List of previously uploaded files */}
            <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-subtle">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Tenant Source Documents & Audit Log
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Immutable audit log of all raw files ingested into this workspace.
                  </p>
                </div>
                <span className="text-xs text-gray-600 font-mono bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                  {filteredFiles.length} files tracked
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-4">Document Category</th>
                      <th className="py-3 px-4">Rows Ingested</th>
                      <th className="py-3 px-4">Processing Status</th>
                      <th className="py-3 px-4">Uploaded Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {loadingFiles ? (
                      <TableSkeletonRows rows={5} cols={6} />
                    ) : filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-gray-500">
                          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto text-gray-400 mb-2">
                            <FolderOpen className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-semibold text-gray-800">No source files logged for this tenant</p>
                          <p className="text-xs text-gray-400 mt-1">Upload your first channel fee report or custody inspection log above.</p>
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
                      filteredFiles.map((f) => {
                        const typeBadge = getSourceTypeBadge(f.file_type);

                        return (
                          <tr
                            key={f.id}
                            className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                            onClick={() => setSelectedSourceDetail(f)}
                          >
                            {/* Filename */}
                            <td className="py-3.5 px-4 font-medium text-gray-900">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                                  <FileSpreadsheet className="w-4 h-4 text-[#FF9900]" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 group-hover:text-[#E88A00] transition-colors">
                                    {f.filename}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs">
                                    ID: {f.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Document Category */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold border ${typeBadge.pill}`}
                              >
                                {typeBadge.icon}
                                <span>{typeBadge.label}</span>
                              </span>
                            </td>

                            {/* Rows Ingested */}
                            <td className="py-3.5 px-4 font-semibold text-gray-900 tabular-nums">
                              {f.row_count ? `${f.row_count.toLocaleString()} rows` : "N/A"}
                            </td>

                            {/* Processing Status */}
                            <td className="py-3.5 px-4">
                              {getStatusBadge(f.upload_status)}
                            </td>

                            {/* Uploaded Timestamp */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                              {f.uploaded_at ? f.uploaded_at.split(".")[0].replace("T", " ") : "N/A"}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => setSelectedSourceDetail(f)}
                                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition"
                                  title="Inspect document metadata"
                                  aria-label="Inspect details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {f.cloudinary_url && (
                                  <a
                                    href={f.cloudinary_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-500 hover:text-[#FF9900] hover:bg-orange-50 rounded transition"
                                    title="Download raw document"
                                    aria-label="Download document"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
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
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. TAB 2: MANUAL CHARGE CREATION                             */}
        {/* ============================================================ */}
        {activeTab === "charge_manual" && (
          <form
            onSubmit={handleSubmitCharge}
            className="bg-white border border-gray-200 rounded-xl p-6 sm:p-7 space-y-5 max-w-2xl shadow-subtle"
          >
            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#FF9900]" />
                <h3 className="text-base font-bold text-gray-900">Record Manual Charge Deduction</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Create a single fee line item to match against operational warehouse evidence.
              </p>
            </div>

            {chargeFeedback && (
              <div
                className={`p-3.5 rounded-lg text-xs border flex items-center space-x-2 ${
                  chargeFeedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {chargeFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{chargeFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-gray-700 font-semibold block mb-1">
                  Charge ID <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. CHG-2026-99"
                  value={chargeForm.charge_id}
                  onChange={(e) => setChargeForm({ ...chargeForm, charge_id: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Unit ID</label>
                <input
                  type="text"
                  placeholder="e.g. UNIT-0014"
                  value={chargeForm.unit_id}
                  onChange={(e) => setChargeForm({ ...chargeForm, unit_id: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Shipment ID</label>
                <input
                  type="text"
                  placeholder="e.g. FBA-DUMMY-101"
                  value={chargeForm.shipment_id}
                  onChange={(e) => setChargeForm({ ...chargeForm, shipment_id: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Order ID</label>
                <input
                  type="text"
                  placeholder="e.g. ORD-DUMMY-50014"
                  value={chargeForm.order_id}
                  onChange={(e) => setChargeForm({ ...chargeForm, order_id: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Catalog SKU</label>
                <input
                  type="text"
                  placeholder="e.g. SKU-LAMP-LED"
                  value={chargeForm.sku}
                  onChange={(e) => setChargeForm({ ...chargeForm, sku: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">
                  Amount ($ USD) <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="38.00"
                  value={chargeForm.amount}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-sans font-medium tabular-nums focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-gray-700 font-semibold block mb-1">
                  Deduction Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={chargeForm.reason}
                  onChange={(e) => setChargeForm({ ...chargeForm, reason: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                >
                  <option value="inbound_defect_fee">Inbound Defect Fee</option>
                  <option value="lost_inbound">Lost Inbound Inventory</option>
                  <option value="refund_issued_item_not_returned">Refund Issued Item Not Returned</option>
                  <option value="damaged_in_warehouse">Damaged In Warehouse</option>
                  <option value="fulfilment_fee_weight_tier">Fulfilment Fee Weight Tier</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#FF9900] hover:bg-[#E88A00] text-white font-semibold text-xs rounded-lg shadow-xs transition"
              >
                Save Charge Record
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* 6. TAB 3: MANUAL EVIDENCE CREATION                           */}
        {/* ============================================================ */}
        {activeTab === "evidence_manual" && (
          <form
            onSubmit={handleSubmitEvidence}
            className="bg-white border border-gray-200 rounded-xl p-6 sm:p-7 space-y-5 max-w-2xl shadow-subtle"
          >
            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <FolderSync className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-gray-900">Record Manual Custody Proof</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Record warehouse floor verification proof to refute channel deduction claims.
              </p>
            </div>

            {evidenceFeedback && (
              <div
                className={`p-3.5 rounded-lg text-xs border flex items-center space-x-2 ${
                  evidenceFeedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {evidenceFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{evidenceFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-gray-700 font-semibold block mb-1">
                  Evidence ID <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. PRP-9912"
                  value={evidenceForm.evidence_id}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_id: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">
                  Source Stage <span className="text-rose-500">*</span>
                </label>
                <select
                  value={evidenceForm.source_type}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, source_type: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                >
                  <option value="receiving">Receiving Line</option>
                  <option value="prep">Prep Station</option>
                  <option value="pack">Pack Bench</option>
                  <option value="returns">Returns Processing</option>
                </select>
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Unit ID</label>
                <input
                  type="text"
                  placeholder="e.g. UNIT-0014"
                  value={evidenceForm.unit_id}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, unit_id: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="text-gray-700 font-semibold block mb-1">
                  Finding Verdict <span className="text-rose-500">*</span>
                </label>
                <select
                  value={evidenceForm.finding}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, finding: e.target.value })}
                  className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900]"
                >
                  <option value="PASS">PASS (Compliant)</option>
                  <option value="FAIL">FAIL (Defect Confirmed)</option>
                  <option value="UNCERTAIN">UNCERTAIN (Ambiguous)</option>
                  <option value="RESTOCKED">RESTOCKED</option>
                  <option value="DISPOSED">DISPOSED</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-gray-700 font-semibold block mb-1">
                  Description / Operational Findings <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Polybag present & sealed: yes. Barcode covered: yes. Item measured at 1.2 lbs."
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                  className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9900] focus:border-[#FF9900] leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#FF9900] hover:bg-[#E88A00] text-white font-semibold text-xs rounded-lg shadow-xs transition"
              >
                Save Evidence Record
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* 7. SOURCE DOCUMENT DETAIL MODAL                              */}
        {/* ============================================================ */}
        {selectedSourceDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedSourceDetail(null)}
          >
            <div
              className="bg-white w-full max-w-lg rounded-2xl border border-gray-200 shadow-modal p-6 relative space-y-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="source-detail-modal-title"
            >
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF9900]">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="source-detail-modal-title" className="text-sm font-bold text-gray-900">{selectedSourceDetail.filename}</h3>
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                      Source ID: {selectedSourceDetail.id}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSourceDetail(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Source Attributes */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Document Classification</div>
                  <div className="font-semibold text-gray-900 mt-0.5 uppercase">
                    {selectedSourceDetail.file_type?.replace(/_/g, " ")}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Committed Rows</div>
                  <div className="font-bold font-sans tabular-nums text-gray-900 mt-0.5">
                    {(selectedSourceDetail.row_count || 0).toLocaleString()} records
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Processing Status</div>
                  <div className="mt-1">
                    {getStatusBadge(selectedSourceDetail.upload_status)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 font-medium">Ingestion Timestamp</div>
                  <div className="font-mono text-gray-900 mt-0.5 text-[11px]">
                    {selectedSourceDetail.uploaded_at?.split(".")[0].replace("T", " ") || "N/A"}
                  </div>
                </div>
              </div>

              {/* Downstream Relationship Link */}
              <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 space-y-2 text-xs">
                <div className="font-bold text-gray-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF9900]" />
                  <span>Downstream Ledger Impact</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  {selectedSourceDetail.file_type === "fee_report"
                    ? "This document populated channel fee deduction line items in the Charges Explorer."
                    : "This document populated verified physical custody logs in the Evidence Workspace."}
                </p>
                <div className="pt-1">
                  {selectedSourceDetail.file_type === "fee_report" ? (
                    <Link
                      href="/charges"
                      className="inline-flex items-center space-x-1 font-semibold text-[#E88A00] hover:underline"
                    >
                      <span>Explore Ingested Charges in Charges Explorer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      href="/evidence"
                      className="inline-flex items-center space-x-1 font-semibold text-[#E88A00] hover:underline"
                    >
                      <span>Explore Ingested Records in Evidence Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                {selectedSourceDetail.cloudinary_url ? (
                  <a
                    href={selectedSourceDetail.cloudinary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                    <span>Download Original File</span>
                  </a>
                ) : (
                  <span />
                )}

                <button
                  onClick={() => setSelectedSourceDetail(null)}
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
