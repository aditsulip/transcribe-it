import type { TranscriptSegment } from "@/lib/types/transcript";

function fmt(t: number) {
  const m = Math.floor(t / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function SegmentList({ segments }: { segments: TranscriptSegment[] }) {
  return (
    <div className="divide-y divide-white/10">
      {segments.map((segment, idx) => (
        <div key={`${segment.start}-${idx}`} className="py-4 first:pt-0">
          <p className="mb-2 text-[11px] font-normal text-zinc-500">
            {fmt(segment.start)} — {fmt(segment.end)}
          </p>
          <p className="text-[14px] font-normal leading-relaxed text-zinc-300">{segment.text}</p>
        </div>
      ))}
    </div>
  );
}
