import type { TranscriptResult } from "@/lib/types/transcript";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://192.168.0.251:11434";
const POSTPROCESS_AI_MODEL = process.env.POSTPROCESS_AI_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen3:4b";
const POSTPROCESS_AI_TIMEOUT_MS = Number(process.env.POSTPROCESS_AI_TIMEOUT_MS ?? "45000");

type AiCorrectionOutput = {
  segments: string[];
  notes?: string[];
};

function isAiCorrectionOutput(value: unknown): value is AiCorrectionOutput {
  if (!value || typeof value !== "object") return false;
  const casted = value as { segments?: unknown; notes?: unknown };
  if (!Array.isArray(casted.segments)) return false;
  if (!casted.segments.every((s) => typeof s === "string")) return false;
  if (casted.notes !== undefined && (!Array.isArray(casted.notes) || !casted.notes.every((n) => typeof n === "string"))) {
    return false;
  }
  return true;
}

function buildCorrectionPrompt(transcript: TranscriptResult) {
  const segmentPayload = transcript.segments.map((s, index) => `${index + 1}. ${s.text}`).join("\n");
  return [
    "You are a transcript post-processor.",
    "Task: perform surface-only correction on each segment text.",
    "Rules:",
    "- Do not summarize.",
    "- Do not shorten content.",
    "- Do not change meaning or speaker intent.",
    "- Fix spelling, punctuation, grammar, and repeated-word artifacts only.",
    "- Preserve uncertain names/technical terms as-is instead of guessing.",
    "- Return exactly the same number of segments in the same order.",
    'Return valid JSON only in shape: {"segments":["..."],"notes":["..."]}.',
    "",
    "Segments:",
    segmentPayload,
  ].join("\n");
}

export async function runAiTranscriptCorrection(transcript: TranscriptResult): Promise<{
  corrected: TranscriptResult;
  provider: "ollama";
  notes: string[];
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POSTPROCESS_AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: POSTPROCESS_AI_MODEL,
        format: "json",
        stream: false,
        options: { temperature: 0.1 },
        messages: [
          {
            role: "system",
            content:
              "You correct transcription surface errors and must return strict JSON with unchanged segment count.",
          },
          {
            role: "user",
            content: buildCorrectionPrompt(transcript),
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`AI correction failed: ${response.status}`);
    }

    const payload = (await response.json()) as { message?: { content?: string } };
    const content = payload?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as unknown;
    if (!isAiCorrectionOutput(parsed)) {
      throw new Error("AI correction schema invalid");
    }
    if (parsed.segments.length !== transcript.segments.length) {
      throw new Error("AI correction segment count mismatch");
    }

    const correctedSegments = transcript.segments.map((segment, idx) => ({
      ...segment,
      text: parsed.segments[idx].trim() || segment.text,
    }));

    return {
      corrected: {
        ...transcript,
        segments: correctedSegments,
        text: correctedSegments.map((s) => s.text).join(" ").trim(),
      },
      provider: "ollama",
      notes: parsed.notes ?? [],
    };
  } finally {
    clearTimeout(timer);
  }
}

