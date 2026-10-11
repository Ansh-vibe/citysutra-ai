import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * Optional AI explanation layer (Amazon Bedrock).
 *
 * Core operation does NOT require Bedrock: when BEDROCK_ENABLED !== "true"
 * (or the call fails) we return a clearly-labeled DETERMINISTIC template
 * explanation built from the rule-based score. The deterministic engine is
 * always the source of truth; AI text is advisory only.
 */

export interface ExplainInput {
  title: string;
  ruleId: string;
  score: number | null;
  base: number | null;
  bonus: number | null;
  components: Array<{ dimension: string; label: string; value: number; contribution: number }>;
  interactions: Array<{ ruleId: string; label: string; bonus: number; triggered: boolean }>;
  missing: string[];
  owner: string;
  nextStep: string;
}

export interface ExplainResult {
  engine: "bedrock" | "deterministic";
  text: string;
  note?: string;
}

function deterministicExplain(i: ExplainInput): string {
  const parts: string[] = [];
  if (i.score === null) {
    parts.push(
      `This action could not be scored (${i.missing.length > 0 ? `missing data: ${i.missing.join(", ")}` : "no applicable dimension data"}), so it is listed for human review rather than ranked.`
    );
  } else {
    const top = [...i.components].sort((a, b) => b.contribution - a.contribution)[0];
    parts.push(
      `Prioritized at ${i.score.toFixed(1)}/100 (base ${i.base?.toFixed(1) ?? "—"} + bonus ${i.bonus?.toFixed(1) ?? "—"}).`
    );
    if (top) parts.push(`The strongest signal is the ${top.dimension} (${top.label}) dimension at ${top.value.toFixed(0)}/100, contributing ${top.contribution.toFixed(1)} points.`);
  }
  const triggered = i.interactions.filter((x) => x.triggered);
  if (triggered.length > 0) {
    parts.push(
      `Cross-track rule(s) fired: ${triggered
        .map((t) => `${t.ruleId} "${t.label}" (+${t.bonus})`)
        .join("; ")}. This is correlation from the available evidence, not proven causation.`
    );
  }
  if (i.missing.length > 0) {
    parts.push(`Data gaps: ${i.missing.join(", ")} — weights were renormalised over the available dimensions; nothing was assumed to be zero.`);
  }
  parts.push(`Recommended owner: ${i.owner}. Human next step: ${i.nextStep}`);
  parts.push(
    "This is an operational triage score — not an official AQI, government warning, or medical advice. A human must verify on the ground; nothing was dispatched or reported to any authority."
  );
  return parts.join(" ");
}

function buildPrompt(i: ExplainInput): string {
  return [
    "You are CitySutra AI, a civic environmental decision-support assistant.",
    "Explain the following prioritized action in 4-6 plain sentences for a municipal operator.",
    "Cite: the priority score, the strongest contributing dimension, any triggered cross-track interaction rule (as correlation, not causation), the missing data and how weights were renormalised, the recommended owner, and the concrete human verification step.",
    "Never make medical claims. Never claim any action was taken or any authority was notified.",
    "Action JSON:",
    JSON.stringify(i, null, 2),
  ].join("\n");
}

let bedrockClient: BedrockRuntimeClient | null = null;
function getBedrock(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "ap-south-1",
    });
  }
  return bedrockClient;
}

export async function explainAction(input: ExplainInput): Promise<ExplainResult> {
  const fallback: ExplainResult = { engine: "deterministic", text: deterministicExplain(input) };

  if (process.env.BEDROCK_ENABLED !== "true") return fallback;

  try {
    const modelId = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";
    const res = await getBedrock().send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 350,
          messages: [{ role: "user", content: buildPrompt(input) }],
        }),
      })
    );
    const raw = new TextDecoder().decode(res.body);
    const parsed = JSON.parse(raw) as { content?: Array<{ type: string; text?: string }> };
    const text = parsed.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) return fallback;
    return {
      engine: "bedrock",
      text,
      note: "AI explanation (advisory). The rule-based score remains the source of truth.",
    };
  } catch (e) {
    console.error("bedrock explain failed, using deterministic fallback:", e instanceof Error ? e.message : e);
    return { ...fallback, note: "Bedrock call failed; deterministic template used instead." };
  }
}
