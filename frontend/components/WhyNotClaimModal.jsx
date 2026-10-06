"use client";
import React from "react";
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert, X } from "lucide-react";

export default function WhyNotClaimModal({ isOpen, onClose, investigation, charge }) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !investigation) return null;

  const coverage = investigation.coverage_summary || {};
  const verified = coverage.verified_items || [];
  const missing = coverage.missing_items || [];
  const explanation = coverage.why_not_claim || investigation.reasoning;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 w-full max-w-lg rounded-2xl shadow-xl p-6 relative space-y-5 animate-scale-in text-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="why-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="why-modal-title" className="text-base font-bold text-gray-900">Why Can't This Charge Be Claimed?</h3>
              <p className="text-xs text-gray-500">Forensic conservative reasoning disclosure</p>
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

        {/* Verdict Callout */}
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
          <div className="font-semibold text-amber-900 mb-1 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>
              System Decision: <strong className="font-mono text-amber-950">{investigation.assessment}</strong> (Potential Recovery: $0.00)
            </span>
          </div>
          <p className="text-gray-700 leading-relaxed text-xs mt-1.5">{explanation}</p>
        </div>

        {/* Verified vs Missing Audit Checklist */}
        <div className="space-y-3.5">
          <div>
            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <span>Verified Operational Footprint</span>
            </h4>
            <div className="space-y-1.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              {verified.length === 0 ? (
                <div className="text-xs text-gray-400 italic">No operational records identified</div>
              ) : (
                verified.map((v, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span className="text-gray-700 leading-snug">{v}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <span>Missing Proof Required for Defensible Claim</span>
            </h4>
            <div className="space-y-1.5 bg-rose-50/50 p-3.5 rounded-xl border border-rose-200">
              {missing.length === 0 ? (
                <div className="text-xs text-gray-400 italic">No specific missing item logged</div>
              ) : (
                missing.map((m, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs text-rose-800">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="text-gray-700 leading-snug">{m}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Account Standing Principle */}
        <div className="text-[11px] text-gray-600 border-t border-gray-100 pt-3 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
          <span className="font-semibold text-gray-800">Conservative Safety Principle:</span> Marketplace
          channels penalize sellers who submit speculative disputes. Recovery Manager refuses to gamble your channel
          privileges without verifiable, tamper-resistant pre-shipment proof.
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
