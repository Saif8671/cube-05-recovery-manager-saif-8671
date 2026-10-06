"use client";
import React from "react";

const SHIMMER_STYLE = {
  background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s linear infinite",
};

export function TableSkeletonRows({ rows = 5, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, cIdx) => {
            const widths = ["w-20", "w-28", "w-32", "w-16", "w-24", "w-20"];
            const widthClass = widths[cIdx % widths.length];
            const isRight = cIdx === 3 || cIdx === cols - 1;

            return (
              <td key={cIdx} className={`py-4 px-5 ${isRight ? "text-right" : ""}`}>
                <div
                  className={`h-4 rounded-md ${widthClass} ${
                    isRight ? "ml-auto" : ""
                  }`}
                  style={{
                    ...SHIMMER_STYLE,
                    animationDelay: `${rIdx * 0.08 + cIdx * 0.03}s`,
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-subtle space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2.5">
          <div
            className="h-3 w-28 rounded-md"
            style={SHIMMER_STYLE}
          />
          <div
            className="h-8 w-36 rounded-md"
            style={{
              ...SHIMMER_STYLE,
              animationDelay: "0.1s",
            }}
          />
        </div>
        <div
          className="w-10 h-10 rounded-xl"
          style={{
            ...SHIMMER_STYLE,
            animationDelay: "0.2s",
          }}
        />
      </div>
      <div
        className="pt-3 border-t border-gray-100 h-4 w-44 rounded-md"
        style={{
          ...SHIMMER_STYLE,
          animationDelay: "0.15s",
        }}
      />
    </div>
  );
}

export function EvidenceCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-subtle space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div
            className="h-4 w-16 rounded-md"
            style={SHIMMER_STYLE}
          />
          <div
            className="h-4 w-28 rounded-md"
            style={{
              ...SHIMMER_STYLE,
              animationDelay: "0.1s",
            }}
          />
        </div>
        <div
          className="h-5 w-20 rounded-md"
          style={{
            ...SHIMMER_STYLE,
            animationDelay: "0.15s",
          }}
        />
      </div>
      <div className="space-y-1.5 pt-1">
        <div
          className="h-3.5 w-full rounded-md"
          style={{
            ...SHIMMER_STYLE,
            animationDelay: "0.1s",
          }}
        />
        <div
          className="h-3.5 w-4/5 rounded-md"
          style={{
            ...SHIMMER_STYLE,
            animationDelay: "0.2s",
          }}
        />
      </div>
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
        <div
          className="h-3 w-24 rounded-md"
          style={{
            ...SHIMMER_STYLE,
            animationDelay: "0.15s",
          }}
        />
        <div
          className="h-3 w-20 rounded-md"
          style={{
            ...SHIMMER_STYLE,
            animationDelay: "0.25s",
          }}
        />
      </div>
    </div>
  );
}
