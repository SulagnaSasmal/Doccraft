"use client";

import { useMemo, useState } from "react";
import { diffLines } from "diff";
import { ArrowLeftRight, Clock3, GitCompare, X } from "lucide-react";

interface VersionOption {
  id: string;
  label: string;
  content: string;
  timestamp?: number;
}

interface DiffRow {
  leftNumber: number | null;
  leftText: string;
  rightNumber: number | null;
  rightText: string;
  type: "same" | "added" | "removed" | "changed";
}

function splitLinesPreserve(value: string) {
  return value.split(/\r?\n/);
}

function buildRows(previous: string, current: string): DiffRow[] {
  const parts = diffLines(previous, current);
  const rows: DiffRow[] = [];
  let leftNumber = 1;
  let rightNumber = 1;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];

    if (part.removed && parts[index + 1]?.added) {
      const removedLines = splitLinesPreserve(part.value);
      const addedLines = splitLinesPreserve(parts[index + 1].value);
      const length = Math.max(removedLines.length, addedLines.length);

      for (let offset = 0; offset < length; offset += 1) {
        const leftText = removedLines[offset] ?? "";
        const rightText = addedLines[offset] ?? "";
        const hasLeft = offset < removedLines.length && leftText !== "";
        const hasRight = offset < addedLines.length && rightText !== "";

        if (!hasLeft && !hasRight) continue;

        rows.push({
          leftNumber: hasLeft ? leftNumber++ : null,
          leftText,
          rightNumber: hasRight ? rightNumber++ : null,
          rightText,
          type: "changed",
        });
      }

      index += 1;
      continue;
    }

    const lines = splitLinesPreserve(part.value);
    for (const line of lines) {
      if (line === "" && lines.length > 1) continue;

      if (part.added) {
        rows.push({
          leftNumber: null,
          leftText: "",
          rightNumber: rightNumber++,
          rightText: line,
          type: "added",
        });
        continue;
      }

      if (part.removed) {
        rows.push({
          leftNumber: leftNumber++,
          leftText: line,
          rightNumber: null,
          rightText: "",
          type: "removed",
        });
        continue;
      }

      rows.push({
        leftNumber: leftNumber++,
        leftText: line,
        rightNumber: rightNumber++,
        rightText: line,
        type: "same",
      });
    }
  }

  return rows;
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "Baseline";
  return new Date(timestamp).toLocaleString();
}

export default function VersionDiffPanel({
  currentContent,
  versions,
  onClose,
}: {
  currentContent: string;
  versions: VersionOption[];
  onClose: () => void;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState(versions[0]?.id || "");

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) || versions[0];
  const rows = useMemo(
    () => buildRows(selectedVersion?.content || "", currentContent),
    [currentContent, selectedVersion]
  );

  const changedRows = rows.filter((row) => row.type !== "same").length;

  return (
    <div className="mt-4 bg-white rounded-2xl border border-surface-3 shadow-card overflow-hidden animate-fade-in-up">
      <div className="px-5 py-3.5 border-b border-surface-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <GitCompare size={16} className="text-brand-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink-0">Version Diff</p>
            <p className="text-[0.72rem] text-ink-3">
              Compare your current draft with any saved version before publishing.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink-1 transition-colors"
          aria-label="Close version diff"
        >
          <X size={15} />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-surface-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-ink-2">
          <ArrowLeftRight size={13} className="text-brand-500" />
          Compare against
        </div>

        <select
          value={selectedVersionId}
          onChange={(event) => setSelectedVersionId(event.target.value)}
          className="min-w-[220px] px-3 py-2 rounded-lg border border-surface-3 bg-surface-1 text-sm text-ink-0 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-3 text-[0.72rem] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={12} />
            {formatTimestamp(selectedVersion?.timestamp)}
          </span>
          <span className="px-2 py-1 rounded-full bg-brand-50 text-brand-700 font-semibold">
            {changedRows} changed line{changedRows === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2">
        <div className="border-r border-surface-2">
          <div className="px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-3 bg-surface-1 border-b border-surface-2">
            Previous Version
          </div>
        </div>
        <div>
          <div className="px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-3 bg-surface-1 border-b border-surface-2">
            Current Draft
          </div>
        </div>
      </div>

      <div className="max-h-[460px] overflow-auto">
        {rows.map((row, index) => {
          const leftChanged = row.type === "removed" || row.type === "changed";
          const rightChanged = row.type === "added" || row.type === "changed";

          return (
            <div key={`${row.leftNumber}-${row.rightNumber}-${index}`} className="grid grid-cols-1 xl:grid-cols-2">
              <LineCell
                lineNumber={row.leftNumber}
                text={row.leftText}
                changed={leftChanged}
                variant={row.type === "removed" ? "removed" : row.type === "changed" ? "changed" : "same"}
              />
              <LineCell
                lineNumber={row.rightNumber}
                text={row.rightText}
                changed={rightChanged}
                variant={row.type === "added" ? "added" : row.type === "changed" ? "changed" : "same"}
                withBorder
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineCell({
  lineNumber,
  text,
  changed,
  variant,
  withBorder,
}: {
  lineNumber: number | null;
  text: string;
  changed: boolean;
  variant: "same" | "added" | "removed" | "changed";
  withBorder?: boolean;
}) {
  const bgClass = changed
    ? variant === "added"
      ? "bg-green-50"
      : variant === "removed"
      ? "bg-red-50"
      : "bg-amber-50"
    : "bg-white";

  return (
    <div className={`grid grid-cols-[56px_1fr] ${withBorder ? "xl:border-l xl:border-surface-2" : ""} border-b border-surface-2 ${bgClass}`}>
      <div className="px-3 py-2 text-right text-[0.68rem] text-ink-4 bg-surface-1/60 border-r border-surface-2 select-none">
        {lineNumber ?? ""}
      </div>
      <pre className="px-3 py-2 text-[0.74rem] leading-6 text-ink-1 whitespace-pre-wrap break-words font-mono">
        {text || " "}
      </pre>
    </div>
  );
}