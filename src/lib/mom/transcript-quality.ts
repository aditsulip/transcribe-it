import type { TranscriptResult } from "@/lib/types/transcript";

export type MomGenerationMode = "full_mom" | "cautious_mom" | "retry_guidance";

export type TranscriptQualityReport = {
  mode: MomGenerationMode;
  score: number;
  reasons: string[];
  metrics: {
    segmentCount: number;
    duplicateSegmentRatio: number;
    longRunRepeatCount: number;
    averageSegmentChars: number;
  };
};

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function countLongWordRuns(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  let runs = 0;
  let prev = "";
  let len = 0;
  for (const w of words) {
    const n = normalize(w);
    if (!n) continue;
    if (n === prev) {
      len += 1;
      if (len === 4) runs += 1;
    } else {
      prev = n;
      len = 1;
    }
  }
  return runs;
}

export function assessTranscriptQuality(transcript: TranscriptResult): TranscriptQualityReport {
  const segments = transcript.segments ?? [];
  const reasons: string[] = [];
  const segmentCount = segments.length;

  const seen = new Set<string>();
  let duplicateCount = 0;
  let totalChars = 0;

  for (const segment of segments) {
    const n = normalize(segment.text ?? "");
    if (!n) continue;
    totalChars += n.length;
    if (seen.has(n)) duplicateCount += 1;
    seen.add(n);
  }

  const duplicateSegmentRatio = segmentCount ? duplicateCount / segmentCount : 1;
  const averageSegmentChars = segmentCount ? totalChars / segmentCount : 0;
  const longRunRepeatCount = countLongWordRuns(transcript.text ?? "");

  let score = 100;
  score -= Math.round(duplicateSegmentRatio * 55);
  score -= Math.min(25, longRunRepeatCount * 4);
  if (averageSegmentChars < 14) score -= 12;
  if (segmentCount < 6) score -= 10;
  score = Math.max(0, Math.min(100, score));

  if (duplicateSegmentRatio >= 0.18) reasons.push("High duplicate segment ratio.");
  if (longRunRepeatCount >= 3) reasons.push("Detected repeated-word runs.");
  if (averageSegmentChars < 14) reasons.push("Segments are unusually short.");
  if (segmentCount < 6) reasons.push("Very low segment count.");

  let mode: MomGenerationMode = "full_mom";
  if (score < 40) mode = "retry_guidance";
  else if (score < 70) mode = "cautious_mom";

  return {
    mode,
    score,
    reasons,
    metrics: {
      segmentCount,
      duplicateSegmentRatio: Number(duplicateSegmentRatio.toFixed(3)),
      longRunRepeatCount,
      averageSegmentChars: Number(averageSegmentChars.toFixed(1)),
    },
  };
}

