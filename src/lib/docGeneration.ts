import OpenAI from "openai";

export interface GenerationConfig {
  docType: string;
  audience: string;
  tone: string;
  customInstructions?: string;
}

export interface GenerationAnswer {
  question: string;
  answer: string;
  skipped?: boolean;
}

const TEMPLATES: Record<string, string> = {
  "user-guide": `Structure:
1. Overview / Introduction
2. Prerequisites
3. Getting Started
4. Core Features (step-by-step)
5. Advanced Usage
6. Troubleshooting / FAQ
7. Glossary (if needed)`,
  "quick-start": `Structure:
1. What You'll Build / Achieve
2. Before You Begin (prerequisites, 2-3 bullet max)
3. Steps (numbered, concise, action-oriented)
4. Verify It Works
5. Next Steps`,
  "api-reference": `Structure:
1. Overview
2. Authentication
3. Base URL & Endpoints
4. Request/Response Format
5. Endpoints (grouped by resource)
6. Error Codes
7. Rate Limits
8. Examples`,
  "troubleshooting": `Structure:
1. Common Issues (symptom -> cause -> fix)
2. Error Messages Reference
3. Diagnostic Steps
4. Escalation / Contact Support`,
  "release-notes": `Structure:
1. Version & Date
2. Highlights
3. New Features
4. Improvements
5. Bug Fixes
6. Known Issues
7. Migration Notes (if applicable)`,
};

const AUDIENCE_INSTRUCTIONS: Record<string, string> = {
  "non-technical":
    "Write for end-users with no technical background. Avoid jargon. Use simple language, analogies, and screenshots or visual descriptions. Every step should be explicit.",
  technical:
    "Write for developers or technical staff. You can use technical terminology, code snippets, and assume familiarity with common tools.",
  mixed:
    "Write for a mixed audience. Lead with simple explanations, then provide technical details in optional sections or notes.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal:
    "Use formal, professional language. Third person. No contractions. Suitable for enterprise documentation.",
  conversational:
    "Use friendly, approachable language. Second person (you/your). Contractions are fine. Guide the reader like a helpful colleague.",
  instructional:
    "Use direct, imperative language. Focus on clear commands and actions. Minimal fluff. Every sentence should drive the user forward.",
};

export function buildGenerateMessages(
  content: string,
  config: GenerationConfig,
  answers: GenerationAnswer[] = [],
  contextText?: string
) {
  const template = TEMPLATES[config.docType] || TEMPLATES["user-guide"];
  const audienceNote = AUDIENCE_INSTRUCTIONS[config.audience] || "";
  const toneNote = TONE_INSTRUCTIONS[config.tone] || "";

  const answeredContext = answers
    .filter((answer) => !answer.skipped && answer.answer.trim())
    .map((answer) => `Q: ${answer.question}\nA: ${answer.answer}`)
    .join("\n\n");

  const skippedContext = answers
    .filter((answer) => answer.skipped)
    .map((answer) => `- ${answer.question} [SKIPPED - make a reasonable assumption and mark it with ⚠️]`)
    .join("\n");

  const systemPrompt = `You are a senior technical writer creating production-ready documentation.

DOCUMENT TYPE: ${config.docType}
TEMPLATE STRUCTURE:
${template}

AUDIENCE: ${config.audience}
${audienceNote}

TONE: ${config.tone}
${toneNote}

RULES:
1. Follow the template structure exactly
2. Write from the user's perspective
3. Use consistent formatting with headings, numbered steps, and callouts
4. Mark any assumed information with ⚠️ so reviewers can verify it
5. Include practical examples where helpful
6. Keep paragraphs short (3-4 sentences max)
7. For steps, use the format: "Step N: [Action]" with a brief explanation below
8. Add a "Note:" or "Tip:" callout where useful
9. Output clean Markdown only

${config.customInstructions ? `ADDITIONAL INSTRUCTIONS: ${config.customInstructions}` : ""}`;

  const userPrompt = [
    contextText?.trim()
      ? `CONTEXT DOCUMENTS (existing docs, style guide, terminology - write consistently with these):\n${contextText.slice(0, 3000)}\n\n---`
      : null,
    `SOURCE MATERIAL:\n${content.slice(0, 10000)}`,
    answeredContext ? `CLARIFICATIONS FROM SME:\n${answeredContext}` : null,
    skippedContext ? `UNANSWERED QUESTIONS (make reasonable assumptions):\n${skippedContext}` : null,
    "Please generate the complete documentation now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    model: "gpt-4o-mini",
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
    max_tokens: 3000,
    temperature: 0.4,
  };
}

export async function generateDocument(
  openai: OpenAI,
  content: string,
  config: GenerationConfig,
  answers: GenerationAnswer[] = [],
  contextText?: string
) {
  const request = buildGenerateMessages(content, config, answers, contextText);
  const response = await openai.chat.completions.create(request);
  return response.choices[0]?.message?.content || "# Error\nFailed to generate documentation.";
}