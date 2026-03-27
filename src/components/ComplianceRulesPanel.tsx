"use client";

import { useMemo, useState } from "react";
import { Plus, ShieldPlus, Trash2, X } from "lucide-react";
import type { CustomComplianceRule, CustomRuleSeverity } from "@/lib/complianceRules";

const SEVERITY_OPTIONS: CustomRuleSeverity[] = ["error", "warning", "suggestion"];

export default function ComplianceRulesPanel({
  rules,
  onChange,
  onClose,
}: {
  rules: CustomComplianceRule[];
  onChange: (rules: CustomComplianceRule[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [triggerTerms, setTriggerTerms] = useState("");
  const [replacement, setReplacement] = useState("");
  const [severity, setSeverity] = useState<CustomRuleSeverity>("warning");

  const normalizedCount = useMemo(() => rules.reduce((total, rule) => total + rule.triggerTerms.length, 0), [rules]);

  const addRule = () => {
    const trimmedName = name.trim();
    const trimmedInstruction = instruction.trim();
    const parsedTerms = triggerTerms
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean);

    if (!trimmedName || !trimmedInstruction) return;

    onChange([
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        instruction: trimmedInstruction,
        severity,
        triggerTerms: parsedTerms,
        replacement: replacement.trim() || undefined,
      },
      ...rules,
    ]);

    setName("");
    setInstruction("");
    setTriggerTerms("");
    setReplacement("");
    setSeverity("warning");
  };

  const removeRule = (id: string) => {
    onChange(rules.filter((rule) => rule.id !== id));
  };

  return (
    <div className="mt-4 bg-surface-0 rounded-2xl border border-surface-3 shadow-card overflow-hidden animate-fade-in-up">
      <div className="px-5 py-3.5 border-b border-surface-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldPlus size={16} className="text-brand-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink-0">Custom Compliance Rules</p>
            <p className="text-[0.72rem] text-ink-3">
              Layer your own governance rules on top of MSTP checks.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink-1 transition-colors"
          aria-label="Close custom rules panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-0">
        <div className="p-5 border-b xl:border-b-0 xl:border-r border-surface-2 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Rule name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Required phrase, forbidden term, approval note..."
                className={inputCls}
              />
            </Field>

            <Field label="Severity">
              <select value={severity} onChange={(event) => setSeverity(event.target.value as CustomRuleSeverity)} className={inputCls}>
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Rule instruction">
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Explain exactly what the checker should enforce or reject."
              className={`${inputCls} min-h-[90px] resize-none`}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Trigger terms" hint="Optional comma-separated list for exact-match detection">
              <input
                value={triggerTerms}
                onChange={(event) => setTriggerTerms(event.target.value)}
                placeholder="beta, experimental, internal only"
                className={inputCls}
              />
            </Field>

            <Field label="Replacement hint" hint="Optional suggested replacement">
              <input
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                placeholder="General availability"
                className={inputCls}
              />
            </Field>
          </div>

          <button
            onClick={addRule}
            disabled={!name.trim() || !instruction.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            Save rule
          </button>
        </div>

        <div className="p-5 bg-surface-1/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink-1">Active profile</p>
            <span className="text-[0.7rem] text-ink-3 bg-surface-0 border border-surface-3 px-2 py-1 rounded-full">
              {rules.length} rules, {normalizedCount} trigger{normalizedCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-auto">
            {rules.length === 0 && (
              <div className="rounded-xl border border-dashed border-surface-3 bg-surface-0 px-4 py-6 text-center text-sm text-ink-3">
                Add custom compliance rules for brand voice, legal disclaimers, regulated terms, or approval gates.
              </div>
            )}

            {rules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-surface-3 bg-surface-0 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-0">{rule.name}</p>
                    <p className="text-[0.72rem] text-ink-3 mt-1">{rule.instruction}</p>
                  </div>

                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1 rounded-lg hover:bg-surface-2 text-ink-4 hover:text-accent-red transition-colors"
                    aria-label={`Remove ${rule.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 text-[0.68rem]">
                  <span className="px-2 py-1 rounded-full bg-brand-50 text-brand-700 font-semibold uppercase">
                    {rule.severity}
                  </span>
                  {rule.triggerTerms.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-surface-2 text-ink-2">
                      Triggers: {rule.triggerTerms.join(", ")}
                    </span>
                  )}
                  {rule.replacement && (
                    <span className="px-2 py-1 rounded-full bg-green-50 text-accent-green">
                      Replace with: {rule.replacement}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-surface-3 bg-surface-0 text-sm text-ink-1 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-1 mb-1.5 uppercase tracking-wider">
        {label}
        {hint && <span className="normal-case tracking-normal font-normal text-ink-4 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}