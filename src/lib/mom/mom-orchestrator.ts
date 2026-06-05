import type { ProfessionalMom, TranscriptResult } from "@/lib/types/transcript";
import { heuristicMomProvider } from "@/lib/mom/providers/heuristic";
import { ollamaMomProvider } from "@/lib/mom/providers/ollama";
import { sanitizeTranscriptForMom } from "@/lib/mom/transcript-sanitize";
import { assessTranscriptQuality } from "@/lib/mom/transcript-quality";

const MOM_PROVIDER = process.env.MOM_PROVIDER ?? "ollama";

export async function generateMom(transcript: TranscriptResult): Promise<{
  mom: ProfessionalMom;
  source: "ollama" | "heuristic";
  mode: "full_mom" | "cautious_mom" | "retry_guidance";
  qualityScore: number;
  qualityReasons: string[];
}> {
  const sanitized = sanitizeTranscriptForMom(transcript);
  const quality = assessTranscriptQuality(sanitized);

  if (quality.mode === "retry_guidance") {
    return {
      mom: await heuristicMomProvider.generate({
        transcript: sanitized,
        mode: quality.mode,
        quality,
      }),
      source: "heuristic",
      mode: quality.mode,
      qualityScore: quality.score,
      qualityReasons: quality.reasons,
    };
  }

  if (MOM_PROVIDER === "heuristic") {
    return {
      mom: await heuristicMomProvider.generate({
        transcript: sanitized,
        mode: quality.mode,
        quality,
      }),
      source: "heuristic",
      mode: quality.mode,
      qualityScore: quality.score,
      qualityReasons: quality.reasons,
    };
  }

  try {
    const mom = await ollamaMomProvider.generate({
      transcript: sanitized,
      mode: quality.mode,
      quality,
    });
    return {
      mom,
      source: "ollama",
      mode: quality.mode,
      qualityScore: quality.score,
      qualityReasons: quality.reasons,
    };
  } catch {
    return {
      mom: await heuristicMomProvider.generate({
        transcript: sanitized,
        mode: quality.mode,
        quality,
      }),
      source: "heuristic",
      mode: quality.mode,
      qualityScore: quality.score,
      qualityReasons: quality.reasons,
    };
  }
}
