import type { TranscriptSegment } from "@/lib/types/transcript";

type ChunkTranscript = {
  chunkIndex: number;
  chunkStartSec: number;
  segments: TranscriptSegment[];
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(a: string, b: string) {
  const aTokens = new Set(normalize(a).split(" ").filter(Boolean));
  const bTokens = new Set(normalize(b).split(" ").filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

export function stitchChunkTranscripts(chunkTranscripts: ChunkTranscript[]) {
  const sorted = [...chunkTranscripts].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const unified: TranscriptSegment[] = [];
  const recent = new Set<string>();

  for (const chunk of sorted) {
    for (const seg of chunk.segments) {
      const shifted: TranscriptSegment = {
        start: seg.start + chunk.chunkStartSec,
        end: seg.end + chunk.chunkStartSec,
        text: seg.text,
        chunkId: chunk.chunkIndex,
      };

      const key = `${Math.round(shifted.start)}-${normalize(shifted.text).slice(0, 80)}`;
      if (!shifted.text.trim()) continue;
      const prev = unified[unified.length - 1];
      const isNearDuplicate =
        prev &&
        Math.abs(prev.start - shifted.start) <= 20 &&
        tokenSimilarity(prev.text, shifted.text) >= 0.82;

      if (!recent.has(key) && !isNearDuplicate) {
        unified.push(shifted);
        recent.add(key);
      }

      if (recent.size > 2000) {
        const first = recent.values().next().value;
        if (first) recent.delete(first);
      }
    }
  }

  unified.sort((a, b) => a.start - b.start);
  const text = unified.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
  return { text, segments: unified };
}
