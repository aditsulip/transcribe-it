import { sanitizeTranscriptForMom } from "@/lib/mom/transcript-sanitize";
import { assessTranscriptQuality } from "@/lib/mom/transcript-quality";
import { runAiTranscriptCorrection } from "@/lib/transcript-postprocess/ai-correction";
import type {
  TranscriptPostProcessMeta,
  TranscriptResult,
} from "@/lib/types/transcript";

const DEFAULT_THRESHOLD = Number(process.env.POSTPROCESS_QUALITY_THRESHOLD ?? "72");
const POSTPROCESS_AI_ENABLED = (process.env.POSTPROCESS_AI_ENABLED ?? "true").toLowerCase() === "true";
const POSTPROCESS_AI_THRESHOLD = Number(process.env.POSTPROCESS_AI_THRESHOLD ?? "65");
const POSTPROCESS_AI_MAX_CHARS = Number(process.env.POSTPROCESS_AI_MAX_CHARS ?? "20000");

function cloneTranscript(transcript: TranscriptResult): TranscriptResult {
  return {
    ...transcript,
    segments: transcript.segments.map((segment) => ({ ...segment })),
  };
}

function applySurfaceCorrections(transcript: TranscriptResult): TranscriptResult {
  // Keep this conservative: no semantic rewriting, only structural cleanup.
  return sanitizeTranscriptForMom(transcript);
}

export async function runTranscriptPostProcess(transcript: TranscriptResult): Promise<{
  transcriptRaw: TranscriptResult;
  transcriptDisplay: TranscriptResult;
  transcriptCleaned?: TranscriptResult;
  postProcess: TranscriptPostProcessMeta;
}> {
  const transcriptRaw = cloneTranscript(transcript);
  const quality = assessTranscriptQuality(transcriptRaw);
  const shouldProcess = quality.score < DEFAULT_THRESHOLD;

  if (!shouldProcess) {
    return {
      transcriptRaw,
      transcriptDisplay: transcriptRaw,
      postProcess: {
        applied: false,
        qualityScore: quality.score,
        reasons: quality.reasons,
        method: "raw",
        provider: "none",
      },
    };
  }

  const rulesCleaned = applySurfaceCorrections(transcriptRaw);
  const shouldUseAi =
    POSTPROCESS_AI_ENABLED &&
    quality.score < POSTPROCESS_AI_THRESHOLD &&
    transcriptRaw.text.length <= POSTPROCESS_AI_MAX_CHARS;

  if (shouldUseAi) {
    const startedAt = Date.now();
    try {
      const ai = await runAiTranscriptCorrection(rulesCleaned);
      return {
        transcriptRaw,
        transcriptDisplay: ai.corrected,
        transcriptCleaned: ai.corrected,
        postProcess: {
          applied: true,
          qualityScore: quality.score,
          reasons: quality.reasons,
          method: "ai",
          provider: ai.provider,
          latencyMs: Date.now() - startedAt,
          notes: ai.notes,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI correction failed";
      return {
        transcriptRaw,
        transcriptDisplay: rulesCleaned,
        transcriptCleaned: rulesCleaned,
        postProcess: {
          applied: true,
          qualityScore: quality.score,
          reasons: quality.reasons,
          method: "rules",
          provider: "none",
          notes: [message],
        },
      };
    }
  }

  return {
    transcriptRaw,
    transcriptDisplay: rulesCleaned,
    transcriptCleaned: rulesCleaned,
    postProcess: {
      applied: true,
      qualityScore: quality.score,
      reasons: quality.reasons,
      method: "rules",
      provider: "none",
    },
  };
}

