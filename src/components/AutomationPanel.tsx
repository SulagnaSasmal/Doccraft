"use client";

import { useState } from "react";
import { X, Webhook, Copy, Check, ExternalLink, AlertTriangle, Terminal, BookOpen } from "lucide-react";

interface AutomationPanelProps {
  onClose: () => void;
}

const CURL_EXAMPLE = `curl -X POST \\
  https://YOUR_VERCEL_URL/api/webhooks/ci \\
  -H "Content-Type: application/json" \\
  -H "x-doccraft-secret: YOUR_SECRET" \\
  -d '{
    "repositoryUrl": "https://github.com/owner/repo",
    "branch": "main",
    "docType": "release-notes",
    "audience": "mixed",
    "tone": "instructional"
  }'`;

const GITHUB_ACTION_YAML = [
  "name: DocCraft Auto-Docs",
  "on:",
  "  push:",
  "    branches: [main]",
  '    paths: ["src/**", "docs/**"]',
  "",
  "jobs:",
  "  generate-docs:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - uses: actions/checkout@v4",
  "        with:",
  "          fetch-depth: 2",
  "      - name: Get changed files",
  "        id: changed",
  "        run: |",
  '          echo "files=$(git diff --name-only HEAD~1 | jq -R . | jq -s .)" >> "$GITHUB_OUTPUT"',
  "      - name: Trigger DocCraft",
  "        run: |",
  "          curl -s -X POST \\",
  '            "$DOCCRAFT_URL/api/webhooks/ci" \\',
  '            -H "Content-Type: application/json" \\',
  '            -H "x-doccraft-secret: $DOCCRAFT_SECRET" \\',
  "            -d '{",
  '              "repositoryUrl": "' + "$" + "{{ github.server_url }}/$" + "{{ github.repository }}" + '",',
  '              "branch": "' + "$" + "{{ github.ref_name }}" + '",',
  '              "changedFiles": ' + "$" + "{{ steps.changed.outputs.files }},",
  '              "docType": "release-notes"',
  "            }'",
  "        env:",
  "          DOCCRAFT_URL: $" + "{{ secrets.DOCCRAFT_URL }}",
  "          DOCCRAFT_SECRET: $" + "{{ secrets.DOCCRAFT_WEBHOOK_SECRET }}",
].join("\n");

export default function AutomationPanel({ onClose }: AutomationPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"setup" | "github" | "test">("setup");

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="flex items-center gap-1 px-2 py-1 text-[0.65rem] font-medium rounded-md
                 bg-surface-2 text-ink-3 hover:bg-surface-3 hover:text-ink-1 transition-colors"
    >
      {copiedField === field ? <Check size={11} className="text-accent-green" /> : <Copy size={11} />}
      {copiedField === field ? "Copied" : "Copy"}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center">
              <Webhook size={18} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-ink-0">CI/CD Automation</h2>
              <p className="text-[0.7rem] text-ink-3 mt-0.5">Auto-generate docs on every push</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-4 hover:bg-surface-2 hover:text-ink-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-2 px-6">
          {([
            { id: "setup", label: "Setup", icon: BookOpen },
            { id: "github", label: "GitHub Action", icon: Terminal },
            { id: "test", label: "Test", icon: AlertTriangle },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-3 hover:text-ink-1"
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {activeTab === "setup" && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-ink-0">How it works</h3>
                <div className="space-y-2 text-ink-2 text-[0.8rem] leading-relaxed">
                  <p>
                    DocCraft exposes a <code className="px-1.5 py-0.5 bg-surface-1 rounded text-[0.75rem] font-mono">/api/webhooks/ci</code> endpoint
                    that accepts POST requests from CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins, etc.).
                  </p>
                  <p>
                    When triggered, it reads the repository context, generates documentation using AI,
                    and optionally publishes the result back to GitHub as a commit or pull request.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-ink-0">Required Environment Variables</h3>
                <div className="bg-surface-1 rounded-xl border border-surface-2 divide-y divide-surface-2">
                  {[
                    { name: "DOCCRAFT_WEBHOOK_SECRET", desc: "HMAC secret to authenticate webhook requests", required: true },
                    { name: "OPENAI_API_KEY", desc: "OpenAI API key for document generation", required: true },
                    { name: "GITHUB_TOKEN", desc: "GitHub token for fetching repo content & auto-publish", required: false },
                  ].map((v) => (
                    <div key={v.name} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <code className="text-[0.75rem] font-mono font-semibold text-ink-0">{v.name}</code>
                        <p className="text-[0.7rem] text-ink-3 mt-0.5">{v.desc}</p>
                      </div>
                      <span className={`text-[0.65rem] font-semibold uppercase tracking-wider ${v.required ? "text-accent-red" : "text-ink-4"}`}>
                        {v.required ? "required" : "optional"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink-0">Quick cURL Test</h3>
                  <CopyButton text={CURL_EXAMPLE} field="curl" />
                </div>
                <pre className="bg-ink-0 text-green-300 rounded-xl p-4 text-[0.72rem] leading-relaxed overflow-x-auto font-mono">
                  {CURL_EXAMPLE}
                </pre>
              </div>
            </>
          )}

          {activeTab === "github" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink-0">GitHub Actions Workflow</h3>
                  <CopyButton text={GITHUB_ACTION_YAML} field="gh-action" />
                </div>
                <p className="text-[0.8rem] text-ink-2 leading-relaxed">
                  Save this as <code className="px-1.5 py-0.5 bg-surface-1 rounded text-[0.75rem] font-mono">.github/workflows/doccraft.yml</code> in
                  your repository. Add <code className="px-1.5 py-0.5 bg-surface-1 rounded text-[0.75rem] font-mono">DOCCRAFT_URL</code> and{" "}
                  <code className="px-1.5 py-0.5 bg-surface-1 rounded text-[0.75rem] font-mono">DOCCRAFT_WEBHOOK_SECRET</code> as GitHub repository
                  secrets.
                </p>
                <pre className="bg-ink-0 text-green-300 rounded-xl p-4 text-[0.72rem] leading-relaxed overflow-x-auto font-mono">
                  {GITHUB_ACTION_YAML}
                </pre>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-ink-0">Auto-Publish (Optional)</h3>
                <p className="text-[0.8rem] text-ink-2 leading-relaxed">
                  Add a <code className="px-1.5 py-0.5 bg-surface-1 rounded text-[0.75rem] font-mono">publish</code> object to the request body to
                  automatically commit or open a PR with the generated docs:
                </p>
                <pre className="bg-ink-0 text-green-300 rounded-xl p-4 text-[0.72rem] leading-relaxed overflow-x-auto font-mono">
{`"publish": {
  "enabled": true,
  "repoUrl": "https://github.com/owner/docs-repo",
  "filePath": "docs/release-notes.md",
  "action": "pr",
  "token": "ghp_..."
}`}
                </pre>
              </div>
            </>
          )}

          {activeTab === "test" && (
            <>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-[0.8rem] text-amber-800 leading-relaxed">
                  <p className="font-semibold">Before testing, make sure:</p>
                  <ul className="mt-1.5 ml-3 list-disc space-y-1">
                    <li><code className="text-[0.72rem] font-mono">DOCCRAFT_WEBHOOK_SECRET</code> is set in Vercel environment variables</li>
                    <li><code className="text-[0.72rem] font-mono">OPENAI_API_KEY</code> is set in Vercel</li>
                    <li>Your app is deployed and reachable at the Vercel URL</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-ink-0">Smoke-Test Checklist</h3>
                <div className="space-y-2">
                  {[
                    "Set DOCCRAFT_WEBHOOK_SECRET in Vercel → Settings → Environment Variables",
                    "Redeploy the app (or push a commit to trigger auto-deploy)",
                    "Run the cURL command from the Setup tab with your live URL",
                    "Verify the response contains a generated document",
                    "Optionally test auto-publish by adding a publish config",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 bg-surface-1 rounded-xl">
                      <span className="w-5 h-5 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-[0.65rem] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-[0.8rem] text-ink-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href="https://sulagnasasmal.github.io/doccraft-help-center/workflows.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-[0.8rem] font-medium text-brand-700 hover:bg-brand-100 transition-colors"
              >
                <ExternalLink size={14} />
                Full workflow guide in the Help Center
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
