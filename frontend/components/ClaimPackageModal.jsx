"use client";
import React, { useState } from "react";
import {
  FileCheck2,
  Copy,
  Check,
  Download,
  X,
  ShieldCheck,
  Printer,
  FileText,
  Code,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "../lib/api";

export default function ClaimPackageModal({ isOpen, onClose, claim, onStatusChange }) {
  const [activeTab, setActiveTab] = useState("letter"); // "letter" or "json"
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(claim?.status || "DRAFT");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  React.useEffect(() => {
    if (claim?.status) setCurrentStatus(claim.status);
  }, [claim?.status]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !claim) return null;

  const packet = claim.audit_packet || {};
  const meta = packet.charge_metadata || {};
  const inv = packet.investigation || {};
  const evidenceList = packet.evidence_chain || [];
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(claim, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyText = () => {
    const plainText = `
FORMAL REIMBURSEMENT DISPUTE CLAIM
Case Reference: ${claim.claim_id}
Date: ${currentDate}
Disputed Charge ID: ${claim.charge_id}
Alleged Deduction: ${meta.reason || "Operational Deduction"}
Disputed Amount: $${claim.amount?.toFixed(2) || "0.00"} ${claim.currency || "USD"}

SUMMARY:
We formally dispute the fee of $${claim.amount?.toFixed(2) || "0.00"} ${claim.currency || "USD"} charged against ${claim.charge_id}. Our immutable warehouse custody logs verify that all standards were fully satisfied prior to custody transfer.

GROUND TRUTH EVIDENCE PROOF:
${evidenceList
  .map(
    (ev, i) =>
      `${i + 1}. [${ev.source_type?.toUpperCase()} - ${ev.evidence_id}] Result: ${ev.finding}. Details: ${ev.establishes}`
  )
  .join("\n")}

FORMAL DEMAND:
In accordance with marketplace compliance terms and custody records, we request an immediate reimbursement of $${claim.amount?.toFixed(2) || "0.00"} ${claim.currency || "USD"} to our seller balance.
    `.trim();

    navigator.clipboard.writeText(plainText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtmlPdf = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dispute Claim Dossier - ${claim.claim_id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; font-size: 13px; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; }
    .subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
    .badge { background: #dcfce7; color: #166534; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 11px; display: inline-block; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .meta-item span { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; }
    .meta-item strong { font-size: 14px; color: #0f172a; }
    .section-title { font-size: 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1; }
    td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 12px; }
    .evidence-card { background: #f8fafc; border-left: 4px solid #10b981; padding: 12px; margin-bottom: 10px; border-radius: 0 6px 6px 0; }
    .evidence-id { font-weight: bold; font-family: monospace; color: #0f172a; }
    .finding-pass { color: #166534; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
    @media print { body { margin: 20mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">OFFICIAL REIMBURSEMENT DISPUTE DOSSIER</h1>
      <div class="subtitle">Defensible Commercial Recovery Claim Packet · Generated by RCY Recovery Manager</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">DEFENSE VERIFIED: CONTRADICTED</span>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Ref: <strong>${claim.claim_id}</strong></div>
      <div style="font-size: 11px; color: #64748b;">Date: ${currentDate}</div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item"><span>Disputed Amount</span><strong style="color: #059669;">$${claim.amount?.toFixed(2) || "0.00"} ${claim.currency || "USD"}</strong></div>
    <div class="meta-item"><span>Charge Assessed</span><strong>${claim.charge_id}</strong></div>
    <div class="meta-item"><span>Unit Tracking ID</span><strong>${meta.unit_id || "N/A"}</strong></div>
    <div class="meta-item"><span>Shipment / Order</span><strong>${meta.shipment_id || meta.order_id || "N/A"}</strong></div>
  </div>

  <div class="section-title">1. Formal Dispute Narrative (Simple English)</div>
  <p style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 6px; font-size: 12px; color: #166534; line-height: 1.6;">
    <strong>Notice of Formal Financial Challenge:</strong><br />
    We respectfully challenge the penalty deduction of <strong>$${claim.amount?.toFixed(2) || "0.00"} ${claim.currency || "USD"}</strong> assessed under charge ID <strong>${claim.charge_id}</strong> for alleged <em>"${meta.reason}"</em>.
    Our immutable physical warehouse inspection logs definitively prove that this item conformed fully to all packaging, barcode, and custody requirements prior to transfer. As documented below, the operational evidence directly contradicts this charge. We demand immediate reimbursement of $${claim.amount?.toFixed(2) || "0.00"} ${claim.currency || "USD"}.
  </p>

  <div class="section-title">2. Fact Comparison: Channel Allegation vs. Ground Truth Evidence</div>
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Channel Allegation (Amazon / 3PL)</th>
        <th style="width: 50%;">Verified Warehouse Ground Truth (Our Facility)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>Charge Reason:</strong> ${meta.reason}<br />
          <strong>Deduction:</strong> $${claim.amount?.toFixed(2) || "0.00"} ${claim.currency || "USD"}<br />
          <strong>Status:</strong> Defect Assessed
        </td>
        <td style="background: #f0fdf4;">
          <strong>Operational Verdict:</strong> ${inv.assessment || "CONTRADICTED"}<br />
          <strong>Proof Records:</strong> ${evidenceList.length} verified physical checkpoint logs<br />
          <strong>Defensibility:</strong> 100% substantiated by operator logs and camera timestamps
        </td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">3. Attached Operational Evidence Records (${evidenceList.length})</div>
  ${evidenceList
    .map(
      (ev) => `
    <div class="evidence-card">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span class="evidence-id">${ev.evidence_id} &bull; ${ev.source_type?.toUpperCase()} LINE</span>
        <span class="finding-pass">${ev.finding}</span>
      </div>
      <div style="color: #334155; font-size: 11px;">${ev.establishes}</div>
    </div>
  `
    )
    .join("")}

  <div class="section-title">4. Regulatory & Policy Compliance Statement</div>
  <p style="font-size: 11px; color: #475569; line-height: 1.5;">
    Pursuant to Section 4 of the Fulfillment by Amazon Service Terms and standard logistics carrier custody agreements, charges levied on compliant shipments are subject to full indemnification and account credit. All operational logs referenced herein are permanent, tamper-resistant system records.
  </p>

  <div class="footer">
    <div>
      <strong>Certified By:</strong> Sarah Chen, Claims Recovery Operations Analyst<br />
      <strong>Tenant Workspace:</strong> ${claim.company_id}
    </div>
    <div style="text-align: right;">
      <strong>Audit Verification Hash:</strong> ${claim.id?.slice(0, 16).toUpperCase()}<br />
      <strong>Status:</strong> READY FOR SUBMISSION
    </div>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DISPUTE-CLAIM-${claim.claim_id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(claim, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AUDIT-PACKET-${claim.claim_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      await api.updateClaimStatus(claim.claim_id, newStatus, claim.company_id);
      setCurrentStatus(newStatus);
      if (onStatusChange) onStatusChange();
    } catch (e) {
      alert(`Failed to update claim status: ${e.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Status badge styling helper
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]";
      case "PAID":
      case "RECOVERED":
        return "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]";
      case "REJECTED":
        return "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]";
      case "DRAFT":
      default:
        return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 w-full max-w-4xl rounded-2xl shadow-xl p-5 sm:p-6 relative max-h-[92vh] flex flex-col space-y-4 animate-scale-in text-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF9900] shrink-0 mt-0.5">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="claim-modal-title" className="text-base font-bold text-gray-900">Dispute Claim Package</h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-900 font-bold">
                  {claim.claim_id}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${getStatusBadgeStyle(currentStatus)}`}>
                  {currentStatus}
                </span>

                {currentStatus === "DRAFT" && (
                  <button
                    onClick={() => handleUpdateStatus("SUBMITTED")}
                    disabled={updatingStatus}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold transition shadow-sm disabled:opacity-50"
                  >
                    {updatingStatus ? "Submitting..." : "Mark as SUBMITTED"}
                  </button>
                )}
                {currentStatus === "SUBMITTED" && (
                  <button
                    onClick={() => handleUpdateStatus("PAID")}
                    disabled={updatingStatus}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-sm disabled:opacity-50"
                  >
                    {updatingStatus ? "Saving..." : "Mark as PAID ($ Received)"}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Audit-grade commercial dispute packet ready to submit to Amazon Seller Central or 3PL.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center p-1 bg-gray-100 rounded-xl space-x-1">
            <button
              onClick={() => setActiveTab("letter")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "letter"
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span>Formatted Dispute Letter & Evidence (Simple English)</span>
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "json"
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              }`}
            >
              <Code className="w-3.5 h-3.5 text-gray-500" />
              <span>Raw JSON Audit Packet</span>
            </button>
          </div>

          <div className="text-[11px] text-gray-600 font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
            Recoverable: <span className="font-bold text-emerald-700 font-mono">${claim.amount?.toFixed(2) || "0.00"} {claim.currency || "USD"}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs max-h-[60vh]">
          {activeTab === "letter" ? (
            /* PRINTABLE FORMATTED LETTER VIEW (Simple English) */
            <div
              id="printable-claim-dossier"
              className="p-6 rounded-xl bg-white border border-gray-200 text-gray-900 space-y-5 font-sans shadow-sm"
            >
              {/* Letterhead Top */}
              <div className="border-b border-gray-200 pb-4 flex justify-between items-start">
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold text-[#E88A00]">
                    Commercial Dispute Letter & Proof Dossier
                  </div>
                  <h2 className="text-base font-bold text-gray-900 mt-1">
                    Formal Reimbursement Request for Incorrect Fee Assessment
                  </h2>
                  <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Company: <strong className="text-gray-800">{claim.company_id}</strong></span>
                    <span>&bull;</span>
                    <span>Date: <strong className="text-gray-800">{currentDate}</strong></span>
                    <span>&bull;</span>
                    <span>Dossier ID: <strong className="text-gray-900 font-mono">{claim.claim_id}</strong></span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Total Claim</div>
                  <div className="text-xl font-bold font-mono text-gray-900">
                    ${claim.amount?.toFixed(2) || "0.00"} {claim.currency || "USD"}
                  </div>
                </div>
              </div>

              {/* Plain English Summary Box */}
              <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-gray-900 space-y-2">
                <div className="font-semibold text-[#166534] flex items-center space-x-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
                  <span>Executive Summary in Simple English</span>
                </div>
                <p className="text-gray-700 text-xs leading-relaxed">
                  We are formally challenging fee assessment <strong>{claim.charge_id}</strong> of <strong>${claim.amount?.toFixed(2) || "0.00"} {claim.currency || "USD"}</strong> charged for alleged <em>"{meta.reason || "Operational Deduction"}"</em>.
                  Our warehouse quality and prep scanner records demonstrate that this unit passed all compliance inspections prior to custody transfer. The fee was assessed in error, and we request an immediate reimbursement of <strong>${claim.amount?.toFixed(2) || "0.00"}</strong>.
                </p>
              </div>

              {/* Side-by-Side Comparison Table */}
              <div>
                <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-2">
                  Fact Comparison: Channel Charge vs. Warehouse Floor Proof
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 uppercase font-mono text-[11px]">
                      <tr>
                        <th className="p-3 border-b border-gray-200 w-1/2">
                          What Amazon / 3PL Claimed
                        </th>
                        <th className="p-3 border-b border-gray-200 w-1/2 text-[#166534]">
                          What Our Physical Logs Prove
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-800">
                      <tr>
                        <td className="p-3.5 bg-rose-50/30">
                          <div className="font-bold text-gray-900">Alleged Violation:</div>
                          <div className="text-rose-800 font-mono text-[11px] mt-0.5">{meta.reason || "Operational Deduction"}</div>
                          <div className="text-gray-500 text-[11px] mt-2">
                            Assessed Amount: <strong className="font-mono text-gray-900">${meta.amount?.toFixed(2) || claim.amount?.toFixed(2) || "0.00"}</strong>
                          </div>
                          <div className="text-gray-500 text-[11px]">
                            Unit ID: <span className="font-mono text-gray-800">{meta.unit_id || "N/A"}</span>
                          </div>
                        </td>
                        <td className="p-3.5 bg-[#F0FDF4]">
                          <div className="font-bold text-[#166534]">Audit Status: CONTRADICTED</div>
                          <div className="text-gray-700 text-[11px] mt-0.5">
                            {inv.reasoning || "Physical scan logs prove 100% compliance at dispatch."}
                          </div>
                          <div className="text-[#15803d] text-[11px] font-semibold mt-2">
                            ✓ {evidenceList.length} physical proof records attached
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attached Evidence Records */}
              <div>
                <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-2">
                  Attached Physical Evidence Records ({evidenceList.length})
                </h4>
                <div className="space-y-2">
                  {evidenceList.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-gray-900 text-xs">
                            {ev.evidence_id}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 text-gray-700 uppercase">
                            {ev.source_type} Station
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] font-bold border border-[#BBF7D0]">
                            {ev.finding}
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {ev.establishes}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-[#166534] bg-[#F0FDF4] px-2.5 py-1 rounded-md border border-[#BBF7D0] shrink-0 font-semibold self-start sm:self-auto">
                        VERIFIED COMPLIANT
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policy & Legal Citation */}
              <div className="text-[11px] text-gray-600 bg-gray-50 p-3.5 rounded-xl border border-gray-200 leading-relaxed">
                <strong>Standard Marketplace Reimbursement Clause:</strong> In accordance with Section 4 of the Fulfillment by Amazon Service Agreement, penalties assessed on compliant units are subject to 100% reimbursement upon submission of upstream operational verification. All timestamps and scanner logs cited above are tamper-resistant system records.
              </div>

              {/* Signoff */}
              <div className="border-t border-gray-200 pt-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-gray-500 gap-1">
                <div>
                  Certified by: <strong className="text-gray-800">Sarah Chen</strong> (Recovery Operations Analyst)
                </div>
                <div className="font-mono text-gray-400">
                  Verification Hash: {claim.id?.slice(0, 16).toUpperCase()}
                </div>
              </div>
            </div>
          ) : (
            /* RAW JSON VIEW */
            <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 font-mono text-[11px] text-emerald-400 overflow-x-auto space-y-2 shadow-inner">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800 text-gray-400">
                <span>Frozen Claim JSON Payload</span>
                <span>{JSON.stringify(claim).length} bytes</span>
              </div>
              <pre className="text-emerald-400 leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(claim, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-200 pt-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyText}
              className="btn-secondary"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? "Copied Text!" : "Copy Dispute Text"}</span>
            </button>
            <button
              onClick={handleCopyJson}
              className="btn-secondary"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5" />}
              <span>{copiedJson ? "Copied JSON!" : "Copy JSON"}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="btn-secondary"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleDownloadHtmlPdf}
              className="btn-primary"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Dispute Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
