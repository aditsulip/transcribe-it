import type { TranscriptResult, TranscriptSegment } from "@/lib/types/transcript";

function normalizeForCompare(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function dedupeAdjacentSegments(segments: TranscriptSegment[]) {
  const output: TranscriptSegment[] = [];
  let prevNorm = "";

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;
    const norm = normalizeForCompare(text);
    if (norm && norm === prevNorm) continue;
    output.push({ ...segment, text });
    prevNorm = norm;
  }

  return output;
}

function collapseRepeatedWords(text: string) {
  return text
    .replace(/\b(\w+)(?:\s+\1){3,}\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeTranscriptForMom(transcript: TranscriptResult): TranscriptResult {
  const dedupedSegments = dedupeAdjacentSegments(transcript.segments);
  const rebuiltText = dedupedSegments.length
    ? dedupedSegments.map((s) => s.text).join(" ")
    : transcript.text;
  const cleanedText = collapseRepeatedWords(rebuiltText || transcript.text || "");

  return {
    ...transcript,
    text: cleanedText,
    segments: dedupedSegments,
  };
}

