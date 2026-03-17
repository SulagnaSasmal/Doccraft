export type CustomRuleSeverity = "error" | "warning" | "suggestion";

export interface CustomComplianceRule {
  id: string;
  name: string;
  instruction: string;
  severity: CustomRuleSeverity;
  triggerTerms: string[];
  replacement?: string;
}

export const CUSTOM_COMPLIANCE_RULES_STORAGE_KEY = "doccraft_custom_compliance_rules";

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

export function sanitizeComplianceRules(raw: unknown): CustomComplianceRule[] {
  if (!Array.isArray(raw)) return [];

  const results: CustomComplianceRule[] = [];

  for (const rule of raw) {
    if (!rule || typeof rule !== "object") continue;

    const candidate = rule as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const instruction = typeof candidate.instruction === "string"
      ? candidate.instruction.trim()
      : "";
    const severity = candidate.severity;
    const replacement = typeof candidate.replacement === "string"
      ? candidate.replacement.trim()
      : "";

    if (!id || !name || !instruction) continue;
    if (severity !== "error" && severity !== "warning" && severity !== "suggestion") {
      continue;
    }

    results.push({
      id,
      name,
      instruction,
      severity,
      triggerTerms: normalizeStringArray(candidate.triggerTerms),
      replacement: replacement || undefined,
    });
  }

  return results;
}

export function serializeComplianceRules(rules: CustomComplianceRule[]): string {
  return JSON.stringify(sanitizeComplianceRules(rules));
}