"use client";
import React, { useState } from "react";
import {
  Receipt,
  Truck,
  ShoppingCart,
  Box,
  CheckCircle,
  PackageCheck,
  RotateCcw,
  Layers,
  Info,
  X,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function EvidenceGraph({ graphData }) {
  const [activeNode, setActiveNode] = useState(null);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="p-10 text-center bg-white rounded-xl border border-gray-200 text-gray-500 text-xs shadow-subtle">
        No graph relationships mapped for this record.
      </div>
    );
  }

  const { nodes, edges } = graphData;

  // Separate nodes by hierarchy
  const chargeNode = nodes.find((n) => n.type === "charge");
  const unitNode = nodes.find((n) => n.type === "unit");
  const shipmentNode = nodes.find((n) => n.type === "shipment");
  const orderNode = nodes.find((n) => n.type === "order");
  const skuNode = nodes.find((n) => n.type === "sku");
  const evidenceNodes = nodes.filter((n) => n.type === "evidence");

  const getNodeIcon = (type, category) => {
    if (type === "charge") return <Receipt className="w-4 h-4 text-rose-600" />;
    if (type === "unit") return <Box className="w-4 h-4 text-amber-600" />;
    if (type === "shipment") return <Truck className="w-4 h-4 text-sky-600" />;
    if (type === "order") return <ShoppingCart className="w-4 h-4 text-indigo-600" />;
    if (type === "sku") return <Box className="w-4 h-4 text-emerald-600" />;
    if (category?.includes("PREP")) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (category?.includes("RECEIV")) return <PackageCheck className="w-4 h-4 text-sky-600" />;
    if (category?.includes("PACK")) return <Layers className="w-4 h-4 text-indigo-600" />;
    if (category?.includes("RETURN")) return <RotateCcw className="w-4 h-4 text-purple-600" />;
    return <Info className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="p-5 sm:p-6 rounded-xl bg-white border border-gray-200 shadow-subtle">
        {/* Header bar */}
        <div className="text-xs font-semibold text-gray-900 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#FF9900]" />
            <span className="text-sm font-bold text-gray-900 font-sans">Multi-Hop Traversal Graph</span>
            <span className="text-xs text-gray-500 font-normal hidden sm:inline">&bull; Tracing deduction root to operational proof</span>
          </div>
          <span className="text-[11px] font-mono font-medium text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 self-start sm:self-auto">
            {nodes.length} Nodes &bull; {edges.length} Relational Edges
          </span>
        </div>

        {/* Visual Graph Hierarchy (Horizontal scroll container for responsive mobile/tablet) */}
        <div className="overflow-x-auto pb-3 pt-1">
          <div className="min-w-[680px] flex items-center justify-between gap-4 py-2 px-1">
            {/* Column 1: Financial Charge */}
            {chargeNode && (
              <div className="flex flex-col items-center">
                <div
                  onClick={() => setActiveNode(chargeNode)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveNode(chargeNode)}
                  className={`w-48 p-3.5 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                    activeNode?.id === chargeNode.id
                      ? "bg-rose-50 border-rose-400 ring-2 ring-rose-200 shadow-sm"
                      : "bg-white border-rose-200 hover:border-rose-400 hover:bg-rose-50/40 shadow-subtle"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <div className="p-1 rounded-md bg-rose-100/70">{getNodeIcon("charge")}</div>
                    <span className="font-bold text-xs text-rose-900 font-mono truncate">{chargeNode.label}</span>
                  </div>
                  <div className="text-[11px] text-gray-900 font-semibold truncate">{chargeNode.details}</div>
                  <div className="text-[9px] text-rose-700 mt-1 uppercase font-bold tracking-wider">Origin Deduction</div>
                  {chargeNode.status && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      {chargeNode.status}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Directed Connector Arrow 1 */}
            <div className="flex flex-col items-center text-gray-400 px-1">
              <span className="text-[10px] font-mono mb-1 text-gray-500 font-medium">hops to</span>
              <div className="w-12 h-0.5 bg-gray-300 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-gray-400" />
              </div>
            </div>

            {/* Column 2: Physical Unit / Shipment / Order / SKU Nodes */}
            <div className="flex flex-col space-y-2.5">
              {unitNode && (
                <div
                  onClick={() => setActiveNode(unitNode)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveNode(unitNode)}
                  className={`w-48 p-2.5 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                    activeNode?.id === unitNode.id
                      ? "bg-amber-50 border-amber-400 ring-2 ring-amber-200 shadow-sm"
                      : "bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50/40 shadow-subtle"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <div className="p-1 rounded bg-amber-100/70">{getNodeIcon("unit")}</div>
                    <span className="font-semibold text-xs text-amber-900 font-mono truncate">{unitNode.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 font-mono truncate">{unitNode.details}</div>
                </div>
              )}

              {shipmentNode && (
                <div
                  onClick={() => setActiveNode(shipmentNode)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveNode(shipmentNode)}
                  className={`w-48 p-2.5 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                    activeNode?.id === shipmentNode.id
                      ? "bg-sky-50 border-sky-400 ring-2 ring-sky-200 shadow-sm"
                      : "bg-white border-sky-200 hover:border-sky-400 hover:bg-sky-50/40 shadow-subtle"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <div className="p-1 rounded bg-sky-100/70">{getNodeIcon("shipment")}</div>
                    <span className="font-semibold text-xs text-sky-900 font-mono truncate">{shipmentNode.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 font-mono truncate">{shipmentNode.details}</div>
                </div>
              )}

              {orderNode && (
                <div
                  onClick={() => setActiveNode(orderNode)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveNode(orderNode)}
                  className={`w-48 p-2.5 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                    activeNode?.id === orderNode.id
                      ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-sm"
                      : "bg-white border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/40 shadow-subtle"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <div className="p-1 rounded bg-indigo-100/70">{getNodeIcon("order")}</div>
                    <span className="font-semibold text-xs text-indigo-900 font-mono truncate">{orderNode.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 font-mono truncate">{orderNode.details}</div>
                </div>
              )}

              {skuNode && (
                <div
                  onClick={() => setActiveNode(skuNode)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveNode(skuNode)}
                  className={`w-48 p-2.5 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
                    activeNode?.id === skuNode.id
                      ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 shadow-sm"
                      : "bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-subtle"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <div className="p-1 rounded bg-emerald-100/70">{getNodeIcon("sku")}</div>
                    <span className="font-semibold text-xs text-emerald-900 font-mono truncate">{skuNode.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5 font-mono truncate">{skuNode.details}</div>
                </div>
              )}
            </div>

            {/* Directed Connector Arrow 2 */}
            <div className="flex flex-col items-center text-gray-400 px-1">
              <span className="text-[10px] font-mono mb-1 text-gray-500 font-medium">proves via</span>
              <div className="w-12 h-0.5 bg-gray-300 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-gray-400" />
              </div>
            </div>

            {/* Column 3: Operational Evidence Leaves */}
            <div className="flex flex-col space-y-2 max-h-80 overflow-y-auto pr-1">
              {evidenceNodes.length === 0 ? (
                <div className="text-[11px] text-gray-500 italic p-4 border border-gray-200 rounded-xl bg-gray-50 text-center w-56">
                  No upstream evidence records
                </div>
              ) : (
                evidenceNodes.map((ev) => {
                  const isPass = ev.finding === "PASS";
                  const isFail = ev.finding === "FAIL";
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setActiveNode(ev)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setActiveNode(ev)}
                      className={`w-60 p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                        activeNode?.id === ev.id
                          ? "bg-[#FFF9F2] border-[#FF9900] ring-2 ring-[#FF9900]/20 shadow-sm"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60 shadow-subtle"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <div className="p-1 rounded bg-gray-100 flex-shrink-0">
                            {getNodeIcon("evidence", ev.category)}
                          </div>
                          <span className="font-bold text-[11px] text-gray-900 truncate font-mono">
                            {ev.label}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                            isPass
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isFail
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {ev.finding}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 line-clamp-1 mt-1 leading-snug">
                        {ev.details}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      {activeNode && (
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-gray-200 shadow-subtle animate-scale-in">
          <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                {activeNode.category || activeNode.type}
              </span>
              <h4 className="text-sm font-bold text-gray-900 font-mono mt-1.5">{activeNode.label}</h4>
            </div>
            <button
              onClick={() => setActiveNode(null)}
              aria-label="Close details"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-sans">{activeNode.details}</p>
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-gray-100 text-[11px] font-mono text-gray-500">
            {activeNode.timestamp && (
              <div>
                <span className="text-gray-400">Captured:</span>{" "}
                <span className="text-gray-800 font-medium">{activeNode.timestamp}</span>
              </div>
            )}
            {activeNode.finding && (
              <div>
                <span className="text-gray-400">Finding:</span>{" "}
                <span className="text-gray-800 font-semibold">{activeNode.finding}</span>
              </div>
            )}
            {activeNode.status && (
              <div>
                <span className="text-gray-400">Status:</span>{" "}
                <span className="text-gray-800 font-semibold">{activeNode.status}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

