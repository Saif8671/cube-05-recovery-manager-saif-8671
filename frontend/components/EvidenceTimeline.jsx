"use client";
import React from "react";
import {
  PackageCheck,
  CheckCircle,
  Truck,
  RotateCcw,
  Receipt,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function EvidenceTimeline({ timeline = [] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-xl border border-gray-200 text-gray-500 text-xs shadow-subtle">
        No chronological operational events recorded for this unit.
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case "RECEIVING":
        return <PackageCheck className="w-4 h-4 text-sky-600" />;
      case "PREP":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "PACK":
        return <Layers className="w-4 h-4 text-indigo-600" />;
      case "RETURNS":
        return <RotateCcw className="w-4 h-4 text-purple-600" />;
      case "FINANCIAL_CHARGE":
        return <Receipt className="w-4 h-4 text-rose-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCardStyle = (type) => {
    switch (type) {
      case "RECEIVING":
        return "border-sky-200 bg-sky-50/20 hover:border-sky-300";
      case "PREP":
        return "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300";
      case "PACK":
        return "border-indigo-200 bg-indigo-50/20 hover:border-indigo-300";
      case "RETURNS":
        return "border-purple-200 bg-purple-50/20 hover:border-purple-300";
      case "FINANCIAL_CHARGE":
        return "border-rose-200 bg-rose-50/20 hover:border-rose-300";
      default:
        return "border-gray-200 bg-white hover:border-gray-300";
    }
  };

  const getNodeColor = (type) => {
    switch (type) {
      case "RECEIVING":
        return "bg-sky-500 ring-sky-100";
      case "PREP":
        return "bg-emerald-500 ring-emerald-100";
      case "PACK":
        return "bg-indigo-500 ring-indigo-100";
      case "RETURNS":
        return "bg-purple-500 ring-purple-100";
      case "FINANCIAL_CHARGE":
        return "bg-rose-500 ring-rose-100";
      default:
        return "bg-gray-400 ring-gray-100";
    }
  };

  return (
    <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:sm:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
      {timeline.map((event, idx) => (
        <div key={idx} className="relative flex items-start space-x-3 sm:space-x-4 group">
          {/* Node Dot with Ring */}
          <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center group-hover:border-gray-400 transition-colors duration-150">
            <span className={`w-2.5 h-2.5 rounded-full ${getNodeColor(event.type)} ring-4`} />
          </div>

          {/* Event Content Card */}
          <div className={`flex-1 p-4 rounded-xl border ${getCardStyle(event.type)} transition-all duration-150 shadow-subtle`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded bg-white border border-gray-200 shadow-xs flex-shrink-0">
                  {getIcon(event.type)}
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-gray-900">{event.title}</h4>
              </div>
              <div className="text-[11px] font-mono text-gray-500 flex items-center space-x-1.5 bg-white px-2 py-0.5 rounded border border-gray-200 self-start sm:self-auto">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>{event.timestamp || "Undated"}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {event.description}
            </p>

            {event.finding && (
              <div className="mt-2.5 flex items-center space-x-2 pt-2 border-t border-gray-100">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Custody Status:</span>
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  event.finding === "PASS"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : event.finding === "FAIL"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }`}>
                  <span>{event.finding}</span>
                </span>
                {event.relevance && (
                  <span className="text-[10px] font-mono text-gray-500 ml-auto bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                    {event.relevance}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

